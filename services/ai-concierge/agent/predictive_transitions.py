"""
Predictive Transitions: Anticipate and pre-load next segments.

Features:
- Pre-load next segment context when transition is imminent
- Reduce latency by preparing data in advance
- Smart prediction based on location, time, and context
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class PredictiveTransitionManager:
    """
    Predicts upcoming segment transitions and pre-loads context.
    
    Benefits:
    - Reduces latency when transition happens (context already loaded)
    - Smoother user experience (no waiting for data)
    - Proactive notifications feel more intelligent
    """
    
    def __init__(self, state_manager: Any, context_monitor: Any):
        self.state_manager = state_manager
        self.context_monitor = context_monitor
        self.preloaded_contexts: Dict[str, Dict[str, Any]] = {}  # journey_id -> preloaded data
    
    async def predict_and_preload(
        self,
        journey_id: str,
        current_location: Optional[Dict[str, float]] = None,
        traffic_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Predict if transition is imminent and pre-load next segment context.
        
        Returns:
            Next segment name if preloaded, None otherwise
        """
        try:
            journey = self.state_manager.get_journey(journey_id)
            if not journey:
                return None
            
            current_segment = journey.current_segment
            timeline = journey.timeline
            
            # Predict based on current segment
            from agent.journey.phase_1_foundation import JourneySegment
            
            # --- home_to_airport: predict airport_to_flight ---
            if current_segment == JourneySegment.HOME_TO_AIRPORT:
                should_preload = await self._should_preload_airport_segment(
                    journey, current_location, traffic_data
                )
                if should_preload:
                    await self._preload_airport_to_flight(journey_id)
                    return "airport_to_flight"
            
            # --- airport_to_flight: predict flight_to_hotel ---
            elif current_segment == JourneySegment.AIRPORT_TO_FLIGHT:
                should_preload = await self._should_preload_flight_segment(journey, timeline)
                if should_preload:
                    await self._preload_flight_to_hotel(journey_id)
                    return "flight_to_hotel"
            
            # --- flight_to_hotel: predict hotel_to_activities ---
            elif current_segment == JourneySegment.FLIGHT_TO_HOTEL:
                should_preload = await self._should_preload_hotel_segment(
                    journey, current_location
                )
                if should_preload:
                    await self._preload_hotel_to_activities(journey_id)
                    return "hotel_to_activities"
        
        except Exception as e:
            logger.error(f"Predictive preload failed for {journey_id}: {e}")
        
        return None
    
    async def _should_preload_airport_segment(
        self,
        journey: Any,
        current_location: Optional[Dict[str, float]],
        traffic_data: Optional[Dict[str, Any]],
    ) -> bool:
        """Check if user is close to airport (within 30 min ETA)."""
        if not current_location:
            return False
        
        # Check distance to airport
        airport_lat = journey.context.departure_airport_lat
        airport_lon = journey.context.departure_airport_lon
        
        if not airport_lat or not airport_lon:
            return False
        
        from agent.location_geofencing import LocationGeofencing
        geofencing = LocationGeofencing()
        
        distance = geofencing.calculate_distance(
            current_location["lat"],
            current_location["lon"],
            airport_lat,
            airport_lon,
        )
        
        eta = geofencing.calculate_eta(distance, traffic_data)
        
        # Preload if ETA < 30 minutes
        return eta is not None and eta < 30
    
    async def _should_preload_flight_segment(
        self,
        journey: Any,
        timeline: Any,
    ) -> bool:
        """Check if boarding time is within 1 hour."""
        if not timeline or not timeline.flight_departure:
            return False
        
        try:
            dep = timeline.flight_departure
            if isinstance(dep, str):
                dep = datetime.fromisoformat(dep)
            
            now = datetime.now(timezone.utc)
            time_until_boarding = (dep - now).total_seconds() / 60
            
            # Preload if boarding within 60 minutes
            return 0 < time_until_boarding < 60
        except Exception:
            return False
    
    async def _should_preload_hotel_segment(
        self,
        journey: Any,
        current_location: Optional[Dict[str, float]],
    ) -> bool:
        """Check if user is approaching hotel."""
        if not current_location:
            return False
        
        hotel_lat = journey.context.hotel_lat
        hotel_lon = journey.context.hotel_lon
        
        if not hotel_lat or not hotel_lon:
            return False
        
        from agent.location_geofencing import LocationGeofencing
        geofencing = LocationGeofencing()
        
        distance = geofencing.calculate_distance(
            current_location["lat"],
            current_location["lon"],
            hotel_lat,
            hotel_lon,
        )
        
        # Preload if within 5 km
        return distance < 5000
    
    async def _preload_airport_to_flight(self, journey_id: str) -> None:
        """Pre-load context for airport_to_flight segment."""
        logger.info(f"Pre-loading airport_to_flight context for {journey_id}")
        
        try:
            # Fetch flight status, gate info, airport conditions
            if self.context_monitor:
                await self.context_monitor._poll_flight_status(journey_id)
                await self.context_monitor._poll_airport_conditions(journey_id)
            
            self.preloaded_contexts[journey_id] = {
                "segment": "airport_to_flight",
                "preloaded_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to preload airport_to_flight: {e}")
    
    async def _preload_flight_to_hotel(self, journey_id: str) -> None:
        """Pre-load context for flight_to_hotel segment."""
        logger.info(f"Pre-loading flight_to_hotel context for {journey_id}")
        
        try:
            # Fetch destination weather, traffic to hotel
            if self.context_monitor:
                await self.context_monitor._poll_weather(journey_id)
                await self.context_monitor._poll_traffic(journey_id)
            
            self.preloaded_contexts[journey_id] = {
                "segment": "flight_to_hotel",
                "preloaded_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to preload flight_to_hotel: {e}")
    
    async def _preload_hotel_to_activities(self, journey_id: str) -> None:
        """Pre-load context for hotel_to_activities segment."""
        logger.info(f"Pre-loading hotel_to_activities context for {journey_id}")
        
        try:
            # Fetch local recommendations, weather forecast
            if self.context_monitor:
                await self.context_monitor._poll_weather(journey_id)
            
            self.preloaded_contexts[journey_id] = {
                "segment": "hotel_to_activities",
                "preloaded_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to preload hotel_to_activities: {e}")
    
    def get_preloaded_context(self, journey_id: str) -> Optional[Dict[str, Any]]:
        """Get preloaded context if available."""
        return self.preloaded_contexts.get(journey_id)
    
    def clear_preloaded_context(self, journey_id: str) -> None:
        """Clear preloaded context after transition."""
        if journey_id in self.preloaded_contexts:
            del self.preloaded_contexts[journey_id]


# Background loop for predictive preloading
async def predictive_preload_loop(
    state_manager: Any,
    context_monitor: Any,
    interval_seconds: int = 120,
) -> None:
    """
    Background loop that predicts transitions and pre-loads context.
    Runs every interval_seconds (default 2 minutes).
    """
    logger.info("Predictive preload loop started")
    manager = PredictiveTransitionManager(state_manager, context_monitor)
    
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            
            # Load active journeys
            from server.mongo_repo import _journeys, get_monitoring_settings
            all_active = list(_journeys().find({"status": "in_progress"}))
            
            # Filter by monitoring preference
            settings = get_monitoring_settings()
            for journey_doc in all_active:
                user_id = journey_doc.get("user_id")
                pref = settings.get(user_id, "off") # Default to off
                if pref == "off":
                    continue

                journey_id = journey_doc.get("_id")
                if not journey_id:
                    continue
                
                # Get current location and traffic from monitoring
                monitoring = journey_doc.get("context", {}).get("monitoring", {})
                location = monitoring.get("location")
                traffic = monitoring.get("traffic")
                
                # Predict and preload
                await manager.predict_and_preload(journey_id, location, traffic)
        
        except asyncio.CancelledError:
            logger.info("Predictive preload loop cancelled")
            break
        except Exception as e:
            logger.error(f"Predictive preload loop error: {e}")
