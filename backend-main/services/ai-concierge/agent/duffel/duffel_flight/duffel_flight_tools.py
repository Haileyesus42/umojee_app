from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from langchain_core.tools import tool

from agent.amadeus.amadeus_flight.amadeus_flight_tools import (
    AIRLINE_AIRPLANE_IMAGES,
    _parse_duration,
    _sanitize_for_tool_json,
    amadeus_save_booked_flight_to_journey,
    amadeus_save_flights_to_journey,
    amadeus_save_hotels_to_journey,
)
from agent.duffel.duffel_make_request import _make_duffel_request
from agent.response_cache import cache_response, get_cached_response


def _normalize_gender(value: Any) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip().lower()
    mapping = {
        "male": "m",
        "m": "m",
        "female": "f",
        "f": "f",
        "other": "x",
        "x": "x",
    }
    return mapping.get(raw)


def _normalize_phone_number(value: Any) -> Optional[str]:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        country = str(value.get("countryCallingCode") or value.get("country_calling_code") or "").strip()
        number = str(value.get("number") or "").strip()
        if country and number:
            return f"+{country}{number}"
    return None


def _normalize_passenger(passenger: Dict[str, Any]) -> Dict[str, Any]:
    name = passenger.get("name") if isinstance(passenger.get("name"), dict) else {}
    contact = passenger.get("contact") if isinstance(passenger.get("contact"), dict) else {}
    phones = contact.get("phones") if isinstance(contact.get("phones"), list) else []

    normalized: Dict[str, Any] = {}
    for key in ("id", "title"):
        if passenger.get(key):
            normalized[key] = str(passenger[key]).strip().lower() if key == "title" else passenger[key]

    given_name = (
        passenger.get("given_name")
        or passenger.get("givenName")
        or name.get("firstName")
        or name.get("first_name")
        or passenger.get("first_name")
        or passenger.get("firstName")
    )
    family_name = (
        passenger.get("family_name")
        or passenger.get("familyName")
        or name.get("lastName")
        or name.get("last_name")
        or passenger.get("last_name")
        or passenger.get("lastName")
    )
    born_on = passenger.get("born_on") or passenger.get("dateOfBirth") or passenger.get("date_of_birth")
    email = passenger.get("email") or contact.get("emailAddress") or contact.get("email_address")
    phone_number = passenger.get("phone_number")
    if not phone_number and phones:
        phone_number = _normalize_phone_number(phones[0])

    gender = _normalize_gender(passenger.get("gender"))

    if given_name:
        normalized["given_name"] = str(given_name).strip()
    if family_name:
        normalized["family_name"] = str(family_name).strip()
    if born_on:
        normalized["born_on"] = str(born_on).strip()
    if email:
        normalized["email"] = str(email).strip()
    if phone_number:
        normalized["phone_number"] = str(phone_number).strip()
    if gender:
        normalized["gender"] = gender

    return normalized


def _normalize_duffel_order_payload(
    order_payload: Dict[str, Any],
    *,
    user_id: str,
    conversation_id: str,
) -> Dict[str, Any]:
    data = dict(order_payload.get("data", order_payload))

    selected_offers = data.get("selected_offers")
    if not selected_offers:
        offer_id = (
            data.get("offer_id")
            or data.get("selected_offer_id")
            or data.get("id")
        )
        if not offer_id:
            flight_offers = data.get("flightOffers")
            if isinstance(flight_offers, list) and flight_offers and isinstance(flight_offers[0], dict):
                offer_id = _coerce_offer_id(flight_offers[0], None)
        if offer_id:
            selected_offers = [offer_id]

    if isinstance(selected_offers, str):
        selected_offers = [selected_offers]
    if isinstance(selected_offers, list) and selected_offers:
        data["selected_offers"] = [str(selected_offers[0])]

    passengers = data.get("passengers")
    if not passengers:
        passengers = data.get("travelers")
    if isinstance(passengers, list):
        normalized_passengers = []
        for passenger in passengers:
            if isinstance(passenger, dict):
                normalized = _normalize_passenger(passenger)
                if normalized:
                    normalized_passengers.append(normalized)
        if normalized_passengers:
            data["passengers"] = normalized_passengers

    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    metadata.setdefault("user_id", user_id)
    metadata.setdefault("conversation_id", conversation_id)
    metadata.setdefault("provider", "duffel")
    data["metadata"] = metadata

    data["type"] = "hold"
    data.pop("payments", None)
    data.pop("services", None)
    data.pop("flightOffers", None)
    data.pop("travelers", None)

    return {"data": data}


def _duffel_with_retries(
    method: str,
    endpoint: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    retries: int = 3,
) -> Dict[str, Any]:
    last_error: Optional[str] = None
    for _ in range(retries):
        try:
            return _make_duffel_request(method, endpoint, params=params, json=json_body)
        except requests.exceptions.RequestException as exc:
            last_error = str(exc)
        except Exception as exc:
            last_error = str(exc)
    return {"error": "Duffel request failed", "details": last_error or "Unknown error"}


def _build_offer_request_payload(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    adults: int,
    return_date: Optional[str] = None,
) -> Dict[str, Any]:
    slices = [
        {
            "origin": origin_location_code.upper(),
            "destination": destination_location_code.upper(),
            "departure_date": departure_date,
        }
    ]
    if return_date:
        slices.append(
            {
                "origin": destination_location_code.upper(),
                "destination": origin_location_code.upper(),
                "departure_date": return_date,
            }
        )

    return {
        "data": {
            "slices": slices,
            "passengers": [{"type": "adult"} for _ in range(max(1, adults or 1))],
        }
    }


def _coerce_offer_id(
    flight_offer: Optional[Dict[str, Any]] = None,
    request_body: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    if isinstance(flight_offer, dict):
        metadata = flight_offer.get("metadata") if isinstance(flight_offer.get("metadata"), dict) else {}
        candidates = [
            flight_offer.get("provider_offer_id"),
            flight_offer.get("offer_id"),
            metadata.get("offer_id"),
            flight_offer.get("id"),
            (flight_offer.get("raw_offer") or {}).get("id") if isinstance(flight_offer.get("raw_offer"), dict) else None,
        ]
        for candidate in candidates:
            if not candidate:
                continue
            candidate_str = str(candidate)
            if candidate_str.startswith("flight_off_"):
                return candidate_str.replace("flight_", "", 1)
            if candidate_str.startswith("off_"):
                return candidate_str

    if not isinstance(request_body, dict):
        return None

    data = request_body.get("data", request_body)
    if not isinstance(data, dict):
        return None

    offer_id = data.get("offer_id") or data.get("selected_offer_id") or data.get("id")
    if offer_id:
        return str(offer_id)

    selected_offers = data.get("selected_offers")
    if isinstance(selected_offers, list) and selected_offers:
        return _coerce_offer_id({"provider_offer_id": selected_offers[0]}, None)

    flight_offers = data.get("flightOffers")
    if isinstance(flight_offers, list) and flight_offers and isinstance(flight_offers[0], dict):
        return _coerce_offer_id(flight_offers[0], None)

    return None


def _extract_segment_summary(offer: Dict[str, Any]) -> Dict[str, Any]:
    slices = offer.get("slices", [])
    if not slices:
        return {}

    first_slice = slices[0]
    segments = first_slice.get("segments", [])
    if not segments:
        return {}

    first_segment = segments[0]
    last_segment = segments[-1]
    carrier = first_segment.get("operating_carrier") or first_segment.get("marketing_carrier") or {}
    carrier_iata = carrier.get("iata_code", "")
    airline_name = carrier.get("name") or carrier_iata or "Airline"
    flight_no = first_segment.get("marketing_carrier_flight_number") or first_segment.get("operating_carrier_flight_number") or ""

    departure_at = first_segment.get("departing_at", "")
    arrival_at = last_segment.get("arriving_at", "")
    duration = first_slice.get("duration", "")
    if not duration and departure_at and arrival_at:
        try:
            start = datetime.fromisoformat(departure_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(arrival_at.replace("Z", "+00:00"))
            total_minutes = int((end - start).total_seconds() // 60)
            hours, minutes = divmod(max(total_minutes, 0), 60)
            duration = f"PT{hours}H{minutes}M"
        except ValueError:
            duration = ""

    origin = first_segment.get("origin", {})
    destination = last_segment.get("destination", {})
    return {
        "airline_name": airline_name,
        "carrier_iata": carrier_iata,
        "flight_number": f"{carrier_iata}{flight_no}".strip(),
        "origin_iata": origin.get("iata_code", ""),
        "destination_iata": destination.get("iata_code", ""),
        "departure_at": departure_at,
        "arrival_at": arrival_at,
        "duration": _parse_duration(duration),
        "stops": max(len(segments) - 1, 0),
    }


def _enrich_duffel_offers(offers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for idx, offer in enumerate(offers[:10]):
        summary = _extract_segment_summary(offer)
        if not summary:
            continue
        image_url = AIRLINE_AIRPLANE_IMAGES.get(summary["carrier_iata"], {}).get("airline_image", "")
        items.append(
            {
                "id": offer.get("id") or f"duffel_offer_{idx}",
                "provider_offer_id": offer.get("id"),
                "type": "destination",
                "name": f"{summary['airline_name']} {summary['flight_number']} - {summary['origin_iata']} -> {summary['destination_iata']}",
                "imageUrl": image_url,
                "price": float(offer.get("total_amount") or 0),
                "currency": offer.get("total_currency", "USD"),
                "matchConfidence": max(70, 95 - (idx * 5)),
                "pros": ["Live Duffel offer", summary["airline_name"]],
                "cons": [] if summary["stops"] == 0 else [f"{summary['stops']} stop(s)"],
                "metadata": {
                    "departure": summary["departure_at"],
                    "arrival": summary["arrival_at"],
                    "duration": summary["duration"],
                    "airline": summary["airline_name"],
                    "flightNumber": summary["flight_number"],
                    "flightNo": summary["flight_number"],
                    "flight_no": summary["flight_number"],
                    "stops": summary["stops"],
                    "origin": summary["origin_iata"],
                    "destination": summary["destination_iata"],
                    "provider": "duffel",
                    "offer_id": offer.get("id"),
                    "offer_expires_at": offer.get("expires_at"),
                },
            }
        )
    return items


@tool
def duffel_search_flight_offers(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    adults: int = 1,
    currency_code: str = "USD",
    return_date: Optional[str] = None,
    max_results: int = 5,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Search flight offers through Duffel and normalize them to the app's flight list shape."""
    cache_key = f"search_flights_{destination_location_code.upper()}_duffel"
    cache_params = {
        "origin": origin_location_code.upper(),
        "destination": destination_location_code.upper(),
        "date": departure_date,
        "adults": adults,
        "return_date": return_date,
        "currency": currency_code,
    }
    if user_id:
        cached = get_cached_response(user_id, cache_key, cache_params)
        if cached:
            if isinstance(cached, list):
                cached = {"flights": cached}
            return {**cached, "_from_cache": True}

    raw_result = _duffel_with_retries(
        "POST",
        "/air/offer_requests",
        params={"return_offers": "true"},
        json_body=_build_offer_request_payload(
            origin_location_code=origin_location_code,
            destination_location_code=destination_location_code,
            departure_date=departure_date,
            adults=adults,
            return_date=return_date,
        ),
    )
    raw_result = _sanitize_for_tool_json(raw_result)
    if raw_result.get("error"):
        return raw_result

    data = raw_result.get("data", {})
    offers = data.get("offers", [])[: max(1, max_results)]
    final_result = {
        "provider": "duffel",
        "offer_request_id": data.get("id"),
        "total_offers_found": len(data.get("offers", [])),
        "offers": [
            {
                "id": offer.get("id"),
                "total_amount": offer.get("total_amount"),
                "total_currency": offer.get("total_currency"),
                "expires_at": offer.get("expires_at"),
            }
            for offer in offers
        ],
        "flights": _enrich_duffel_offers(offers),
    }
    if user_id and final_result["flights"]:
        cache_response(user_id, cache_key, final_result, cache_params, ttl=3600)
    return final_result


@tool
def duffel_price_flight_offer(
    flight_offer: Optional[Dict[str, Any]] = None,
    travelers: Optional[List[Dict[str, Any]]] = None,
    request_body: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Refresh a Duffel offer by retrieving the latest single-offer payload."""
    offer_id = _coerce_offer_id(flight_offer=flight_offer, request_body=request_body)
    if not offer_id:
        return {"error": "offer_id is required to price a Duffel offer"}

    result = _duffel_with_retries(
        "GET",
        f"/air/offers/{offer_id}",
        params={"return_available_services": "true"},
    )
    if result.get("error"):
        return result
    if travelers:
        result["travelers"] = travelers
    result["provider"] = "duffel"
    return result


@tool
def duffel_create_flight_order(
    order_payload: Dict[str, Any],
    user_id: str,
    conversation_id: str,
) -> Dict[str, Any]:
    """Create a Duffel flight order, defaulting to a hold booking when possible."""
    if not user_id:
        return {"error": "user_id is required to create a Duffel flight order"}
    if not conversation_id:
        return {"error": "conversation_id is required to create a Duffel flight order"}

    normalized_payload = _normalize_duffel_order_payload(
        order_payload,
        user_id=user_id,
        conversation_id=conversation_id,
    )
    data = normalized_payload["data"]

    if not data.get("selected_offers"):
        return {"error": "selected_offers is required to create a Duffel order"}
    if not data.get("passengers"):
        return {
            "error": "passengers are required to create a Duffel order",
            "details": "Duffel hold orders require expanded passenger details in data.passengers.",
        }

    result = _duffel_with_retries("POST", "/air/orders", json_body=normalized_payload)
    if result.get("error"):
        return {**result, "normalized_payload": normalized_payload}

    return {
        "order": result,
        "provider": "duffel",
        "submitted_payload": normalized_payload,
        "save_result": {
            "status": "skipped",
            "reason": "No Duffel-specific backend booking persistence endpoint is configured.",
        },
    }


@tool
def duffel_get_flight_order(order_id: str) -> Dict[str, Any]:
    """Retrieve an existing Duffel flight order by ID."""
    result = _duffel_with_retries("GET", f"/air/orders/{order_id}")
    if result.get("error"):
        return result
    result["provider"] = "duffel"
    return result


@tool
def duffel_get_on_demand_flight_status(
    carrier_code: str,
    flight_number: str,
    scheduled_departure_date: str,
    optional_params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Retrieve Duffel booked-flight status by order id.

    Duffel's workflow here is order-centric. For booked-flight checks, pass the
    Duffel order id in `optional_params.order_id`, or directly as
    `flight_number`/`carrier_code` when it starts with `ord_`.
    """
    params = optional_params or {}
    order_id = (
        params.get("order_id")
        or (flight_number if isinstance(flight_number, str) and flight_number.startswith("ord_") else None)
        or (carrier_code if isinstance(carrier_code, str) and carrier_code.startswith("ord_") else None)
    )

    if not order_id:
        return {
            "error": "Duffel booked-flight checks require an order_id.",
            "provider": "duffel",
            "details": {
                "carrier_code": carrier_code,
                "flight_number": flight_number,
                "scheduled_departure_date": scheduled_departure_date,
                "optional_params": params,
            },
        }

    result = duffel_get_flight_order.invoke({"order_id": order_id})
    if isinstance(result, dict):
        result["provider"] = "duffel"
    return result


@tool
def duffel_save_booked_flight_to_journey(
    journey_id: str,
    booking_reference: str,
    amadeus_order_id: str,
    flight_number: str,
    airline: str,
    from_code: str,
    to_code: str,
    departure: str,
    arrival: Optional[str] = None,
    price: Optional[float] = None,
    currency: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist a Duffel booking into the shared journey model."""
    return amadeus_save_booked_flight_to_journey.invoke(
        {
            "journey_id": journey_id,
            "booking_reference": booking_reference,
            "amadeus_order_id": amadeus_order_id,
            "flight_number": flight_number,
            "airline": airline,
            "from_code": from_code,
            "to_code": to_code,
            "departure": departure,
            "arrival": arrival,
            "price": price,
            "currency": currency,
            "provider": "duffel",
            "provider_order_id": amadeus_order_id,
        }
    )


@tool
def duffel_save_flights_to_journey(journey_id: str, flights: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Persist shortlisted Duffel flights into the journey state."""
    return amadeus_save_flights_to_journey.invoke({"journey_id": journey_id, "flights": flights})


@tool
def duffel_save_hotels_to_journey(journey_id: str, hotels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compatibility wrapper for the journey save interface."""
    return amadeus_save_hotels_to_journey.invoke({"journey_id": journey_id, "hotels": hotels})


@tool
def flight_get_flight_image_url(carrier_code: str) -> Dict[str, Any]:
    """Look up a static airline image by carrier code."""
    if not carrier_code:
        return {"error": "Carrier code is required to fetch an image."}

    code = carrier_code.upper()
    airline_data = AIRLINE_AIRPLANE_IMAGES.get(code)
    if not airline_data:
        return {"error": "Airline image not found", "details": f"No image mapped for '{code}'."}

    return {"iata": code, "image_url": airline_data.get("airline_image"), "airline": dict(airline_data)}
