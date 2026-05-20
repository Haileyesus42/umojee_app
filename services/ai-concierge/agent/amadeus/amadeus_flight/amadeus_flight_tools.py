import os
import time
import json
from typing import Any, Dict, Optional, List

import requests
from langchain_core.tools import tool
from agent.amadeus.amadeus_make_request import _make_amadeus_request
from agent.amadeus.helper.airline_images import AIRLINE_AIRPLANE_IMAGES

def _amadeus_with_retries(
    method: str,
    endpoint: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    retries: int = 3,
    backoff: float = 1.0,
) -> Dict[str, Any]:
    last_error: Optional[str] = None
    for attempt in range(retries):
        try:
            return _make_amadeus_request(method, endpoint, params=params, json=json_body)
        except requests.exceptions.RequestException as exc:
            last_error = str(exc)
            if attempt < retries - 1:
                time.sleep(backoff * (2**attempt))
                continue
            return {"error": "Request to Amadeus failed", "details": last_error}
        except Exception as exc:
            last_error = str(exc)
            if attempt < retries - 1:
                time.sleep(backoff * (2**attempt))
                continue
            return {"error": "Unexpected error calling Amadeus", "details": last_error}
    return {"error": "Unexpected error calling Amadeus", "details": last_error}

def _post_with_retries(
    url: str,
    payload: Dict[str, Any],
    retries: int = 3,
    backoff: float = 1.0,
) -> Dict[str, Any]:
    last_error: Optional[str] = None
    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            last_error = str(exc)
            if attempt < retries - 1:
                time.sleep(backoff * (2**attempt))
                continue
            return {"error": "Failed to persist booking to backend", "details": last_error}


def _normalize_pricing_request_body(request_body: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Accept a few common LLM-produced pricing shapes and coerce them into the
    Amadeus-required wrapper:
      {"data": {"type": "flight-offers-pricing", "flightOffers": [...], "travelers": [...]}}
    """
    if not isinstance(request_body, dict):
        return {}

    normalized = dict(request_body)
    data = normalized.get("data")

    if not isinstance(data, dict):
        # Allow callers to pass the inner `data` object or even just a single offer.
        if "flightOffers" in normalized or "travelers" in normalized:
            data = dict(normalized)
        else:
            data = {"flightOffers": [normalized]}
        normalized = {"data": data}

    data = dict(data)
    flight_offers = data.get("flightOffers")
    travelers = data.get("travelers")

    if isinstance(flight_offers, dict):
        flight_offers = [flight_offers]
    elif not isinstance(flight_offers, list):
        flight_offers = []

    cleaned_flight_offers: List[Dict[str, Any]] = []
    extracted_travelers: Optional[List[Dict[str, Any]]] = None
    for item in flight_offers:
        if not isinstance(item, dict):
            continue
        # Recover from malformed shapes like:
        # flightOffers: [{...offer...}, {"travelers": [...]}]
        if "travelers" in item and len(item.keys()) == 1 and extracted_travelers is None:
            maybe_travelers = item.get("travelers")
            if isinstance(maybe_travelers, list):
                extracted_travelers = maybe_travelers
            continue
        cleaned_flight_offers.append(item)

    if extracted_travelers and not travelers:
        travelers = extracted_travelers

    if travelers is not None and not isinstance(travelers, list):
        travelers = None

    data["type"] = "flight-offers-pricing"
    data["flightOffers"] = cleaned_flight_offers
    if travelers:
        data["travelers"] = travelers
    else:
        data.pop("travelers", None)

    normalized["data"] = data
    return normalized


def _parse_duration(iso_duration: str) -> str:
    if not iso_duration:
        return ""
    d = iso_duration.replace("PT", "")
    hours, minutes = "", ""
    if "H" in d:
        parts = d.split("H")
        hours = parts[0] + "h"
        d = parts[1] if len(parts) > 1 else ""
    if "M" in d:
        minutes = d.replace("M", "") + "m"
    return f"{hours} {minutes}".strip()


def _sanitize_for_tool_json(value: Any) -> Any:
    """Recursively strip control characters that can break tool-call JSON."""
    if isinstance(value, str):
        cleaned = value.replace("\r", " ").replace("\n", " ").replace("\t", " ")
        return "".join(ch for ch in cleaned if ord(ch) >= 32 or ch in (" ",))
    if isinstance(value, list):
        return [_sanitize_for_tool_json(item) for item in value]
    if isinstance(value, dict):
        return {key: _sanitize_for_tool_json(item) for key, item in value.items()}
    return value


def _build_flight_pros_cons(segment: Dict[str, Any], duration_str: str) -> tuple:
    pros: List[str] = []
    cons: List[str] = []
    num_stops = segment.get("numberOfStops", 0)
    if num_stops == 0:
        pros.append("Direct flight")
    else:
        cons.append(f"{num_stops} stop{'s' if num_stops > 1 else ''}")
    dep_time = segment.get("departure", {}).get("at", "")
    if dep_time:
        hour_str = dep_time.split("T")[-1][:2] if "T" in dep_time else ""
        try:
            hour = int(hour_str)
            if 6 <= hour < 12:
                pros.append("Morning departure")
            elif 12 <= hour < 17:
                pros.append("Afternoon departure")
            elif 17 <= hour < 21:
                pros.append("Evening departure")
            else:
                cons.append("Late night / early morning departure")
        except (ValueError, TypeError):
            pass
    if duration_str:
        try:
            h_part = int(duration_str.split("h")[0]) if "h" in duration_str else 0
            if h_part <= 4:
                pros.append("Short flight time")
            elif h_part >= 8:
                cons.append("Long travel time")
        except (ValueError, TypeError):
            pass
    return pros, cons


def _enrich_flight_offers(
    offers: List[Dict[str, Any]],
    dictionaries: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Transform raw Amadeus offers into enriched comparison items for the UI."""
    carriers_dict = dictionaries.get("carriers", {})
    items: List[Dict[str, Any]] = []
    confidence_scores = [95, 88, 82]
    
    for idx, offer in enumerate(offers[:10]):  # Up to 10 results
        itineraries = offer.get("itineraries", [])
        if not itineraries:
            continue
        first_itin = itineraries[0]
        segments = first_itin.get("segments", [])
        if not segments:
            continue
        first_seg = segments[0]
        last_seg = segments[-1]
        carrier_code = first_seg.get("carrierCode", "")
        flight_number = first_seg.get("number", "")
        airline_name = carriers_dict.get(carrier_code, carrier_code)
        origin_iata = first_seg.get("departure", {}).get("iataCode", "")
        dest_iata = last_seg.get("arrival", {}).get("iataCode", "")
        
        dep_time_raw = first_seg.get("departure", {}).get("at", "")
        arr_time_raw = last_seg.get("arrival", {}).get("at", "")
        dep_date = dep_time_raw.split("T")[0] if "T" in dep_time_raw else ""
        arr_date = arr_time_raw.split("T")[0] if "T" in arr_time_raw else ""
        dep_time = dep_time_raw.split("T")[-1][:5] if "T" in dep_time_raw else dep_time_raw
        arr_time = arr_time_raw.split("T")[-1][:5] if "T" in arr_time_raw else arr_time_raw
        
        duration_str = _parse_duration(first_itin.get("duration", ""))
        total_stops = sum(s.get("numberOfStops", 0) for s in segments) + max(0, len(segments) - 1)
        
        price_data = offer.get("price", {})
        price_val = float(price_data.get("grandTotal", price_data.get("total", 0)))
        currency = price_data.get("currency", "USD")
        
        airline_info = AIRLINE_AIRPLANE_IMAGES.get(carrier_code.upper(), {})
        image_url = airline_info.get("airline_image", "")
        
        pros, cons = _build_flight_pros_cons(first_seg, duration_str)
        if airline_name and airline_name != carrier_code:
            pros.append(f"{airline_name}")
            
        items.append({
            "id": f"flight_{offer.get('id', idx)}",
            "type": "destination",
            "name": f"{airline_name} {carrier_code}{flight_number} — {origin_iata} → {dest_iata}",
            "imageUrl": image_url,
            "price": price_val,
            "currency": currency,
            "matchConfidence": confidence_scores[idx] if idx < len(confidence_scores) else 75,
            "pros": pros,
            "cons": cons,
            "metadata": {
                "departureDate": dep_date,
                "departure": f"{dep_date} {dep_time}" if dep_date else dep_time,
                "arrivalDate": arr_date,
                "arrival": f"{arr_date} {arr_time}" if arr_date else arr_time,
                "duration": duration_str,
                "airline": airline_name,
                "flightNumber": f"{carrier_code} {flight_number}",
                "flightNo": f"{carrier_code} {flight_number}",
                "flight_no": f"{carrier_code} {flight_number}",
                "stops": total_stops,
                "origin": origin_iata,
                "destination": dest_iata,
            },
        })
    return items
    return {"error": "Failed to persist booking to backend", "details": last_error}

@tool
def amadeus_search_flight_offers(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    adults: int = 1,
    currency_code: str = "USD",
    return_date: Optional[str] = None,
    max_results: int = 5,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Discover live-sellable flight offers through the Amadeus Shopping API.

    Required traveler inputs:
    - origin_location_code: IATA code for the departure airport (e.g., "ADD")
    - destination_location_code: IATA code for the arrival airport (e.g., "DXB")
    - departure_date: Travel date in YYYY-MM-DD format

    Optional enrichments:
    - return_date: Return date in YYYY-MM-DD for round-trip searches
    - adults: Number of adult passengers
    - currency_code: ISO currency for fare presentation (default USD)
    - max_results: Cap the number of offers returned (default 10)
    - user_id: User ID for caching purposes.

    Returns the raw Amadeus response payload enriched with a 'flights' key 
    containing pre-formatted comparison items.
    """
    try:
        from agent.response_cache import cache_response, get_cached_response

        # ----- cache check -----
        cache_key = f"search_flights_{destination_location_code.upper()}"
        cache_params = {
            "origin": origin_location_code.upper(),
            "destination": destination_location_code.upper(),
            "date": departure_date,
            "adults": adults,
            "return_date": return_date,
        }
        
        if user_id:
            cached = get_cached_response(user_id, cache_key, cache_params)
            if cached:
                # Compatibility with old cache format (list)
                if isinstance(cached, list):
                    cached = {"flights": cached}
                return {**cached, "_from_cache": True}

        params: Dict[str, Any] = {
            "originLocationCode": origin_location_code.upper(),
            "destinationLocationCode": destination_location_code.upper(),
            "departureDate": departure_date,
            "adults": adults,
            "currencyCode": currency_code,
            "max": max_results,
        }
        if return_date:
            params["returnDate"] = return_date

        raw_result = _amadeus_with_retries(
            "GET",
            "/v2/shopping/flight-offers",
            params=params,
        )
        raw_result = _sanitize_for_tool_json(raw_result)

        if raw_result.get("error"):
            return raw_result

        # Enrich with 'flights' key for UI compatibility
        offers = raw_result.get("data", [])
        dictionaries = raw_result.get("dictionaries", {})
        enriched_flights = _enrich_flight_offers(offers, dictionaries)
        
        final_result = {**raw_result, "flights": enriched_flights}

        # Cache the result if user_id is provided
        if user_id and enriched_flights:
            cache_response(user_id, cache_key, final_result, cache_params, ttl=3600)

        return final_result

    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error searching flight offers", "details": str(exc)}


@tool
def amadeus_price_flight_offer(
    flight_offer: Optional[Dict[str, Any]] = None,
    travelers: Optional[List[Dict[str, Any]]] = None,
    request_body: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Reprice a selected flight offer to certify fare and seat availability.

    Preferred usage:
    - flight_offer: The exact selected offer object from the Amadeus search results.
    - travelers: Optional traveler records to include as `data.travelers`.

    Backward-compatible usage:
    - request_body: Full dictionary matching the Amadeus Flight Offers Pricing schema.
      Common fields include `data.type`, `data.flightOffers` from search results,
      and optional `data.travelers` details.

    Returns the Amadeus pricing response; bubble up any API faults verbatim.
    """
    try:
        if request_body is None:
            request_body = {
                "data": {
                    "type": "flight-offers-pricing",
                    "flightOffers": [flight_offer] if isinstance(flight_offer, dict) else [],
                }
            }
            if travelers:
                request_body["data"]["travelers"] = travelers

        normalized_request_body = _normalize_pricing_request_body(request_body)
        flight_offers = normalized_request_body.get("data", {}).get("flightOffers", [])
        if not flight_offers:
            return {
                "error": "Invalid pricing payload",
                "details": "No flight offers were found in the pricing request body.",
            }

        return _amadeus_with_retries(
            "POST",
            "/v1/shopping/flight-offers/pricing",
            json_body=normalized_request_body,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error pricing flight offer", "details": str(exc)}


@tool
def amadeus_create_flight_order(
    order_payload: Dict[str, Any],
    user_id: str,
    conversation_id: str,
) -> Dict[str, Any]:
    """
    Finalize a reservation (not ticketing) by creating an Amadeus flight order.

    Required payload structure:
    - order_payload: Dictionary aligned with the Amadeus Flight Orders schema.
      Include the priced offer(s), traveler profiles, and contact channels.
      Do not request or include payment method details; this flow is for reservations/holds only.

    Returns the booking confirmation payload; expose Amadeus errors without alteration.
    """
    if not user_id:
        return {"error": "user_id is required to create and persist a flight order"}
    if not conversation_id:
        return {"error": "conversation_id is required to create and persist a flight order"}

    try:
        order_response = _amadeus_with_retries(
            "POST",
            "/v1/booking/flight-orders",
            json_body=order_payload,
        )
        if order_response and order_response.get("error"):
            return {"error": "Failed to create Amadeus flight order", "details": order_response}

        backend_url = os.getenv("UMOJA_BACKEND_URL", "http://localhost:4001")
        save_endpoint = f"{backend_url.rstrip('/')}/api/ai/amadeus/booking/save"
        save_payload: Dict[str, Any] = {
            "data": order_response,
            "userId": user_id,
            "conversationId": conversation_id,
        }

        save_result: Dict[str, Any] = _post_with_retries(save_endpoint, save_payload)

        return {"order": order_response, "save_result": save_result}
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error creating flight order", "details": str(exc)}


@tool
def amadeus_get_flight_order(order_id: str) -> Dict[str, Any]:
    """
    Retrieve an existing flight order by its Amadeus-generated identifier.

    Required input:
    - order_id: The unique code returned by Amadeus at booking time.

    Returns the latest order snapshot; pass through Amadeus error messaging verbatim.
    """
    try:
        return _make_amadeus_request(
            "GET",
            f"/v1/booking/flight-orders/{order_id}",
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error fetching flight order", "details": str(exc)}


@tool
def amadeus_get_on_demand_flight_status(
    carrier_code: str,
    flight_number: str,
    scheduled_departure_date: str,
    optional_params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Fetch live operational details for a specific flight via the On-Demand Flight Status API.

    Required inputs:
    - carrier_code: Marketing carrier IATA code (e.g., "ET")
    - flight_number: Numeric flight designator without carrier prefix (e.g., "500")
    - scheduled_departure_date: The planned departure date in YYYY-MM-DD format

    Optional:
    - optional_params: Additional query parameters supported by the API, such as
      `operationalSuffix`, `departureAirportCode`, `arrivalAirportCode`, or `include`.

    Returns the operational flight status payload directly from Amadeus.
    """
    try:
        params: Dict[str, Any] = {
            "carrierCode": carrier_code,
            "flightNumber": flight_number,
            "scheduledDepartureDate": scheduled_departure_date,
        }
        if optional_params:
            params.update(optional_params)

        return _amadeus_with_retries(
            "GET",
            "/v2/schedule/flights",
            params=params,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error fetching on-demand flight status", "details": str(exc)}


@tool
def amadeus_find_nearest_airport(
    latitude: float,
    longitude: float,
    radius: int = 500,
    limit: int = 3,
) -> Dict[str, Any]:
    """
    Find the nearest airports to given coordinates using the Amadeus Airport Nearest Relevant API.

    Required:
    - latitude: Latitude of the location
    - longitude: Longitude of the location

    Optional:
    - radius: Search radius in kilometers (default 500)
    - limit: Max number of airports to return (default 3)

    Returns airport data including IATA codes, names, and distances.
    """
    try:
        from agent.response_cache import cache_response, get_cached_response

        cache_params = {
            "lat": round(latitude, 2),
            "lon": round(longitude, 2),
            "radius": radius,
        }

        cached = get_cached_response("global", "nearest_airport", cache_params)
        if cached:
            if isinstance(cached, dict):
                cached["_from_cache"] = True
            return cached

        params: Dict[str, Any] = {
            "latitude": latitude,
            "longitude": longitude,
            "radius": radius,
            "page[limit]": limit,
            "sort": "relevance",
        }

        result = _amadeus_with_retries(
            "GET",
            "/v1/reference-data/locations/airports",
            params=params,
        )

        if result and not result.get("error"):
            cache_response("global", "nearest_airport", result, cache_params)

        return result
    except Exception as exc:
        return {"error": "Unexpected error finding nearest airport", "details": str(exc)}


@tool
def flight_get_flight_image_url(carrier_code: str) -> Dict[str, Any]:
    """
    Look up a marketing image for an airline by its IATA carrier code.

    Returns the mapped metadata, including the static image URL, when available.
    """
    if not carrier_code:
        return {"error": "Carrier code is required to fetch an image."}

    code = carrier_code.upper()
    airline_data = AIRLINE_AIRPLANE_IMAGES.get(code)

    if not airline_data:
        return {
            "error": "Airline image not found",
            "details": f"No marketing image mapped for IATA code '{code}'.",
        }

    image_url = airline_data.get("airline_image")
    if not image_url:
        return {
            "error": "Airline image unavailable",
            "details": f"Image URL missing for IATA code '{code}'.",
        }

    return {
        "iata": code,
        "image_url": image_url,
        "airline": dict(airline_data),
    }

@tool
def amadeus_save_booked_flight_to_journey(
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
    provider: str = "amadeus",
    provider_order_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Save a confirmed booked flight to the journey after a successful Amadeus booking.

    This mirrors the /hooks/booking-confirmed webhook behaviour but is called directly
    by the booking agent using the journey_id already present in context.

    What it does:
    - Appends the booking details to journey.booked_flights (supports multiple bookings).
    - Updates journey.context.flight_status to the newly booked flight (status="booked").
    - Updates journey.context.airport_code and destination_airport_code.
    - Persists booking context for centralized monitoring-driven transitions.

    Required inputs:
    - journey_id: Active journey ID from context.
    - booking_reference: PNR / Amadeus booking reference.
    - amadeus_order_id: The Amadeus order ID returned by create_flight_order.
    - flight_number: IATA flight number (e.g. "EK203").
    - airline: Airline name or IATA carrier code.
    - from_code: Departure IATA airport code.
    - to_code: Arrival IATA airport code.
    - departure: Departure datetime string (ISO format).
    - arrival: Arrival datetime string (ISO format), optional.
    - price: Total ticket price as a float, optional.
    - currency: Currency code (e.g. "USD"), optional.
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}
    if not booking_reference and not amadeus_order_id:
        return {"error": "booking_reference or amadeus_order_id is required.", "status": "failed"}

    try:
        from datetime import datetime, timezone
        from agent.journey.journey_orchestrator import _state_manager_ref
        from agent.journey.phase_1_foundation.journey_models import FlightStatusContext

        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}

        journey = _state_manager_ref.get_journey(journey_id)
        if not journey:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        now = datetime.now(timezone.utc)

        # Build the booked flight record
        booked_flight_record = {
            "flight_number": flight_number,
            "airline": airline,
            "provider": provider or "amadeus",
            "from_code": from_code,
            "to_code": to_code,
            "departure": departure,
            "arrival": arrival,
            "booking_reference": booking_reference,
            "provider_order_id": provider_order_id or amadeus_order_id,
            "amadeus_order_id": amadeus_order_id,
            "price": price,
            "currency": currency,
            "booked_at": now.isoformat(),
        }

        # Parse departure/arrival times for FlightStatusContext
        departure_time = None
        arrival_time = None
        if departure:
            try:
                dt = datetime.fromisoformat(departure.replace(" ", "T"))
                departure_time = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if arrival:
            try:
                dt = datetime.fromisoformat(arrival.replace(" ", "T"))
                arrival_time = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        # Update flight_status on context (tracks the latest booked flight)
        journey.context.flight_status = FlightStatusContext(
            flight_number=flight_number,
            status="booked",
            departure_time=departure_time,
            arrival_time=arrival_time,
            departure_airport=from_code,
            arrival_airport=to_code,
            airline=airline,
            booking_reference=booking_reference,
            provider=provider or "amadeus",
            provider_order_id=provider_order_id or amadeus_order_id,
            amadeus_order_id=amadeus_order_id,
            price=price,
            currency=currency,
        )
        journey.context.airport_code = from_code
        journey.context.destination_airport_code = to_code
        if not journey.context.departure_airport_code:
            journey.context.departure_airport_code = from_code

        # Append to booked_flights list
        journey.booked_flights.append(booked_flight_record)
        journey.updated_at = now
        _state_manager_ref._persist_journey(journey)

        # Monitoring routes evaluate any segment transition based on the saved booking context.
        return {
            "status": "success",
            "message": f"Booked flight {flight_number} saved to journey '{journey_id}'.",
            "journey_id": journey_id,
            "booking_reference": booking_reference,
            "provider": provider or "amadeus",
            "provider_order_id": provider_order_id or amadeus_order_id,
            "amadeus_order_id": amadeus_order_id,
            "total_booked_flights": len(journey.booked_flights) if journey else 1,
        }
    except Exception as exc:
        return {
            "error": "Failed to save booked flight to journey.",
            "details": str(exc),
            "status": "error",
        }


@tool
def amadeus_save_flights_to_journey(journey_id: str, flights: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save a list of flight recommendations to the user's active journey context.
    
    Required inputs:
    - journey_id: The ID of the currently active journey.
    - flights: A list of flight dictionary objects (typically the api_response output of a search)
      that the user wishes to save/shortlist.
      
    Returns a success dictionary or an error message.
    """
    if not journey_id:
        return {"error": "journey_id is required to save flights."}
        
    # Attempt to parse flights if the agent passed a JSON string instead of a list
    if isinstance(flights, str):
        try:
            import json
            flights = json.loads(flights)
        except Exception:
            return {"error": "flights argument is a string but not valid JSON.", "status": "failed"}
            
    if not flights or not isinstance(flights, list):
        return {"error": "A list of flights is required.", "status": "failed"}

    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}
            
        _state_manager_ref.update_journey(journey_id, {"saved_flights": flights})
        return {
            "status": "success",
            "message": f"Successfully saved {len(flights)} flight(s) to the journey context.",
            "saved_count": len(flights)
        }
    except Exception as exc:
        return {
            "error": "Failed to save flights to journey data.",
            "details": str(exc),
            "status": "error"
        }


@tool
def amadeus_save_hotels_to_journey(journey_id: str, hotels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save a list of hotel recommendations to the user's active journey context.
    
    Required inputs:
    - journey_id: The ID of the currently active journey.
    - hotels: A list of hotel dictionary objects (typically the api_response output of a hotel search)
      that the user wishes to save/shortlist.
      
    Returns a success dictionary or an error message.
    """
    if not journey_id:
        return {"error": "journey_id is required to save hotels."}
        
    # Attempt to parse hotels if the agent passed a JSON string instead of a list
    if isinstance(hotels, str):
        try:
            import json
            hotels = json.loads(hotels)
        except Exception:
            return {"error": "hotels argument is a string but not valid JSON.", "status": "failed"}
            
    if not hotels or not isinstance(hotels, list):
        return {"error": "A list of hotels is required.", "status": "failed"}

    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}
            
        _state_manager_ref.update_journey(journey_id, {"saved_hotels": hotels})
        return {
            "status": "success",
            "message": f"Successfully saved {len(hotels)} hotel(s) to the journey context.",
            "saved_count": len(hotels)
        }
    except Exception as exc:
        return {
            "error": "Failed to save hotels to journey data.",
            "details": str(exc),
            "status": "error"
        }

