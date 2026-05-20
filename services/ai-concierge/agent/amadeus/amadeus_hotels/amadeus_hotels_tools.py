from typing import Any, Dict, List, Optional

import requests
from langchain_core.tools import tool

from agent.amadeus.amadeus_make_request import _make_amadeus_request


@tool
def amadeus_list_hotels(
    city_code: str,
    radius: Optional[int] = None,
    radius_unit: str = "KM",
    chain_codes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Retrieve a catalog of hotels for a city using the Amadeus Hotel List API.

    Required inputs:
    - city_code: IATA city code (e.g., "ADD", "DXB") that anchors the search area.

    Optional filters:
    - radius / radius_unit: Restrict results to properties within the given distance (KM or MI).
    - chain_codes: Limit results to specific hotel chains (list of Amadeus chain codes).

    Returns the static hotel metadata payload. Propagates Amadeus errors unaltered.
    """
    params: Dict[str, Any] = {"cityCode": city_code}
    if radius is not None:
        params["radius"] = radius
        params["radiusUnit"] = radius_unit
    if chain_codes:
        params["chainCodes"] = ",".join(chain_codes)

    try:
        return _make_amadeus_request(
            "GET",
            "/v1/reference-data/locations/hotels/by-city",
            params=params,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error listing hotels", "details": str(exc)}


@tool
def amadeus_search_hotel_offers(
    check_in_date: str,
    check_out_date: str,
    city_code: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[int] = None,
    radius_unit: str = "KM",
    adults: int = 1,
    room_quantity: int = 1,
    currency: str = "USD",
    hotel_ids: Optional[List[str]] = None,
    include_closed: bool = False,
    best_rate_only: bool = True,
    sort: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Search for live hotel offers via the Amadeus Hotel Search API.

    Required inputs:
    - check_in_date / check_out_date: Stay window in YYYY-MM-DD format.
    - A location signal: either city_code, (latitude & longitude), or hotel_ids.

    Optional refinements mirror the Amadeus v3 hotel-offers endpoint.

    Returns the raw offers response. Leaves Amadeus faults untouched.
    """
    if not check_in_date or not check_out_date:
        return {
            "error": "Missing required stay dates",
            "details": "Both check_in_date and check_out_date are required.",
        }

    if isinstance(hotel_ids, str):
        hotel_ids = [hotel_ids]

    has_city = city_code is not None
    has_geo = latitude is not None and longitude is not None
    has_hotels = bool(hotel_ids)

    if not (has_city or has_geo or has_hotels):
        return {
            "error": "Missing location context",
            "details": "Provide city_code, latitude/longitude, or hotel_ids.",
        }

    params: Dict[str, Any] = {
        "checkInDate": check_in_date,
        "checkOutDate": check_out_date,
        "adults": adults,
        "roomQuantity": room_quantity,
        "currency": currency,
    }
    # hotelIds is the most specific locator. When present, avoid mixing it with
    # broader location filters that can cause Amadeus to reject the request.
    if hotel_ids:
        params["hotelIds"] = ",".join(hotel_ids)
    elif city_code:
        params["cityCode"] = city_code
    elif has_geo:
        params["latitude"] = latitude
        params["longitude"] = longitude

    if radius is not None and not hotel_ids:
        params["radius"] = radius
        params["radiusUnit"] = radius_unit
    if include_closed:
        params["includeClosed"] = "true"
    if not best_rate_only:
        params["bestRateOnly"] = "false"
    if sort:
        params["sort"] = sort

    try:
        return _make_amadeus_request(
            "GET",
            "/v3/shopping/hotel-offers",
            params=params,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error searching hotel offers", "details": str(exc)}


@tool
def amadeus_create_hotel_booking(booking_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Confirm a reservation using the Amadeus Hotel Booking API.

    Required payload:
    - booking_payload: Dictionary aligned with the Hotel Booking schema (offer id,
      guests, payments, contact information, etc.).

    Returns the booking confirmation payload and surfaces Amadeus errors verbatim.
    """
    try:
        return _make_amadeus_request(
            "POST",
            "/v1/booking/hotel-bookings",
            json=booking_payload,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}


@tool
def amadeus_save_hotels_to_journey(journey_id: str, hotels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save a list of hotel recommendations to the user's active journey context.

    Required inputs:
    - journey_id: The ID of the journey to update.
    - hotels: A list of hotel recommendation dictionaries.
    """
    if not journey_id:
        return {"error": "journey_id is required to save hotels.", "status": "failed"}

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
            "saved_count": len(hotels),
        }
    except Exception as exc:
        return {
            "error": "Failed to save hotels to journey data.",
            "details": str(exc),
            "status": "error",
        }

@tool
def amadeus_save_booked_hotel_to_journey(
    journey_id: str,
    hotel_name: str,
    city_code: str,
    check_in_date: str,
    check_out_date: str,
    booking_reference: str,
    price: float,
    currency: str,
    hotel_id: Optional[str] = None,
    address: Optional[str] = None,
    amadeus_order_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Save a confirmed hotel booking to the user's active journey context.
    
    Required inputs:
    - journey_id: The ID of the journey to update.
    - hotel_name: Name of the hotel.
    - city_code: IATA city code.
    - check_in_date: ISO date (YYYY-MM-DD).
    - check_out_date: ISO date (YYYY-MM-DD).
    - booking_reference: Confirmation number from Amadeus.
    - price: Total price for the stay.
    - currency: Currency code (e.g., "USD").
    """
    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}
            
        journey = _state_manager_ref.get_journey(journey_id)
        if not journey:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        # Build the booked hotel record
        booked_hotel_record = {
            "hotel_name": hotel_name,
            "hotel_id": hotel_id,
            "city_code": city_code,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "booking_reference": booking_reference,
            "amadeus_order_id": amadeus_order_id,
            "price": price,
            "currency": currency,
            "address": address,
            "booked_at": now.isoformat(),
        }

        # Append to booked_hotels list
        if not hasattr(journey, 'booked_hotels'):
            journey.booked_hotels = []
        journey.booked_hotels.append(booked_hotel_record)

        # Update the journey in the state manager
        _state_manager_ref.update_journey(journey_id, {"booked_hotels": journey.booked_hotels})
        
        return {
            "status": "success",
            "message": f"Successfully saved booked hotel '{hotel_name}' to journey.",
            "record": booked_hotel_record
        }
    except Exception as exc:
        return {"error": "Failed to save booked hotel to journey", "details": str(exc), "status": "error"}
