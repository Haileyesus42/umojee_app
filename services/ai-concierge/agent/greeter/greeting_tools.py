import json
import os
import time as _time
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import requests
from langchain_core.tools import tool

from server.helpers import _build_user_recall_context
from agent.amadeus.amadeus_make_request import _make_amadeus_request
from agent.amadeus.helper.airline_images import AIRLINE_AIRPLANE_IMAGES
from agent.amadeus.amadeus_flight.amadeus_flight_tools import _enrich_flight_offers
from agent.response_cache import cache_response, get_cached_response


def _safe_json_loads(raw: str) -> Dict[str, Any]:
    try:
        data = json.loads(raw) if raw else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _get_weather_data(lat: float, lon: float) -> Optional[str]:
    endpoint = os.getenv("OPENWEATHERMAP_ENDPOINT", "https://api.openweathermap.org/data/2.5/weather")
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        return None
    try:
        resp = requests.get(
            endpoint,
            params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        desc = None
        if isinstance(data, dict):
            weather = data.get("weather")
            if isinstance(weather, list) and weather:
                desc = weather[0].get("description")
            temp = data.get("main", {}).get("temp")
            if desc and temp is not None:
                return f"{desc}, {temp} C"
            if desc:
                return desc
            if temp is not None:
                return f"{temp} C"
    except Exception:
        return None
    return None


def _get_nearby_restaurants(lat: float, lon: float, radius: int = 10000, limit: int = 5) -> Optional[str]:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            params={
                "location": f"{lat},{lon}",
                "radius": radius,
                "type": "restaurant",
                "key": api_key,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        names = []
        for result in data.get("results", []):
            name = result.get("name")
            if name:
                names.append(name)
            if len(names) >= limit:
                break
        if names:
            return ", ".join(names)
    except Exception:
        return None
    return None


@tool
def greeting_get_weather_data(
    lat: float,
    lon: float,
    city: Optional[str] = None,
    local_time_iso: Optional[str] = None,
    local_time_locale: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch a brief weather description for the provided coordinates.

    Required: lat, lon.
    Optional: city to include in the summary; local_time_iso/local_time_locale to surface local time/date.
    """
    weather_text = _get_weather_data(lat, lon)
    return {
        "lat": lat,
        "lon": lon,
        "weather": weather_text or "",
        "city": city,
        "local_time_iso": local_time_iso,
        "local_time_locale": local_time_locale,
        "found": bool(weather_text),
    }


@tool
def greeting_get_nearby_restaurants(
    lat: float,
    lon: float,
    radius: int = 10000,
    limit: int = 5,
    city: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch nearby restaurant names around the provided coordinates.

    Required: lat, lon.
    Optional: radius (meters), limit (max names to return), city to include in the summary.
    """
    restaurants = _get_nearby_restaurants(lat, lon, radius=radius, limit=limit)
    return {
        "lat": lat,
        "lon": lon,
        "radius": radius,
        "limit": limit,
        "restaurants": restaurants or "",
        "city": city,
        "found": bool(restaurants),
    }


@tool
def greeting_collect_profile_context(
    user_profile_json: Optional[str] = "",
    user_name: Optional[str] = "",
    username: Optional[str] = "",
) -> Dict[str, Any]:
    """
    Normalize the provided user profile JSON into a concise context for greetings.

    Required: user_profile_json (stringified JSON passed from the client).
    Optional: user_name or username fallbacks when the JSON lacks names.
    """
    profile = _safe_json_loads(user_profile_json or "")
    name = (user_name or username or str(profile.get("firstName") or profile.get("username") or "")) or ""
    location = profile.get("location") or profile.get("user_location") or {}
    loc_city = location.get("city") if isinstance(location, dict) else None
    loc_state = location.get("state") if isinstance(location, dict) else None
    loc_country = location.get("country") if isinstance(location, dict) else None
    loc_display = location.get("display_name") if isinstance(location, dict) else None
    loc_ts_iso = location.get("ts_iso") if isinstance(location, dict) else None
    loc_ts_locale = location.get("ts_locale") if isinstance(location, dict) else None
    preferences = profile.get("preferences") if isinstance(profile, dict) else None

    summary: Dict[str, Any] = {
        "user_name": name,
        "username": username or "",
        "email": profile.get("email"),
        "location_city": loc_city,
        "location_summary": {
            k: v
            for k, v in {
                "city": loc_city,
                "state": loc_state,
                "country": loc_country,
                "display_name": loc_display,
                "timestamp_iso": loc_ts_iso,
                "timestamp_locale": loc_ts_locale,
            }.items()
            if v
        },
        "raw_profile": profile,
    }
    if preferences:
        summary["preferences"] = preferences
    return summary


@tool
def greeting_fetch_user_recall(user_id: str) -> Dict[str, Any]:
    """
    Retrieve past conversation highlights for a returning user.

    Required: user_id (string unique to the user).
    """
    recall = _build_user_recall_context(user_id)
    return {
        "user_id": user_id,
        "recall_context": recall or "",
        "found": bool(recall),
    }


def _amadeus_request_with_retry(
    method: str,
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    retries: int = 2,
    backoff: float = 1.0,
) -> Dict[str, Any]:
    """Call Amadeus API with simple retry logic."""
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
# Logic for _parse_duration, _build_flight_pros_cons and _enrich_flight_offers preserved there for sharing.


@tool
def greeting_find_nearest_airport(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """
    Find the nearest airport to the user's current location via Amadeus Airport Nearest Relevant API.

    Required: lat, lon from the user's location data.
    Returns the nearest airport IATA code, name, city, country, and distance.
    If no location is available, do NOT call this tool.
    """
    cache_params = {
        "lat": round(lat, 2),
        "lon": round(lon, 2),
    }

    cached = get_cached_response("global", "nearest_airport_greeting", cache_params)
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

    cache_response("global", "nearest_airport_greeting", parsed, cache_params)
    return parsed


@tool
def greeting_recommend_flights(
    origin_iata: str,
    destination_iata: str,
    user_id: str,
    departure_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Recommend up to 3 flights from the user's nearest airport. Results are cached
    daily — the Amadeus API is called at most once per day per user.

    Required:
    - origin_iata: IATA code of the departure airport (from greeting_find_nearest_airport).
    - destination_iata: IATA code of a destination the user is likely interested in
      (infer from greeting_fetch_user_recall or greeting_collect_profile_context;
       if no preference found, pick a major hub reachable from the origin).
    - user_id: the user's unique identifier.

    Optional:
    - departure_date: YYYY-MM-DD (defaults to 30 days from today).

    Returns pre-formatted comparison items ready for the frontend ComparisonView.
    If cached flights exist for today, returns those without calling the API.
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

    cache_key = f"greeting_flights_{destination_iata.upper()}"
    cached = get_cached_response(user_id, cache_key, cache_params)
    if cached:
        return {"flights": cached, "_from_cache": True, "found": True}

    result = _amadeus_request_with_retry(
        "GET",
        "/v2/shopping/flight-offers",
        params={
            "originLocationCode": origin_iata.upper(),
            "destinationLocationCode": destination_iata.upper(),
            "departureDate": departure_date,
            "adults": 1,
            "currencyCode": "USD",
            "max": 1,
        },
    )

    if result.get("error"):
        return {"flights": [], "found": False, "error": result["error"]}

    offers = result.get("data", [])
    dictionaries = result.get("dictionaries", {})

    comparison_items = _enrich_flight_offers(offers, dictionaries)

    if comparison_items:
        cache_response(user_id, cache_key, comparison_items, cache_params, ttl=86400)

    return {"flights": comparison_items, "found": bool(comparison_items)}


__all__ = [
    "greeting_collect_profile_context",
    "greeting_fetch_user_recall",
    "greeting_get_weather_data",
    "greeting_get_nearby_restaurants",
    "greeting_find_nearest_airport",
    "greeting_recommend_flights",
]
