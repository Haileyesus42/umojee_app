import json
import os
import time as _time
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

from agent.amadeus.amadeus_make_request import _make_amadeus_request
from agent.amadeus.helper.airline_images import AIRLINE_AIRPLANE_IMAGES
from agent.amadeus.amadeus_flight.amadeus_flight_tools import (
    _enrich_flight_offers,
    amadeus_save_flights_to_journey
)
from agent.response_cache import cache_response, get_cached_response

# ---------------------------------------------------------------------------
# Shared helpers (identical to greeting_tools — kept here to decouple)
# ---------------------------------------------------------------------------

def _safe_json_loads(raw: str) -> Dict[str, Any]:
    try:
        data = json.loads(raw) if raw else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _amadeus_request_with_retry(
    method: str,
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    retries: int = 2,
    backoff: float = 1.0,
) -> Dict[str, Any]:
    last_error: Optional[str] = None
    for attempt in range(retries):
        try:
            return _make_amadeus_request(method, endpoint, params=params, json=json_body)
        except Exception as exc:
            last_error = str(exc)
            if attempt < retries - 1:
                _time.sleep(backoff * (2 ** attempt))
                continue
            return {"error": "Amadeus request failed", "details": last_error}
    return {"error": "Amadeus request failed", "details": last_error}



# INTERNAL HELPERS MOVED TO agent.amadeus.amadeus_flight.amadeus_flight_tools
# Logic for _parse_duration, _build_flight_pros_cons preserved there for sharing.


# ---------------------------------------------------------------------------
# Tools exposed to the journey inspiration agent
# ---------------------------------------------------------------------------

@tool
def inspiration_collect_journey_context(
    journey_payload_json: Optional[str] = "",
) -> Dict[str, Any]:
    """
    Decode the journey creation payload and extract all relevant context.

    Required: journey_payload_json (stringified JSON from the journey creation request).
    Extracts: user profile, location, destination, budget, departure city/airport,
    departure date, duration, travelers count, and journey_id.
    """
    payload = _safe_json_loads(journey_payload_json or "")
    user_data = payload.get("user_data") or {}
    location = user_data.get("location") or {}

    return {
        "user_id": payload.get("user_id", ""),
        "journey_id": payload.get("journey_id", ""),
        "user_name": (
            f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}".strip()
            or user_data.get("username", "")
        ),
        "destination": payload.get("destination", ""),
        "destination_airport_code": payload.get("destination_airport_code", ""),
        "departure_city": payload.get("departure_city", ""),
        "departure_airport_code": payload.get("departure_airport_code", ""),
        "departure_date": payload.get("departure_date", ""),
        "duration_days": payload.get("duration_days"),
        "travelers_count": payload.get("travelers_count", 1),
        "budget_min": payload.get("budget_min"),
        "budget_max": payload.get("budget_max"),
        "currency": payload.get("currency", "USD"),
        "location_lat": location.get("lat"),
        "location_lon": location.get("lon"),
        "location_city": location.get("city"),
        "home_location": user_data.get("homeLocation"),
        "preferences": user_data.get("preferences"),
        "raw_user_data": user_data,
    }


@tool
def inspiration_find_nearest_airport(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """
    Find the nearest airport to given coordinates via Amadeus Airport Nearest Relevant API.

    Required: lat, lon.
    Use this ONLY when the departure_airport_code is NOT already provided in the journey context.
    """
    cache_params = {"lat": round(lat, 2), "lon": round(lon, 2)}
    cached = get_cached_response("global", "nearest_airport_inspiration", cache_params)
    if cached:
        if isinstance(cached, dict):
            cached["_from_cache"] = True
        return cached

    result = _amadeus_request_with_retry(
        "GET",
        "/v1/reference-data/locations/airports",
        params={
            "latitude": lat,
            "longitude": lon,
            "radius": 500,
            "page[limit]": 5,
            "sort": "distance",
        },
    )
    if result.get("error"):
        return {"found": False, "error": result["error"]}

    airports = result.get("data", [])
    if not airports:
        return {"found": False, "iata_code": "", "airport_name": ""}

    top = airports[0]
    parsed = {
        "found": True,
        "iata_code": top.get("iataCode", ""),
        "airport_name": top.get("name", ""),
        "city": top.get("address", {}).get("cityName", ""),
        "country": top.get("address", {}).get("countryName", ""),
        "distance_km": top.get("distance", {}).get("value"),
    }
    cache_response("global", "nearest_airport_inspiration", parsed, cache_params)
    return parsed


@tool
def inspiration_recommend_flights(
    origin_iata: str,
    destination_iata: str,
    user_id: str,
    departure_date: Optional[str] = None,
    adults: int = 1,
    currency_code: str = "USD",
    return_date: Optional[str] = None,
    max_results: int = 10,
    journey_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Search for flight offers from origin to destination via Amadeus Shopping API.

    Required:
    - origin_iata: IATA code of the departure airport.
    - destination_iata: IATA code of the destination airport.
    - user_id: the user's unique identifier.

    Optional:
    - departure_date: YYYY-MM-DD (defaults to 30 days from today).
    - adults: number of adult passengers (default 1).
    - currency_code: ISO currency (default USD).
    - return_date: YYYY-MM-DD for round-trip searches.
    - max_results: max number of offers (default 10).
    - journey_id: the ID of the active journey to auto-save results.

    Returns the raw Amadeus response payload enriched with a 'flights' key 
    containing pre-formatted comparison items.
    """
    today_str = date.today().isoformat()
    if not departure_date:
        departure_date = (date.today() + timedelta(days=30)).isoformat()

    cache_params = {
        "origin": origin_iata.upper(),
        "destination": destination_iata.upper(),
        "user_id": user_id,
        "date": today_str,
    }
    cache_key = f"inspiration_flights_{destination_iata.upper()}"
    cached = get_cached_response(user_id, cache_key, cache_params)
    
    if cached:
        # Compatibility with old cache format (list)
        if isinstance(cached, list):
            cached = {"flights": cached, "found": bool(cached)}
            
        # Check if saved_flights are missing in cache or we need to re-save
        if journey_id:
            amadeus_save_flights_to_journey.invoke({
                "journey_id": journey_id, 
                "flights": cached.get("flights", [])
            })
        return {**cached, "_from_cache": True, "found": True}

    params: Dict[str, Any] = {
        "originLocationCode": origin_iata.upper(),
        "destinationLocationCode": destination_iata.upper(),
        "departureDate": departure_date,
        "adults": adults,
        "currencyCode": currency_code,
        "max": max_results,
    }
    if return_date:
        params["returnDate"] = return_date

    raw_result = _amadeus_request_with_retry(
        "GET",
        "/v2/shopping/flight-offers",
        params=params,
    )
    
    if raw_result.get("error"):
        return {"flights": [], "found": False, "error": raw_result["error"]}

    offers = raw_result.get("data", [])
    dictionaries = raw_result.get("dictionaries", {})
    comparison_items = _enrich_flight_offers(offers, dictionaries)

    final_result = {**raw_result, "flights": comparison_items, "found": bool(comparison_items)}

    if comparison_items:
        cache_response(user_id, cache_key, final_result, cache_params, ttl=86400)
        
        # AUTO-SAVE logic
        if journey_id:
            amadeus_save_flights_to_journey.invoke({
                "journey_id": journey_id, 
                "flights": comparison_items
            })

    return final_result


__all__ = [
    "inspiration_collect_journey_context",
    "inspiration_find_nearest_airport",
    "inspiration_recommend_flights",
]
