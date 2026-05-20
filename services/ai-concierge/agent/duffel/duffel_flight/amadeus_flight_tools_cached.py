"""
Enhanced Amadeus Flight Tools with Response Caching

This is an EXAMPLE showing how to add caching to Amadeus API tools.
The pattern can be applied to ALL Amadeus tools (hotels, cars, etc.).

Key Changes:
1. Added conversation_id parameter to tools
2. Check cache BEFORE calling API
3. Store response in cache AFTER API call
4. Return cached data when available

Usage Pattern:
--------------
1. Agent calls check_cached_api_response() tool first
2. If cached data exists, agent uses it directly
3. If no cache, agent calls this tool (which caches the result)
4. Next time, cache hit!
"""

import os
import time
from typing import Any, Dict, Optional

import requests
from langchain_core.tools import tool
from agent.amadeus.amadeus_make_request import _make_amadeus_request
from agent.response_cache import cache_response, get_cached_response


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


@tool
def amadeus_search_flight_offers_cached(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    conversation_id: str,  # NEW: Required for caching
    adults: int = 1,
    currency_code: str = "USD",
    return_date: Optional[str] = None,
    max_results: int = 5,
) -> Dict[str, Any]:
    """
    Discover live-sellable flight offers through the Amadeus Shopping API (WITH CACHING).

    IMPORTANT: This tool automatically caches results. On subsequent calls with the same
    parameters, cached data is returned instantly without calling the API.

    Required traveler inputs:
    - origin_location_code: IATA code for the departure airport (e.g., "JFK")
    - destination_location_code: IATA code for the arrival airport (e.g., "CDG")
    - departure_date: Travel date in YYYY-MM-DD format
    - conversation_id: Current conversation ID (REQUIRED for caching)

    Optional enrichments:
    - return_date: Return date in YYYY-MM-DD for round-trip searches
    - adults: Number of adult passengers
    - currency_code: ISO currency for fare presentation (default USD)
    - max_results: Cap the number of offers returned (default 5)

    Returns:
        Flight offers from Amadeus API (or cache if available)
    """
    # Build cache key params (normalized for matching)
    cache_params = {
        "origin": origin_location_code.upper(),
        "destination": destination_location_code.upper(),
        "departure_date": departure_date,
        "adults": adults,
        "return_date": return_date,
    }

    # Check cache FIRST
    cached_result = get_cached_response(conversation_id, "flight_search", cache_params)
    if cached_result:
        # Add cache indicator to response
        if isinstance(cached_result, dict):
            cached_result["_from_cache"] = True
        return cached_result

    # Cache miss - call API
    try:
        params: Dict[str, Any] = {
            "originLocationCode": origin_location_code,
            "destinationLocationCode": destination_location_code,
            "departureDate": departure_date,
            "adults": adults,
            "currencyCode": currency_code,
            "max": max_results,
        }
        if return_date:
            params["returnDate"] = return_date

        result = _amadeus_with_retries(
            "GET",
            "/v2/shopping/flight-offers",
            params=params,
        )

        # Cache the result (if successful)
        if result and not result.get("error"):
            cache_response(conversation_id, "flight_search", result, cache_params)

        return result

    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error searching flight offers", "details": str(exc)}


@tool
def amadeus_price_flight_offer_cached(
    request_body: Dict[str, Any],
    conversation_id: str,  # NEW: Required for caching
) -> Dict[str, Any]:
    """
    Reprice a selected flight offer to certify fare and seat availability (WITH CACHING).

    IMPORTANT: Pricing results are cached for a short time (1 hour). This helps when
    users compare multiple options without re-pricing each time.

    Required payload structure:
    - request_body: Dictionary matching the Amadeus Flight Offers Pricing schema
    - conversation_id: Current conversation ID (REQUIRED for caching)

    Returns:
        Amadeus pricing response (or cache if available)
    """
    # For pricing, we cache based on flight offer ID
    flight_offer_id = None
    try:
        if "data" in request_body and "flightOffers" in request_body["data"]:
            offers = request_body["data"]["flightOffers"]
            if offers and len(offers) > 0:
                flight_offer_id = offers[0].get("id")
    except Exception:
        pass

    cache_params = {"flight_offer_id": flight_offer_id} if flight_offer_id else {}

    # Check cache FIRST
    if flight_offer_id:
        cached_result = get_cached_response(
            conversation_id, "flight_pricing", cache_params
        )
        if cached_result:
            if isinstance(cached_result, dict):
                cached_result["_from_cache"] = True
            return cached_result

    # Cache miss - call API
    try:
        result = _amadeus_with_retries(
            "POST",
            "/v1/shopping/flight-offers/pricing",
            json_body=request_body,
        )

        # Cache the result (if successful)
        if result and not result.get("error") and flight_offer_id:
            cache_response(
                conversation_id, "flight_pricing", result, cache_params
            )

        return result

    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error pricing flight offer", "details": str(exc)}


# Example: How to add caching to ANY Amadeus tool
def add_caching_to_tool_pattern():
    """
    PATTERN for adding caching to any Amadeus tool:

    1. Add conversation_id parameter to tool signature
    2. Build cache_params dict (query parameters that make request unique)
    3. Check cache FIRST: get_cached_response(conversation_id, operation, cache_params)
    4. If cache hit: return cached data
    5. If cache miss: call API
    6. Store result: cache_response(conversation_id, operation, result, cache_params)
    7. Return result

    Template:
    ---------
    @tool
    def my_amadeus_tool(..., conversation_id: str):
        # 1. Build cache params
        cache_params = {"param1": value1, "param2": value2}

        # 2. Check cache
        cached = get_cached_response(conversation_id, "operation_name", cache_params)
        if cached:
            return cached

        # 3. Call API
        result = call_amadeus_api(...)

        # 4. Cache result
        if result and not result.get("error"):
            cache_response(conversation_id, "operation_name", result, cache_params)

        # 5. Return
        return result
    """
    pass


__all__ = [
    "amadeus_search_flight_offers_cached",
    "amadeus_price_flight_offer_cached",
]
