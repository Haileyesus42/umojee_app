# agent/update_journey/update_journey_tools.py
"""
CRUD tools for managing journey data.

These tools allow the Update Journey Agent to read and modify existing journeys
via the JourneyStateManager and mongo_repo.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


def _get_state_manager():
    """Get the shared JourneyStateManager reference from the journey orchestrator."""
    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        return _state_manager_ref
    except ImportError:
        return None


# ---------------------------------------------------------------------------
# READ tools
# ---------------------------------------------------------------------------

@tool
def get_journey_details(journey_id: str) -> Dict[str, Any]:
    """
    Retrieve the full details of a journey by its ID.

    Returns the journey status, context (destination, dates, budget, travelers),
    current segment, saved/booked flights, saved/booked hotels, saved/booked cars,
    and timestamps.

    Args:
        journey_id: The journey ID to retrieve.
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    sm = _get_state_manager()
    if not sm:
        return {"error": "Journey state manager is not initialized.", "status": "failed"}

    try:
        journey = sm.get_journey(journey_id)
        if not journey:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        ctx = journey.context
        return {
            "status": "success",
            "journey": {
                "journey_id": journey.journey_id,
                "user_id": journey.user_id,
                "status": journey.status.value if hasattr(journey.status, "value") else str(journey.status),
                "current_segment": (
                    journey.current_segment.value
                    if hasattr(journey.current_segment, "value")
                    else str(journey.current_segment)
                ),
                "context": {
                    "planned_destination": ctx.planned_destination,
                    "departure_city": ctx.departure_city,
                    "departure_airport_code": ctx.departure_airport_code,
                    "destination_airport_code": ctx.destination_airport_code,
                    "planned_departure_date": ctx.planned_departure_date,
                    "duration_days": ctx.duration_days,
                    "travelers_count": ctx.travelers_count,
                    "budget": ctx.budget,
                    "budget_comfort": (
                        ctx.budget_comfort.value
                        if hasattr(ctx.budget_comfort, "value")
                        else str(ctx.budget_comfort)
                    ),
                },
                "saved_flights": journey.saved_flights or [],
                "saved_hotels": journey.saved_hotels or [],
                "saved_cars": getattr(journey, "saved_cars", []) or [],
                "booked_flights": journey.booked_flights or [],
                "booked_hotels": getattr(journey, "booked_hotels", []) or [],
                "booked_cars": getattr(journey, "booked_cars", []) or [],
                "is_active": getattr(journey, "is_active", False),
                "created_at": journey.created_at.isoformat() if journey.created_at else None,
                "updated_at": journey.updated_at.isoformat() if journey.updated_at else None,
            },
        }
    except Exception as exc:
        logger.error("get_journey_details error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def list_user_journeys(user_id: str, limit: int = 10) -> Dict[str, Any]:
    """
    List all journeys for a user, sorted by most recently updated.

    Args:
        user_id: The user ID whose journeys to list.
        limit: Maximum number of journeys to return (default 10).
    """
    if not user_id:
        return {"error": "user_id is required.", "status": "failed"}

    try:
        from server import mongo_repo

        journeys = mongo_repo.list_journeys_for_user(user_id, limit=limit)
        result = []
        for j in journeys:
            ctx = j.get("context") or {}
            result.append({
                "journey_id": str(j.get("_id", "")),
                "status": j.get("status", "unknown"),
                "current_segment": j.get("current_segment", "unknown"),
                "destination": ctx.get("planned_destination"),
                "departure_date": ctx.get("planned_departure_date"),
                "travelers_count": ctx.get("travelers_count"),
                "is_active": j.get("is_active", False),
                "updated_at": str(j.get("updated_at", "")),
            })

        return {"status": "success", "count": len(result), "journeys": result}
    except Exception as exc:
        logger.error("list_user_journeys error: %s", exc)
        return {"error": str(exc), "status": "failed"}


# ---------------------------------------------------------------------------
# UPDATE tools
# ---------------------------------------------------------------------------

@tool
def update_journey_preferences(
    journey_id: str,
    planned_destination: Optional[str] = None,
    departure_city: Optional[str] = None,
    departure_airport_code: Optional[str] = None,
    destination_airport_code: Optional[str] = None,
    planned_departure_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    travelers_count: Optional[int] = None,
    budget: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update travel preferences for an existing journey.

    All fields are optional — only the fields you provide will be updated.

    Args:
        journey_id: The journey ID to update.
        planned_destination: Destination city/country name (e.g. "Paris, France").
        departure_city: City of departure (e.g. "Nairobi").
        departure_airport_code: IATA code for departure airport (e.g. "NBO").
        destination_airport_code: IATA code for destination airport (e.g. "CDG").
        planned_departure_date: ISO date string for departure (e.g. "2026-04-10").
        duration_days: Number of days for the trip.
        travelers_count: Number of travelers.
        budget: Budget as a JSON string (e.g. '{"amount": 2000, "currency": "USD"}')
                or a plain text description (e.g. "mid-range").
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    sm = _get_state_manager()
    if not sm:
        return {"error": "Journey state manager is not initialized.", "status": "failed"}

    updates: Dict[str, Any] = {}
    if planned_destination is not None:
        updates["planned_destination"] = planned_destination
    if departure_city is not None:
        updates["departure_city"] = departure_city
    if departure_airport_code is not None:
        updates["departure_airport_code"] = departure_airport_code.upper()
    if destination_airport_code is not None:
        updates["destination_airport_code"] = destination_airport_code.upper()
    if planned_departure_date is not None:
        updates["planned_departure_date"] = planned_departure_date
    if duration_days is not None:
        updates["duration_days"] = int(duration_days)
    if travelers_count is not None:
        updates["travelers_count"] = int(travelers_count)
    if budget is not None:
        if isinstance(budget, str):
            try:
                updates["budget"] = json.loads(budget)
            except json.JSONDecodeError:
                updates["budget"] = {"description": budget}
        else:
            updates["budget"] = budget

    if not updates:
        return {"error": "No preference fields were provided to update.", "status": "failed"}

    try:
        result = sm.update_context(journey_id, updates)
        if result is None:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        return {
            "status": "success",
            "message": "Journey preferences updated successfully.",
            "updated_fields": list(updates.keys()),
            "journey_id": journey_id,
        }
    except Exception as exc:
        logger.error("update_journey_preferences error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def update_journey_status(journey_id: str, status: str) -> Dict[str, Any]:
    """
    Update the lifecycle status of a journey.

    Args:
        journey_id: The journey ID to update.
        status: New status — one of: "planning", "in_progress", "completed", "cancelled".
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    valid_statuses = {"planning", "in_progress", "completed", "cancelled"}
    if status not in valid_statuses:
        return {
            "error": f"Invalid status '{status}'. Must be one of: {', '.join(sorted(valid_statuses))}.",
            "status": "failed",
        }

    sm = _get_state_manager()
    if not sm:
        return {"error": "Journey state manager is not initialized.", "status": "failed"}

    try:
        result = sm.update_journey(journey_id, {"status": status})
        if result is None:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        return {
            "status": "success",
            "message": f"Journey status updated to '{status}'.",
            "journey_id": journey_id,
            "new_status": status,
        }
    except Exception as exc:
        logger.error("update_journey_status error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def transition_journey_segment(
    journey_id: str,
    from_segment: str,
    to_segment: str,
) -> Dict[str, Any]:
    """
    Transition a journey from one phase/segment to the next.

    Valid segment values (in typical journey order):
    - "inspiration"         — Initial trip planning / dreaming phase
    - "home_to_airport"     — Traveling from home to departure airport
    - "airport_to_flight"   — At the airport, boarding phase
    - "flight_to_hotel"     — In-flight, heading to hotel check-in
    - "hotel_to_activities" — At destination, exploring activities
    - "return"              — Heading back home

    Args:
        journey_id: The journey ID to transition.
        from_segment: The current segment to complete (e.g. "inspiration").
        to_segment: The target segment to activate (e.g. "home_to_airport").
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    try:
        from agent.journey.phase_1_foundation.journey_models import JourneySegment

        valid = [s.value for s in JourneySegment]

        try:
            from_seg = JourneySegment(from_segment)
        except ValueError:
            return {"error": f"Invalid from_segment '{from_segment}'. Valid values: {valid}", "status": "failed"}

        try:
            to_seg = JourneySegment(to_segment)
        except ValueError:
            return {"error": f"Invalid to_segment '{to_segment}'. Valid values: {valid}", "status": "failed"}

        sm = _get_state_manager()
        if not sm:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}

        success = sm.transition_segment(journey_id, from_seg, to_seg)
        if not success:
            return {
                "error": (
                    f"Segment transition failed. Journey '{journey_id}' may not exist "
                    "or one of the segments is invalid."
                ),
                "status": "failed",
            }

        return {
            "status": "success",
            "message": f"Journey transitioned from '{from_segment}' to '{to_segment}'.",
            "journey_id": journey_id,
            "from_segment": from_segment,
            "to_segment": to_segment,
        }
    except Exception as exc:
        logger.error("transition_journey_segment error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def manage_saved_flights(
    journey_id: str,
    action: str,
    flights: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Manage the saved flights on a journey.

    Use action="clear" to remove all saved flights, or action="replace" to
    overwrite the saved flights list with a new set.

    Args:
        journey_id: The journey ID.
        action: "clear" to remove all saved flights, or "replace" to set new ones.
        flights: JSON array string of flight objects — required only when action="replace".
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    valid_actions = {"clear", "replace"}
    if action not in valid_actions:
        return {
            "error": f"Invalid action '{action}'. Must be one of: {', '.join(valid_actions)}.",
            "status": "failed",
        }

    sm = _get_state_manager()
    if not sm:
        return {"error": "Journey state manager is not initialized.", "status": "failed"}

    try:
        if action == "clear":
            result = sm.update_journey(journey_id, {"saved_flights": []})
            if result is None:
                return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}
            return {
                "status": "success",
                "message": "Saved flights cleared.",
                "journey_id": journey_id,
            }

        # action == "replace"
        if not flights:
            return {"error": "flights argument is required for action='replace'.", "status": "failed"}

        if isinstance(flights, str):
            try:
                flights_list = json.loads(flights)
            except json.JSONDecodeError:
                return {"error": "flights must be a valid JSON array string.", "status": "failed"}
        else:
            flights_list = flights

        if not isinstance(flights_list, list):
            return {"error": "flights must be a list.", "status": "failed"}

        result = sm.update_journey(journey_id, {"saved_flights": flights_list})
        if result is None:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        return {
            "status": "success",
            "message": f"Saved flights replaced with {len(flights_list)} flight(s).",
            "journey_id": journey_id,
            "flight_count": len(flights_list),
        }
    except Exception as exc:
        logger.error("manage_saved_flights error: %s", exc)
        return {"error": str(exc), "status": "failed"}


# ---------------------------------------------------------------------------
# LIFECYCLE / ADMIN tools
# ---------------------------------------------------------------------------

@tool
def set_active_journey(journey_id: str, user_id: str) -> Dict[str, Any]:
    """
    Mark a specific journey as the user's active journey, deactivating any others.

    Args:
        journey_id: The journey ID to set as active.
        user_id: The user ID who owns this journey.
    """
    if not journey_id or not user_id:
        return {"error": "Both journey_id and user_id are required.", "status": "failed"}

    try:
        from server import mongo_repo

        result = mongo_repo.set_active_journey(journey_id, user_id)
        if result is None:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        return {
            "status": "success",
            "message": f"Journey '{journey_id}' is now the active journey.",
            "journey_id": journey_id,
        }
    except Exception as exc:
        logger.error("set_active_journey error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def archive_journey(journey_id: str) -> Dict[str, Any]:
    """
    Soft-archive a journey (marks it as archived and cancelled without permanent deletion).
    The journey data is preserved and can still be retrieved.

    Args:
        journey_id: The journey ID to archive.
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    try:
        from server import mongo_repo

        success = mongo_repo.archive_journey(journey_id)
        if not success:
            return {
                "error": f"Journey '{journey_id}' not found or already archived.",
                "status": "failed",
            }

        return {
            "status": "success",
            "message": f"Journey '{journey_id}' has been archived.",
            "journey_id": journey_id,
        }
    except Exception as exc:
        logger.error("archive_journey error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def cancel_journey(journey_id: str) -> Dict[str, Any]:
    """
    Cancel an active journey. The journey remains accessible but is marked as cancelled.

    Args:
        journey_id: The journey ID to cancel.
    """
    if not journey_id:
        return {"error": "journey_id is required.", "status": "failed"}

    try:
        from server import mongo_repo

        result = mongo_repo.cancel_journey(journey_id)
        if result is None:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        return {
            "status": "success",
            "message": f"Journey '{journey_id}' has been cancelled.",
            "journey_id": journey_id,
        }
    except Exception as exc:
        logger.error("cancel_journey error: %s", exc)
        return {"error": str(exc), "status": "failed"}


# ---------------------------------------------------------------------------
# RESOLUTION tools — used when no journey_id is present in context
# ---------------------------------------------------------------------------

@tool
def find_journey_by_context(
    user_id: str,
    destination: Optional[str] = None,
    departure_date: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Find journeys for a user by fuzzy-matching context clues (destination, date).

    Use this when no journey_id is available and the user mentions clues such as
    "my trip to Dubai" or "the journey I had in April". Scores and ranks matches.

    Args:
        user_id: The user ID to search journeys for.
        destination: Destination hint (e.g. "Dubai", "Paris"). Case-insensitive substring match.
        departure_date: Date hint in any prefix format (e.g. "2026-04", "2026"). Matched against
                        planned_departure_date.
        status_filter: Optional — filter by status: "planning", "in_progress", "completed",
                       "cancelled". If omitted, all statuses are searched.
    """
    if not user_id:
        return {"error": "user_id is required.", "status": "failed"}

    try:
        from server import mongo_repo

        journeys = mongo_repo.list_journeys_for_user(user_id, limit=50)

        scored: List[Dict[str, Any]] = []
        for j in journeys:
            ctx = j.get("context") or {}
            j_status = j.get("status", "")

            # Apply status filter if provided
            if status_filter and j_status != status_filter:
                continue

            score = 0

            # Destination match
            j_dest = (ctx.get("planned_destination") or "").lower()
            if destination and destination.lower() in j_dest:
                score += 2
            elif destination and j_dest and any(
                word in j_dest for word in destination.lower().split()
            ):
                score += 1

            # Date match
            j_date = ctx.get("planned_departure_date") or ""
            if departure_date and j_date.startswith(departure_date):
                score += 2

            # If no hints given, return everything (score = 0 allowed)
            if not destination and not departure_date:
                score = 1  # neutral — include all

            if score > 0:
                scored.append({
                    "score": score,
                    "journey_id": str(j.get("_id", "")),
                    "status": j_status,
                    "current_segment": j.get("current_segment", "unknown"),
                    "destination": ctx.get("planned_destination"),
                    "departure_date": ctx.get("planned_departure_date"),
                    "travelers_count": ctx.get("travelers_count"),
                    "is_active": j.get("is_active", False),
                    "updated_at": str(j.get("updated_at", "")),
                })

        scored.sort(key=lambda x: x["score"], reverse=True)

        # Build a suggestion message for the agent
        if len(scored) == 1:
            suggestion = "single_match"
        elif len(scored) > 1:
            suggestion = "multiple_matches"
        else:
            suggestion = "no_match"

        return {
            "status": "success",
            "match_count": len(scored),
            "suggestion": suggestion,
            "matches": scored,
        }
    except Exception as exc:
        logger.error("find_journey_by_context error: %s", exc)
        return {"error": str(exc), "status": "failed"}


@tool
def create_journey_for_user(
    user_id: str,
    intent: str,
    destination: Optional[str] = None,
    departure_city: Optional[str] = None,
    departure_airport_code: Optional[str] = None,
    destination_airport_code: Optional[str] = None,
    travelers_count: Optional[int] = None,
    departure_date: Optional[str] = None,
    duration_days: Optional[int] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    currency: Optional[str] = "USD",
) -> Dict[str, Any]:
    """
    Create a new journey for the user with the provided context, then set it as active.

    Only user_id and intent are required. All other fields are optional but improve
    the journey's initial context.

    Args:
        user_id: The user ID who owns the journey.
        intent: A short description of the trip (e.g. "Trip to Dubai in summer").
        destination: Destination city or country name (e.g. "Dubai").
        departure_city: City of departure (e.g. "Nairobi").
        departure_airport_code: IATA code for departure airport (e.g. "NBO").
        destination_airport_code: IATA code for destination airport (e.g. "DXB").
        travelers_count: Number of travelers.
        departure_date: ISO date string for departure (e.g. "2026-06-15").
        duration_days: Number of days for the trip.
        budget_min: Minimum budget amount.
        budget_max: Maximum budget amount.
        currency: Budget currency code (default "USD").
    """
    if not user_id:
        return {"error": "user_id is required.", "status": "failed"}
    if not intent:
        return {"error": "intent is required — provide a short trip description.", "status": "failed"}

    sm = _get_state_manager()
    if not sm:
        return {"error": "Journey state manager is not initialized.", "status": "failed"}

    try:
        from agent.journey.phase_1_foundation.journey_models import JourneyContext

        # Build initial context from provided fields (mirrors routes.py create_new_journey)
        ctx_kwargs: Dict[str, Any] = {}
        if destination:
            ctx_kwargs["planned_destination"] = destination
        if departure_city:
            ctx_kwargs["departure_city"] = departure_city
        if departure_airport_code:
            ctx_kwargs["departure_airport_code"] = departure_airport_code.upper()
        if destination_airport_code:
            ctx_kwargs["destination_airport_code"] = destination_airport_code.upper()
        if travelers_count is not None:
            ctx_kwargs["travelers_count"] = int(travelers_count)
        if departure_date:
            ctx_kwargs["planned_departure_date"] = departure_date
        if duration_days is not None:
            ctx_kwargs["duration_days"] = int(duration_days)
        if budget_min is not None or budget_max is not None:
            ctx_kwargs["budget"] = {
                "min": budget_min,
                "max": budget_max,
                "currency": currency or "USD",
            }

        initial_context = JourneyContext(**ctx_kwargs) if ctx_kwargs else None

        # Create the journey via state manager
        journey = sm.initialize_journey(user_id=user_id, initial_context=initial_context)
        journey_id = journey.journey_id

        # Set as the user's active journey
        try:
            from server import mongo_repo
            mongo_repo.set_active_journey(journey_id, user_id)
        except Exception as e:
            logger.warning("Could not set active journey after creation: %s", e)

        return {
            "status": "success",
            "message": (
                f"New journey created successfully for '{intent}'."
                + (f" Destination: {destination}." if destination else "")
            ),
            "journey_id": journey_id,
            "current_segment": (
                journey.current_segment.value
                if hasattr(journey.current_segment, "value")
                else str(journey.current_segment)
            ),
            "journey_status": (
                journey.status.value if hasattr(journey.status, "value") else str(journey.status)
            ),
        }
    except Exception as exc:
        logger.error("create_journey_for_user error: %s", exc)
        return {"error": str(exc), "status": "failed"}
