"""
Time-based trigger loop: get_ready, time_to_leave, boarding_opens, checkout.

Implements TRIGGER_RULES_SEGMENTS_PHASES.md §4.2:
- Backend cron/worker every 1–5 min loads active journeys and checks timeline.
- Fires notifications when now >= threshold and not already sent (idempotency).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .phase_1_foundation import JourneySegment, JourneyStatus

logger = logging.getLogger(__name__)


async def time_trigger_loop(
    state_manager: Any,
    ws_manager: Any,
    interval_seconds: int = 60,
) -> None:
    """
    Background loop that evaluates time-based triggers for all active journeys.
    Runs every interval_seconds (default 60s).
    """
    logger.info("Time trigger loop started")
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await _evaluate_time_triggers(state_manager, ws_manager)
        except asyncio.CancelledError:
            logger.info("Time trigger loop cancelled")
            break
        except Exception as e:
            logger.error(f"Time trigger loop error: {e}")


async def _evaluate_time_triggers(state_manager: Any, ws_manager: Any) -> None:
    """Check all active journeys for time-based triggers."""
    if not state_manager:
        return

    try:
        from server.mongo_repo import _journeys, get_monitoring_settings
        all_active = list(_journeys().find({"status": "in_progress"}))
        
        # Filter by monitoring preference
        settings = get_monitoring_settings()
        active_journeys = []
        for j in all_active:
            user_id = j.get("user_id")
            pref = settings.get(user_id, "off") # Default to off
            if pref != "off":
                active_journeys.append(j)
                
    except Exception as e:
        logger.debug(f"Could not load active journeys: {e}")
        return

    now = datetime.now(timezone.utc)

    for journey_doc in active_journeys:
        journey_id = journey_doc.get("_id")
        if not journey_id:
            continue

        try:
            journey = state_manager.get_journey(journey_id)
            if not journey:
                continue

            current = journey.current_segment
            timeline = journey.timeline
            sent = getattr(journey.context, "sent_notifications", None) or {}

            # --- home_to_airport: get_ready (45 min before departure) ---
            if current == JourneySegment.HOME_TO_AIRPORT and timeline.departure_from_home:
                dep = timeline.departure_from_home
                if isinstance(dep, str):
                    dep = datetime.fromisoformat(dep)
                threshold = dep - timedelta(minutes=45)
                if now >= threshold and "get_ready" not in sent:
                    await _send_time_notification(
                        ws_manager, journey_id, state_manager,
                        event_type="get_ready",
                        message="Time to get ready for your trip.",
                    )

            # --- home_to_airport: time_to_leave (at departure or 5 min before) ---
            if current == JourneySegment.HOME_TO_AIRPORT and timeline.departure_from_home:
                dep = timeline.departure_from_home
                if isinstance(dep, str):
                    dep = datetime.fromisoformat(dep)
                threshold = dep - timedelta(minutes=5)
                if now >= threshold and "time_to_leave" not in sent:
                    await _send_time_notification(
                        ws_manager, journey_id, state_manager,
                        event_type="time_to_leave",
                        message="Time to leave for the airport.",
                    )

            # --- airport_to_flight: boarding_opens (30 min before scheduled departure) ---
            if current == JourneySegment.AIRPORT_TO_FLIGHT and timeline.flight_departure:
                flight_dep = timeline.flight_departure
                if isinstance(flight_dep, str):
                    flight_dep = datetime.fromisoformat(flight_dep)
                threshold = flight_dep - timedelta(minutes=30)
                if now >= threshold and "boarding_opens" not in sent:
                    await _send_time_notification(
                        ws_manager, journey_id, state_manager,
                        event_type="boarding_opens",
                        message="Boarding opens in 30 minutes.",
                    )

            # --- hotel_to_activities: checkout_day (on checkout date) ---
            if current == JourneySegment.HOTEL_TO_ACTIVITIES and timeline.hotel_check_out:
                checkout = timeline.hotel_check_out
                if isinstance(checkout, str):
                    checkout = datetime.fromisoformat(checkout)
                # Fire on the day of checkout (e.g. 8 AM local or when now.date() == checkout.date())
                if now.date() >= checkout.date() and "checkout_day" not in sent:
                    await _send_time_notification(
                        ws_manager, journey_id, state_manager,
                        event_type="checkout_day",
                        message="Checkout today. Your return journey starts.",
                    )
                    # Optionally transition to return (or wait for user message)
                    # state_manager.transition_segment(journey_id, JourneySegment.HOTEL_TO_ACTIVITIES, JourneySegment.RETURN)

            # --- return: time_to_leave_return (for return flight) ---
            if current == JourneySegment.RETURN and timeline.return_flight_departure:
                ret_dep = timeline.return_flight_departure
                if isinstance(ret_dep, str):
                    ret_dep = datetime.fromisoformat(ret_dep)
                threshold = ret_dep - timedelta(minutes=45)
                if now >= threshold and "time_to_leave_return" not in sent:
                    await _send_time_notification(
                        ws_manager, journey_id, state_manager,
                        event_type="time_to_leave_return",
                        message="Time to leave for the airport (return flight).",
                    )

        except Exception as e:
            logger.warning(f"Time trigger evaluation failed for journey {journey_id}: {e}")


async def _send_time_notification(
    ws_manager: Any,
    journey_id: str,
    state_manager: Any,
    event_type: str,
    message: str,
) -> None:
    """Send a time-based notification and mark as sent (idempotency)."""
    from .trigger_evaluator import _send_proactive, _mark_notification_sent
    await _send_proactive(ws_manager, journey_id, "proactive_notification", {
        "trigger": "time",
        "event_type": event_type,
        "message": message,
    })
    _mark_notification_sent(state_manager, journey_id, event_type)
