import logging
from typing import Any, Dict, Optional
from datetime import datetime, timezone

from .phase_1_foundation import (
    JourneySegment, 
    JourneyMessage, 
    MessageType,
    UIBlock,
    UIBlockType
)
from .phase_2_context_monitoring import ContextUpdate, MonitoringType
from .template_manager import get_template_manager

logger = logging.getLogger(__name__)

# Normalized flight status values we care about
BOARDING_STATUSES = ("boarding", "boarded", "departed")
LANDED_STATUSES = ("landed", "arrived")
TRAFFIC_DELAY_THRESHOLD_MIN = 15
TRAFFIC_HEAVY = "heavy"
WEATHER_SEVERE_KEYWORDS = ("heavy", "storm", "severe", "thunder", "blizzard", "hurricane")


async def evaluate_context_update(
    update: ContextUpdate,
    state_manager: Any,
    ws_manager: Any,
    message_dispatcher: Optional[Any] = None
) -> None:
    """
    Evaluate a context update and optionally:
    - Send a proactive JourneyMessage via message_dispatcher.
    - Trigger a segment transition.
    """
    if not update.success or not update.data:
        return

    journey_id = update.journey_id
    journey = state_manager.get_journey(journey_id) if state_manager else None
    if not journey:
        return

    current = journey.current_segment
    mtype = update.monitoring_type
    data = update.data
    template_manager = get_template_manager()

    # --- FLIGHT_STATUS ---
    if mtype == MonitoringType.FLIGHT_STATUS:
        status_raw = data.get("status") or data.get("flight_status") or ""
        status = str(status_raw).lower().strip()
        if not status:
            return
            
        if status in ("landed", "arrived"):
            status = "landed"
        elif status in ("boarded", "departed"):
            status = "boarded"
        elif status == "boarding":
            pass
        else:
            return

        if status == "boarding":
            msg = JourneyMessage(
                type=MessageType.ALERT,
                priority=4,
                title="Boarding Started",
                content="Boarding has started for your flight. Please head to your gate.",
                context_data=data
            )
            await _dispatch_if_possible(message_dispatcher, journey_id, msg, ws_manager)
            
        elif status == "boarded" and current == JourneySegment.AIRPORT_TO_FLIGHT:
            try:
                state_manager.transition_segment(
                    journey_id,
                    JourneySegment.AIRPORT_TO_FLIGHT,
                    JourneySegment.FLIGHT_TO_HOTEL,
                )
                logger.info(f"Trigger: transitioned {journey_id} airport_to_flight -> flight_to_hotel (boarded)")
                
                # Recalculate timeline
                delay = data.get("delay_minutes", 0)
                if delay > 0:
                    try:
                        from agent.dynamic_timeline import recalculate_timeline_on_context_change
                        await recalculate_timeline_on_context_change(
                            journey_id, "flight_delay", data, state_manager, ws_manager
                        )
                    except Exception as e:
                        logger.warning(f"Flight delay timeline recalculation failed: {e}")
            except Exception as e:
                logger.warning(f"Trigger transition failed: {e}")

            msg = JourneyMessage(
                type=MessageType.SYSTEM,
                priority=3,
                title="Trip Phase Updated",
                content="You've boarded. We'll find your hotel details and transport once you land.",
                context_data=data
            )
            await _dispatch_if_possible(message_dispatcher, journey_id, msg, ws_manager)

        elif status == "landed" and current == JourneySegment.FLIGHT_TO_HOTEL:
            msg = JourneyMessage(
                type=MessageType.RECOMMENDATION,
                priority=4,
                title="Welcome to Destination",
                content="Your flight has landed! Head to baggage claim and then to the ground transport area.",
                context_data=data
            )
            await _dispatch_if_possible(message_dispatcher, journey_id, msg, ws_manager)

    # --- TRAFFIC ---
    elif mtype == MonitoringType.TRAFFIC:
        if current not in (JourneySegment.HOME_TO_AIRPORT, JourneySegment.RETURN):
            return
            
        delay = data.get("delay_minutes", 0)
        conditions = (data.get("conditions") or "").lower()
        
        if (isinstance(delay, (int, float)) and delay > TRAFFIC_DELAY_THRESHOLD_MIN) or TRAFFIC_HEAVY in conditions:
            if not _should_send_with_cooldown(journey, "traffic_heavy", cooldown_minutes=60):
                return
            
            # Recalculate timeline
            try:
                from agent.dynamic_timeline import recalculate_timeline_on_context_change
                await recalculate_timeline_on_context_change(
                    journey_id, "traffic", data, state_manager, ws_manager
                )
            except Exception as e:
                logger.warning(f"Timeline recalculation failed: {e}")
            
            # Use Template Manager for traffic alert
            dest = journey.context.planned_destination or "the airport"
            flight = journey.context.flight_status
            
            content = template_manager.render("traffic.j2", {
                "travel_date": journey.context.planned_departure_date or "TBD",
                "airline": getattr(flight, "airline", "") if flight else "",
                "flight_number": getattr(flight, "flight_number", "Information") if flight else "Information",
                "origin": journey.context.departure_airport_code or "Origin",
                "destination_airport": journey.context.destination_airport_code or "Airport",
                "destination_name": dest,
                "delay_minutes": int(delay) if delay else 0,
                "actions": [data.get("recommendation", "Consider leaving earlier.")]
            })
            
            msg = JourneyMessage(
                type=MessageType.ALERT,
                priority=4,
                title="Traffic Warning",
                content=content,
                context_data=data
            )
            await _dispatch_if_possible(message_dispatcher, journey_id, msg, ws_manager)
            _mark_notification_sent(state_manager, journey_id, "traffic_heavy")

    # --- WEATHER ---
    elif mtype == MonitoringType.WEATHER:
        desc = (data.get("description") or data.get("current", {}).get("description") or "").lower()
        if any(kw in desc for kw in WEATHER_SEVERE_KEYWORDS):
            if not _should_send_with_cooldown(journey, "weather_severe", cooldown_minutes=60):
                return
                
            # Use Template Manager for weather alert
            flight = journey.context.flight_status
            content = template_manager.render("weather.j2", {
                "travel_date": journey.context.planned_departure_date or "TBD",
                "airline": getattr(flight, "airline", "") if flight else "",
                "flight_number": getattr(flight, "flight_number", "Information") if flight else "Information",
                "origin": journey.context.departure_airport_code or "Origin",
                "destination_airport": journey.context.destination_airport_code or "Airport",
                "conditions": desc.title(),
                "location_name": journey.context.planned_destination or "your destination",
                "temperature": data.get("temp_celsius", "??"),
                "advice": "Severe weather expected; please allow extra time for travel and stay safe."
            })
            
            msg = JourneyMessage(
                type=MessageType.ALERT,
                priority=5,
                title="Severe Weather Alert",
                content=content,
                context_data=data
            )
            await _dispatch_if_possible(message_dispatcher, journey_id, msg, ws_manager)
            _mark_notification_sent(state_manager, journey_id, "weather_severe")


def _should_send_with_cooldown(journey: Any, event_type: str, cooldown_minutes: int) -> bool:
    """Check if we can send a notification (idempotency + cooldown)."""
    if not journey or not hasattr(journey, "context"):
        return True
    sent = getattr(journey.context, "sent_notifications", None) or {}
    if event_type not in sent:
        return True
    try:
        last_sent = datetime.fromisoformat(sent[event_type])
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds() / 60
        return elapsed >= cooldown_minutes
    except Exception:
        return True


def _mark_notification_sent(state_manager: Any, journey_id: str, event_type: str) -> None:
    """Mark a notification as sent (idempotency)."""
    if not state_manager:
        return
    try:
        journey = state_manager.get_journey(journey_id)
        if not journey:
            return
        sent = getattr(journey.context, "sent_notifications", None) or {}
        sent[event_type] = datetime.now(timezone.utc).isoformat()
        state_manager.update_context(journey_id, {"sent_notifications": sent})
    except Exception as e:
        logger.warning(f"Failed to mark notification sent: {e}")


async def _dispatch_if_possible(
    dispatcher: Optional[Any],
    journey_id: str,
    message: JourneyMessage,
    ws_manager: Any
) -> None:
    """Dispatch via unified system if possible, fallback to raw WS broadcast."""
    if dispatcher:
        await dispatcher.dispatch(journey_id, message)
    elif ws_manager:
        # Fallback to old behavior if dispatcher not provided
        try:
            await ws_manager.broadcast_to_journey(journey_id, {
                "type": "proactive_notification",
                "trigger": message.type.value,
                "message": message.content,
                "title": message.title
            })
        except Exception as e:
            logger.warning(f"Proactive broadcast fallback failed: {e}")
