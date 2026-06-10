import os
import time
from typing import Any, Dict, Optional

import requests
from langchain_core.tools import tool

AMADEUS_API_URL = os.getenv("AMADEUS_API_URL", "https://test.api.amadeus.com")
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")

_token_cache: Dict[str, Any] = {"access_token": None, "expires_at": 0}


def _clear_token_cache() -> None:
    """Clear the in-memory Amadeus access token cache."""
    _token_cache["access_token"] = None
    _token_cache["expires_at"] = 0


def _get_access_token() -> str:
    """Retrieve and cache the Amadeus OAuth token."""
    if not AMADEUS_CLIENT_ID or not AMADEUS_CLIENT_SECRET:
        raise ValueError("Amadeus credentials are missing in environment variables.")

    now = time.time()
    cached_token = _token_cache.get("access_token")
    expires_at = _token_cache.get("expires_at", 0)

    if cached_token and now < expires_at - 60:
        print("Using cached Amadeus access token.")
        return cached_token

    token_url = f"{AMADEUS_API_URL}/v1/security/oauth2/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": AMADEUS_CLIENT_ID,
        "client_secret": AMADEUS_CLIENT_SECRET,
    }

    response = requests.post(
        token_url,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    response.raise_for_status()
    token_data = response.json()

    access_token = token_data.get("access_token")
    print("Fetched new Amadeus access token.")
    if not access_token:
        raise ValueError("Amadeus token response did not include access_token.")

    expires_in = int(token_data.get("expires_in", 0))
    _token_cache["access_token"] = access_token
    _token_cache["expires_at"] = now + expires_in

    return access_token


def _make_amadeus_request(
    method: str,
    endpoint: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Helper to send authenticated requests to Amadeus."""
    url = f"{AMADEUS_API_URL}{endpoint}"

    for attempt in range(2):
        access_token = _get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        response = requests.request(method, url, params=params, json=json, headers=headers)
        if response.status_code != 401:
            response.raise_for_status()
            print(f"Request to {url} succeeded with status {response.status_code}.")
            return response.json()

        if attempt == 0:
            print(f"Amadeus returned 401 for {url}. Clearing cached token and retrying once.")
            _clear_token_cache()
            continue

        response.raise_for_status()

    raise RuntimeError("Amadeus request retry loop exited unexpectedly.")


@tool
def amadeus_search_flight_offers(
    origin_location_code: str,
    destination_location_code: str,
    departure_date: str,
    adults: int = 1,
    currency_code: str = "USD",
    return_date: Optional[str] = None,
    max_results: int = 5,
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

    Returns the raw Amadeus response payload; propagate API errors transparently.
    """
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

        return _make_amadeus_request(
            "GET",
            "/v2/shopping/flight-offers",
            params=params,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error searching flight offers", "details": str(exc)}


@tool
def amadeus_price_flight_offer(request_body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reprice a selected flight offer to certify fare and seat availability.

    Required payload structure:
    - request_body: Dictionary matching the Amadeus Flight Offers Pricing schema.
      Common fields include `data.type`, `data.flightOffers` from search results,
      and optional `data.travelers` details.

    Returns the Amadeus pricing response; bubble up any API faults verbatim.
    """
    try:
        return _make_amadeus_request(
            "POST",
            "/v1/shopping/flight-offers/pricing",
            json=request_body,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error pricing flight offer", "details": str(exc)}


@tool
def amadeus_create_flight_order(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Finalize a reservation by creating an Amadeus flight order.

    Required payload structure:
    - order_payload: Dictionary aligned with the Amadeus Flight Orders schema.
      Include the priced offer(s), traveler profiles, and contact channels.

    Returns the booking confirmation payload; expose Amadeus errors without alteration.
    """
    try:
        return _make_amadeus_request(
            "POST",
            "/v1/booking/flight-orders",
            json=order_payload,
        )
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
