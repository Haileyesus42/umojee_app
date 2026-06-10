import json
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool
from agent.amadeus.amadeus_make_request import _make_amadeus_request
from agent.duffel.duffel_make_request import _make_duffel_request
from agent.travel_provider import ACTIVE_TRAVEL_PROVIDER

def _safe_json_loads(raw: str) -> Dict[str, Any]:
    try:
        data = json.loads(raw) if raw else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}

@tool
def destination_recommendation_extract_context(
    payload_json: Optional[str] = "",
) -> Dict[str, Any]:
    """
    Parses the provided user payload to extract relevant context for destination recommendations.
    
    Includes: user_id, user_name, location (lat, lon, city, country, iata_code), and preferences.
    """
    payload = _safe_json_loads(payload_json or "")
    user_data = payload.get("user_data") or {}
    location = user_data.get("location") or {}
    
    return {
        "user_id": payload.get("user_id", ""),
        "user_name": payload.get("user_name", ""),
        "location": {
            "lat": location.get("lat"),
            "lon": location.get("lon"),
            "city": location.get("city"),
            "country": location.get("country"),
            "iata_code": location.get("iata_code") or location.get("airport_code")
        },
        "preferences": user_data.get("preferences", {}),
        "exclude_destinations_last_3_days": payload.get("exclude_destinations_last_3_days") or [],
    }

@tool
def amadeus_predict_trip_purpose(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    return_date: str,
) -> Dict[str, Any]:
    """
    Predicts the purpose of a trip (Business or Leisure) using Amadeus Trip Purpose Prediction API.
    
    Parameters:
    - origin_location_code: IATA code for departure city/airport.
    - destination_location_code: IATA code for arrival city/airport.
    - departure_date: YYYY-MM-DD.
    - return_date: YYYY-MM-DD.
    """
    try:
        params = {
            "originLocationCode": origin_location_code.upper(),
            "destinationLocationCode": destination_location_code.upper(),
            "departureDate": departure_date,
            "returnDate": return_date,
        }
        return _make_amadeus_request("GET", "/v1/travel/predictions/trip-purpose", params=params)
    except Exception as exc:
        return {"error": str(exc)}

@tool
def amadeus_fetch_recommended_locations(
    city_codes: str,
    traveler_country_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetches recommended travel destinations based on a base city or list of cities.
    
    Parameters:
    - city_codes: Comma-separated IATA city codes (e.g., "PAR,LON").
    - traveler_country_code: Optional ISO country code of the traveler.
    """
    try:
        params = {
            "cityCodes": city_codes.upper(),
        }
        if traveler_country_code:
            params["travelerCountryCode"] = traveler_country_code.upper()
            
        return _make_amadeus_request("GET", "/v1/reference-data/recommended-locations", params=params)
    except Exception as exc:
        return {"error": str(exc)}


@tool
def duffel_fetch_place_suggestions(
    queries_json: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_meters: int = 500000,
) -> Dict[str, Any]:
    """
    Fetch up to five Duffel place suggestions.

    Duffel does not expose an Amadeus-style personalized destination
    recommendation endpoint. For Duffel, the LLM must provide exactly five
    destination search queries in queries_json, e.g. ["Paris", "Zanzibar",
    "Cape Town", "Dubai", "Rome"]. The tool searches Duffel Places and
    returns one unique city/airport result per query where possible.
    """
    try:
        raw_queries = json.loads(queries_json or "[]")
        queries = [str(q).strip() for q in raw_queries if str(q).strip()]
    except Exception:
        queries = []

    queries = queries[:5]
    if not queries and lat is not None and lng is not None:
        params = {"lat": str(lat), "lng": str(lng), "rad": str(radius_meters)}
        result = _make_duffel_request("GET", "/places/suggestions", params=params)
        return {
            "provider": "duffel",
            "mode": "nearby",
            "places": _normalize_duffel_places(result.get("data", []), limit=5),
            "raw": result,
        }

    places: List[Dict[str, Any]] = []
    seen: set[str] = set()
    raw_results: List[Dict[str, Any]] = []

    for query in queries:
        params: Dict[str, Any] = {"query": query}
        if lat is not None and lng is not None:
            params.update({"lat": str(lat), "lng": str(lng), "rad": str(radius_meters)})
        result = _make_duffel_request("GET", "/places/suggestions", params=params)
        raw_results.append({"query": query, "response": result})

        for place in _normalize_duffel_places(result.get("data", []), limit=5):
            key = place.get("iata_code") or place.get("id") or place.get("name")
            if not key or key in seen:
                continue
            seen.add(key)
            places.append({**place, "query": query})
            break

        if len(places) >= 5:
            break

    return {
        "provider": "duffel",
        "mode": "query_suggestions",
        "places": places[:5],
        "raw": raw_results,
    }


@tool
def provider_fetch_recommended_locations(
    city_codes: Optional[str] = None,
    traveler_country_code: Optional[str] = None,
    queries_json: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_meters: int = 500000,
) -> Dict[str, Any]:
    """
    Fetch destination candidates using the active travel provider.

    - Amadeus: uses recommended-locations with city_codes.
    - Duffel: uses Places suggestions with five LLM-provided queries.
    """
    if ACTIVE_TRAVEL_PROVIDER == "duffel":
        return duffel_fetch_place_suggestions.invoke({
            "queries_json": queries_json or "[]",
            "lat": lat,
            "lng": lng,
            "radius_meters": radius_meters,
        })

    if not city_codes:
        return {"error": "city_codes is required for Amadeus destination recommendations", "provider": "amadeus"}
    result = amadeus_fetch_recommended_locations.invoke({
        "city_codes": city_codes,
        "traveler_country_code": traveler_country_code,
    })
    if isinstance(result, dict):
        result.setdefault("provider", "amadeus")
    return result


def _normalize_duffel_places(raw_places: Any, limit: int = 5) -> List[Dict[str, Any]]:
    if not isinstance(raw_places, list):
        return []
    normalized: List[Dict[str, Any]] = []
    for place in raw_places:
        if not isinstance(place, dict):
            continue
        city = place.get("city") if isinstance(place.get("city"), dict) else None
        normalized.append({
            "id": place.get("id"),
            "type": place.get("type"),
            "name": city.get("name") if city and place.get("type") == "airport" else place.get("name"),
            "airport_name": place.get("name") if place.get("type") == "airport" else None,
            "iata_code": place.get("iata_code"),
            "iata_city_code": place.get("iata_city_code") or (city or {}).get("iata_code"),
            "country_code": place.get("iata_country_code") or (city or {}).get("iata_country_code"),
            "latitude": place.get("latitude"),
            "longitude": place.get("longitude"),
            "time_zone": place.get("time_zone"),
        })
        if len(normalized) >= limit:
            break
    return normalized

__all__ = [
    "destination_recommendation_extract_context",
    "amadeus_predict_trip_purpose",
    "amadeus_fetch_recommended_locations",
    "duffel_fetch_place_suggestions",
    "provider_fetch_recommended_locations",
]
