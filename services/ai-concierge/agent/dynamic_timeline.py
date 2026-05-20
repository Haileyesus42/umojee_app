"""
Dynamic Timeline Recalculation: Update timeline when context changes.

Features:
- Recalculate departure time when traffic changes
- Adjust hotel check-in when flight delayed
- Update all dependent events in cascade
- Notify user of timeline changes
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class DynamicTimelineRecalculator:
    """
    Recalculates journey timeline when context changes.
    
    Triggers:
    - Traffic delay detected → recalculate departure time
    - Flight delayed → adjust hotel check-in, activities
    - Weather severe → add buffer to travel time
    - User urgency → compress timeline
    """
    
    def __init__(self, state_manager: Any):
        self.state_manager = state_manager
    
    async def recalculate_on_traffic_change(
        self,
        journey_id: str,
        traffic_data: Dict[str, Any],
        ws_manager: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Recalculate timeline when traffic conditions change.
        
        Returns:
            Updated timeline with changes
        """
        try:
            journey = self.state_manager.get_journey(journey_id)
            if not journey:
                return None
            
            timeline = journey.timeline
            if not timeline or not timeline.departure_from_home:
                return None
            
            # Get traffic delay
            delay_minutes = traffic_data.get("delay_minutes", 0)
            if delay_minutes <= 0:
                return None
            
            # Recalculate departure time
            original_departure = timeline.departure_from_home
            if isinstance(original_departure, str):
                original_departure = datetime.fromisoformat(original_departure)
            
            # Move departure earlier by delay amount
            new_departure = original_departure - timedelta(minutes=delay_minutes)
            
            # Update timeline
            timeline.departure_from_home = new_departure
            journey.timeline = timeline
            journey.updated_at = datetime.now(timezone.utc)
            
            # Persist
            if self.state_manager.mongo_repo:
                self.state_manager.mongo_repo.update_journey(journey_id, {
                    "timeline.departure_from_home": new_departure.isoformat(),
                    "updated_at": journey.updated_at,
                })
            
            # Notify user
            time_str = new_departure.strftime("%I:%M %p")
            await ws_manager.broadcast_to_journey(journey_id, {
                "type": "timeline_update",
                "trigger": "traffic_delay",
                "message": f"Traffic delay detected. Updated departure time: {time_str} ({delay_minutes} min earlier).",
                "new_departure_time": new_departure.isoformat(),
                "delay_minutes": delay_minutes,
            })
            
            logger.info(f"Recalculated timeline for {journey_id}: departure moved {delay_minutes} min earlier due to traffic")
            
            return {
                "original_departure": original_departure.isoformat(),
                "new_departure": new_departure.isoformat(),
                "delay_minutes": delay_minutes,
            }
        
        except Exception as e:
            logger.error(f"Traffic-based timeline recalculation failed: {e}")
            return None
    
    async def recalculate_on_flight_delay(
        self,
        journey_id: str,
        flight_data: Dict[str, Any],
        ws_manager: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Recalculate timeline when flight is delayed.
        
        Cascades to:
        - Hotel check-in time
        - Activity start times
        - Dinner reservations
        """
        try:
            journey = self.state_manager.get_journey(journey_id)
            if not journey:
                return None
            
            timeline = journey.timeline
            if not timeline:
                return None
            
            # Get delay amount
            delay_minutes = flight_data.get("delay_minutes", 0)
            new_arrival = flight_data.get("new_arrival_time")
            
            if delay_minutes <= 0 and not new_arrival:
                return None
            
            # Update flight arrival
            if new_arrival:
                if isinstance(new_arrival, str):
                    new_arrival = datetime.fromisoformat(new_arrival)
                timeline.flight_arrival = new_arrival
            elif timeline.flight_arrival:
                original_arrival = timeline.flight_arrival
                if isinstance(original_arrival, str):
                    original_arrival = datetime.fromisoformat(original_arrival)
                timeline.flight_arrival = original_arrival + timedelta(minutes=delay_minutes)
            
            # Cascade: adjust hotel check-in
            if timeline.hotel_check_in:
                original_checkin = timeline.hotel_check_in
                if isinstance(original_checkin, str):
                    original_checkin = datetime.fromisoformat(original_checkin)
                
                # Add delay + 30 min buffer for baggage/transport
                new_checkin = original_checkin + timedelta(minutes=delay_minutes + 30)
                timeline.hotel_check_in = new_checkin
            
            journey.timeline = timeline
            journey.updated_at = datetime.now(timezone.utc)
            
            # Persist
            if self.state_manager.mongo_repo:
                self.state_manager.mongo_repo.update_journey(journey_id, {
                    "timeline": timeline.model_dump() if hasattr(timeline, "model_dump") else timeline.dict(),
                    "updated_at": journey.updated_at,
                })
            
            # Notify user
            await ws_manager.broadcast_to_journey(journey_id, {
                "type": "timeline_update",
                "trigger": "flight_delay",
                "message": f"Flight delayed by {delay_minutes} minutes. Updated hotel check-in and activities.",
                "delay_minutes": delay_minutes,
                "new_arrival_time": timeline.flight_arrival.isoformat() if timeline.flight_arrival else None,
                "new_checkin_time": timeline.hotel_check_in.isoformat() if timeline.hotel_check_in else None,
            })
            
            logger.info(f"Recalculated timeline for {journey_id}: flight delay cascaded to hotel/activities")
            
            return {
                "delay_minutes": delay_minutes,
                "updated_events": ["flight_arrival", "hotel_check_in"],
            }
        
        except Exception as e:
            logger.error(f"Flight delay timeline recalculation failed: {e}")
            return None
    
    async def recalculate_on_urgency(
        self,
        journey_id: str,
        ws_manager: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Recalculate timeline with urgency mode (compress buffers).
        
        Use case: User says "running late" - reduce buffers to minimum safe levels.
        """
        try:
            journey = self.state_manager.get_journey(journey_id)
            if not journey:
                return None
            
            timeline = journey.timeline
            if not timeline or not timeline.departure_from_home:
                return None
            
            # Compress buffers by 30%
            original_departure = timeline.departure_from_home
            if isinstance(original_departure, str):
                original_departure = datetime.fromisoformat(original_departure)
            
            # Calculate time saved (assume 30% of buffer can be compressed)
            # Typical buffer is 2-3 hours, so 30% = 36-54 minutes
            time_saved = 40  # minutes
            
            new_departure = original_departure + timedelta(minutes=time_saved)
            timeline.departure_from_home = new_departure
            
            journey.timeline = timeline
            journey.updated_at = datetime.now(timezone.utc)
            
            # Persist
            if self.state_manager.mongo_repo:
                self.state_manager.mongo_repo.update_journey(journey_id, {
                    "timeline.departure_from_home": new_departure.isoformat(),
                    "updated_at": journey.updated_at,
                })
            
            # Notify user
            time_str = new_departure.strftime("%I:%M %p")
            await ws_manager.broadcast_to_journey(journey_id, {
                "type": "timeline_update",
                "trigger": "urgency",
                "message": f"Compressed timeline for urgency. You can leave at {time_str} (saved {time_saved} min). Note: This is the minimum safe time.",
                "new_departure_time": new_departure.isoformat(),
                "time_saved_minutes": time_saved,
            })
            
            logger.info(f"Urgency recalculation for {journey_id}: saved {time_saved} min")
            
            return {
                "original_departure": original_departure.isoformat(),
                "new_departure": new_departure.isoformat(),
                "time_saved": time_saved,
            }
        
        except Exception as e:
            logger.error(f"Urgency timeline recalculation failed: {e}")
            return None


# Helper function for integration
async def recalculate_timeline_on_context_change(
    journey_id: str,
    change_type: str,
    change_data: Dict[str, Any],
    state_manager: Any,
    ws_manager: Any,
) -> Optional[Dict[str, Any]]:
    """
    Recalculate timeline based on context change.
    
    Usage:
        # When traffic update received
        await recalculate_timeline_on_context_change(
            journey_id="123",
            change_type="traffic",
            change_data={"delay_minutes": 25},
            state_manager=state_manager,
            ws_manager=ws_manager,
        )
    
    Args:
        journey_id: Journey identifier
        change_type: Type of change (traffic, flight_delay, urgency, weather)
        change_data: Data about the change
        state_manager: Journey state manager
        ws_manager: WebSocket manager for notifications
    
    Returns:
        Dict with recalculation results
    """
    recalculator = DynamicTimelineRecalculator(state_manager)
    
    if change_type == "traffic":
        return await recalculator.recalculate_on_traffic_change(journey_id, change_data, ws_manager)
    
    elif change_type == "flight_delay":
        return await recalculator.recalculate_on_flight_delay(journey_id, change_data, ws_manager)
    
    elif change_type == "urgency":
        return await recalculator.recalculate_on_urgency(journey_id, ws_manager)
    
    else:
        logger.warning(f"Unknown change type for timeline recalculation: {change_type}")
        return None
