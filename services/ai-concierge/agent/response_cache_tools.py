"""
LangChain Tools for Response Cache Access

Agents can use these tools to check for cached API responses before making
expensive API calls.
"""

from langchain_core.tools import tool
from typing import Optional
from agent.response_cache import (
    get_cached_response,
    list_cached_responses,
    cache_response,
)


@tool
def check_cached_api_response(
    conversation_id: str,
    operation: str,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    checkin: Optional[str] = None,
    checkout: Optional[str] = None,
) -> dict:
    """
    Check if there's a cached API response that matches your query.

    CRITICAL: ALWAYS call this tool BEFORE making Amadeus API calls (flights, hotels, cars).
    If cached data exists, use it instead of calling the API again.

    Args:
        conversation_id: Current conversation ID (get from context)
        operation: Type of search ("flight_search", "hotel_search", "car_search")
        origin: Origin airport code (for flights)
        destination: Destination city/airport code
        date: Travel date (for flights/cars, format: YYYY-MM-DD)
        checkin: Check-in date (for hotels, format: YYYY-MM-DD)
        checkout: Check-out date (for hotels, format: YYYY-MM-DD)

    Returns:
        dict with:
        - cached: True if data found, False otherwise
        - data: Cached API response (if found)
        - message: Human-readable message

    Examples:
        # Check for cached flight search
        check_cached_api_response(
            conversation_id="abc123",
            operation="flight_search",
            origin="JFK",
            destination="CDG",
            date="2026-01-25"
        )

        # Check for cached hotel search
        check_cached_api_response(
            conversation_id="abc123",
            operation="hotel_search",
            destination="Paris",
            checkin="2026-01-25",
            checkout="2026-01-28"
        )
    """
    # Build query params
    params = {}
    if origin:
        params["origin"] = origin
    if destination:
        params["destination"] = destination
    if date:
        params["date"] = date
    if checkin:
        params["checkin"] = checkin
    if checkout:
        params["checkout"] = checkout

    # Try to get cached response
    cached_data = get_cached_response(conversation_id, operation, params)

    if cached_data:
        return {
            "cached": True,
            "data": cached_data,
            "message": f"Found cached {operation} data. Use this instead of calling API.",
        }
    else:
        return {
            "cached": False,
            "data": None,
            "message": f"No cached {operation} data found. You need to call the API.",
        }


@tool
def list_available_cached_data(conversation_id: str) -> dict:
    """
    List all cached API responses available for this conversation.

    Use this to see what data is already available without making API calls.

    Args:
        conversation_id: Current conversation ID

    Returns:
        dict with:
        - count: Number of cached entries
        - entries: List of cached operations with metadata
        - message: Human-readable summary

    Example:
        list_available_cached_data(conversation_id="abc123")
        → Shows: "2 cached responses: flight_search (JFK→CDG), hotel_search (Paris)"
    """
    entries = list_cached_responses(conversation_id)

    if not entries:
        return {
            "count": 0,
            "entries": [],
            "message": "No cached data available. Need to make API calls.",
        }

    # Build human-readable summary
    summary_parts = []
    for entry in entries:
        operation = entry.get("operation", "unknown")
        params = entry.get("query_params", {})

        # Format params nicely
        if operation == "flight_search":
            origin = params.get("origin", "?")
            dest = params.get("destination", "?")
            summary_parts.append(f"flight_search ({origin}→{dest})")
        elif operation == "hotel_search":
            dest = params.get("destination", "?")
            summary_parts.append(f"hotel_search ({dest})")
        elif operation == "car_search":
            dest = params.get("destination", "?")
            summary_parts.append(f"car_search ({dest})")
        else:
            summary_parts.append(operation)

    summary = f"{len(entries)} cached responses: {', '.join(summary_parts)}"

    return {
        "count": len(entries),
        "entries": entries,
        "message": summary,
    }


# Export tools for LangChain agent use
__all__ = [
    "check_cached_api_response",
    "list_available_cached_data",
]
