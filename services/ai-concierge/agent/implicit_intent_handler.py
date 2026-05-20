"""
Implicit Intent Handler: Execute actions based on implicit user statements.

Handles:
- "I'm at the airport" → Trigger location check + transition
- "Running late" → Check traffic + recalculate timeline
- "Boarding now" → Update segment state
- "Just landed" → Trigger arrival flow
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def handle_implicit_intent(
    trigger_action: str,
    implicit_intent: str,
    context_hints: Dict[str, Any],
    journey_id: Optional[str],
    state_manager: Any,
    context_monitor: Any,
    ws_manager: Any,
) -> Dict[str, Any]:
    """
    Execute actions based on implicit intent detection.
    
    Returns:
    {
        "action_taken": str,
        "notification_sent": bool,
        "transition_triggered": bool,
        "data": Dict[str, Any],
    }
    """
    result = {
        "action_taken": None,
        "notification_sent": False,
        "transition_triggered": False,
        "data": {},
    }
    
    if not journey_id:
        return result
    
    # --- LOCATION ARRIVAL ---
    if trigger_action == "location_check" and implicit_intent == "location_arrival":
        location_type = context_hints.get("location_type", "airport")
        
        try:
            from agent.journey.phase_1_foundation import JourneySegment
            
            journey = state_manager.get_journey(journey_id) if state_manager else None
            if not journey:
                return result
            
            current = journey.current_segment
            
            # Map location to waypoint and segment transition
            waypoint_map = {
                "airport": ("departure_airport", JourneySegment.HOME_TO_AIRPORT, JourneySegment.AIRPORT_TO_FLIGHT, "arrived_at_airport"),
                "hotel": ("hotel", JourneySegment.FLIGHT_TO_HOTEL, JourneySegment.HOTEL_TO_ACTIVITIES, "arrived_at_hotel"),
                "home": ("home", JourneySegment.RETURN, None, "arrived_home"),
            }
            
            if location_type in waypoint_map:
                waypoint, expected_segment, next_segment, flag = waypoint_map[location_type]
                
                # Validate current segment matches expected
                if current == expected_segment:
                    # Update segment state
                    segment_state = journey.segment_states.get(current.value, {})
                    segment_state[flag] = True
                    state_manager.update_segment_state(journey_id, current, segment_state)
                    
                    # Trigger transition
                    if next_segment:
                        state_manager.transition_segment(journey_id, current, next_segment)
                        result["transition_triggered"] = True
                        logger.info(f"Implicit location: transitioned {journey_id} {current.value} → {next_segment.value}")
                    else:
                        # Home arrival = journey complete
                        state_manager.complete_journey(journey_id)
                        result["transition_triggered"] = True
                        logger.info(f"Implicit location: completed journey {journey_id}")
                    
                    # Send notification
                    messages = {
                        "airport": "You've reached the airport. Head to your gate when ready.",
                        "hotel": "You've arrived at your hotel. Enjoy your stay!",
                        "home": "Welcome home! Your journey is complete.",
                    }
                    await ws_manager.broadcast_to_journey(journey_id, {
                        "type": "proactive_notification",
                        "trigger": "implicit_location",
                        "message": messages.get(location_type, "Arrival detected."),
                    })
                    result["notification_sent"] = True
                    result["action_taken"] = f"location_arrival_{location_type}"
                    result["data"] = {"location": location_type, "segment_transition": next_segment.value if next_segment else "completed"}
        
        except Exception as e:
            logger.error(f"Implicit location handler failed: {e}")
    
    # --- URGENCY / RUNNING LATE ---
    elif trigger_action == "traffic_check" and implicit_intent == "urgency":
        try:
            # Force immediate traffic check
            if context_monitor and hasattr(context_monitor, "_poll_traffic"):
                await context_monitor._poll_traffic(journey_id)
                result["action_taken"] = "traffic_check_forced"
                logger.info(f"Implicit urgency: forced traffic check for {journey_id}")
            
            # Recalculate timeline with urgency flag
            if state_manager:
                journey = state_manager.get_journey(journey_id)
                if journey and hasattr(state_manager, "recalculate_timeline"):
                    state_manager.recalculate_timeline(journey_id, urgency=True)
                    result["action_taken"] = "timeline_recalculated"
                    logger.info(f"Implicit urgency: recalculated timeline for {journey_id}")
            
            # Send advisory notification
            await ws_manager.broadcast_to_journey(journey_id, {
                "type": "proactive_notification",
                "trigger": "implicit_urgency",
                "message": "Checking current traffic conditions and recalculating your timeline...",
            })
            result["notification_sent"] = True
        
        except Exception as e:
            logger.error(f"Implicit urgency handler failed: {e}")
    
    return result
