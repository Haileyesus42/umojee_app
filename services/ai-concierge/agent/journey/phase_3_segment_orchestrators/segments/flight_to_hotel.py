"""
Phase 3: Segment 4 - Flight to Hotel Orchestrator

This orchestrator handles the journey from flight landing to hotel arrival:
- Landing detection
- Immigration and baggage claim buffer estimation
- Hotel ETA calculation
- Proactive hotel notification
- Transport readiness at destination
- Hotel arrival detection
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
import logging

from ..base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
)

logger = logging.getLogger(__name__)

class FlightToHotelOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Flight to Hotel segment.

    Handles the post-landing experience:
    1. Detect landing and update status
    2. Estimate time for immigration and baggage
    3. Calculate travel time to hotel
    4. Notify the hotel of the expected arrival time
    5. Suggest transport options to the hotel
    6. Monitor arrival at hotel
    """

    def __init__(self):
        super().__init__("flight_to_hotel")

    def _register_nodes(self) -> None:
        """Register all nodes for the flight-to-hotel segment."""
        self.register_node("landing_detection", self._landing_detection_node)
        self.register_node("arrival_buffer_estimation", self._arrival_buffer_estimation_node)
        self.register_node("hotel_eta_calculation", self._hotel_eta_calculation_node)
        self.register_node("hotel_notification", self._hotel_notification_node)
        self.register_node("transport_recommendation", self._transport_recommendation_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("generate_response", self._generate_response_node)

    async def _landing_detection_node(self, state: Dict[str, Any]) -> NodeResult:
        """Detect when the flight has landed using Phase 2 monitoring or context."""
        journey_context = state.get("journey_context", {})
        flight_status = journey_context.get("flight_status", {})

        # Try cached Phase 2 flight status monitoring first
        cached_flight = journey_context.get("monitoring", {}).get("flight_status")
        if cached_flight and "error" not in cached_flight:
            status = cached_flight.get("status", "")
            landed = status in ("Landed", "Land", "Arrived")
            logger.info(f"Flight status from Phase 2 monitor: {status}")
        else:
            # Fallback to context-provided status
            landed = flight_status.get("status") == "Land" or journey_context.get("force_landed", True)

        state["has_landed"] = landed

        if landed:
            state["landing_time"] = datetime.now(timezone.utc)
            logger.info("Landing detected, starting arrival sequence.")

        return NodeResult(
            node_name="landing_detection",
            status=NodeStatus.SUCCESS,
            data={"has_landed": landed}
        )

    async def _arrival_buffer_estimation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Estimate time for immigration and baggage claim."""
        journey_context = state.get("journey_context", {})
        is_intl = journey_context.get("is_international", True)
        
        # Simple buffer logic
        if is_intl:
            buffer = 60 # 60 mins for international
            reason = "immigration and baggage claim"
        else:
            buffer = 20 # 20 mins for domestic
            reason = "baggage claim"
            
        state["arrival_buffer"] = buffer
        state["buffer_reason"] = reason
        
        return NodeResult(
            node_name="arrival_buffer_estimation",
            status=NodeStatus.SUCCESS,
            data={"buffer_minutes": buffer}
        )

    async def _hotel_eta_calculation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Calculate ETA to the hotel, using Phase 2 traffic data when available."""
        journey_context = state.get("journey_context", {})
        buffer = state.get("arrival_buffer", 30)

        # Try cached Phase 2 traffic monitoring for real travel/delay data
        cached_traffic = journey_context.get("monitoring", {}).get("traffic")
        if cached_traffic and "error" not in cached_traffic:
            travel_time = cached_traffic.get("current_duration_minutes", 45)
            traffic_delay = cached_traffic.get("delay_minutes", 0)
            logger.info(f"Hotel ETA using Phase 2 traffic: {travel_time}min + {traffic_delay}min delay")
        else:
            travel_time = 45
            traffic_delay = 10

        total_time_to_hotel = buffer + travel_time + traffic_delay
        eta = datetime.now(timezone.utc) + timedelta(minutes=total_time_to_hotel)

        state["hotel_eta"] = eta
        state["travel_time"] = travel_time + traffic_delay

        return NodeResult(
            node_name="hotel_eta_calculation",
            status=NodeStatus.SUCCESS,
            data={"total_minutes": total_time_to_hotel, "eta": eta.isoformat()}
        )

    async def _hotel_notification_node(self, state: Dict[str, Any]) -> NodeResult:
        """Proactively notify the hotel of arrival time."""
        eta = state.get("hotel_eta")
        
        # Mock notification logic
        notification_sent = True
        logger.info(f"Notified hotel of expected arrival at {self._format_time(eta, state.get('journey_context'))}")
        
        state["hotel_notified"] = notification_sent
        
        return NodeResult(
            node_name="hotel_notification",
            status=NodeStatus.SUCCESS,
            data={"notified": notification_sent}
        )

    async def _transport_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Suggest transport options from airport to hotel."""
        journey_context = state.get("journey_context", {})
        
        options = [
            {"mode": "Taxi", "time": "45m", "cost": "$50", "reliable": True},
            {"mode": "Rideshare", "time": "50m", "cost": "$35", "reliable": True},
            {"mode": "Public Transit", "time": "1h 10m", "cost": "$10", "reliable": False}
        ]
        
        state["transport_options"] = options
        
        return NodeResult(
            node_name="transport_recommendation",
            status=NodeStatus.SUCCESS,
            data={"options": options}
        )

    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a smarter, LLM-powered arrival recommendation.
        """
        has_landed = state.get("has_landed")
        hotel_eta = state.get("hotel_eta")
        transport_options = state.get("transport_options", [])
        journey_context = state.get("journey_context", {})
        
        if not has_landed:
            return NodeResult(node_name="smart_recommendation", status=NodeStatus.SKIPPED)

        # Build context for LLM
        context_data = {
            "has_landed": has_landed,
            "hotel_eta": hotel_eta.isoformat() if hasattr(hotel_eta, "isoformat") else str(hotel_eta),
            "transport_options": transport_options,
            "destination": journey_context.get("destination", "your hotel")
        }
        
        recommendation = await self.generate_smart_recommendation(
            recommendation_type="logistics",
            title="Smooth Arrival Tip",
            content_prompt="The user has just landed. Provide a helpful, localized tip for their arrival. Maybe mention a specific app for taxis, or a quick way to get through baggage claim at a typical airport. Keep it welcoming and short.",
            context_data=context_data
        )
        
        # Add to state and recommendations list
        state["smart_recommendation"] = recommendation
        recommendations = state.get("recommendations", [])
        recommendations.append(recommendation)
        state["recommendations"] = recommendations
        
        return NodeResult(
            node_name="smart_recommendation",
            status=NodeStatus.SUCCESS,
            data={"recommendation": recommendation.dict()}
        )

    async def _generate_response_node(self, state: Dict[str, Any]) -> NodeResult:
        """Generate the response message for the user."""
        eta = state.get("hotel_eta")
        buffer = state.get("arrival_buffer")
        reason = state.get("buffer_reason")
        options = state.get("transport_options", [])
        
        response_parts = [
            f"Welcome! Hope you had a good flight. I've estimated about **{buffer} minutes** for {reason}.\n",
            f"\nI've already notified your hotel that you'll be arriving around **{self._format_time(eta, state.get('journey_context'))}**.\n",
            "\n**Best transport options to your hotel:**\n"
        ]
        
        for opt in options[:2]:
            response_parts.append(f"• {opt['mode']}: {opt['time']} (~{opt['cost']})\n")
            
        response_parts.append("\nShall I help you book a ride or do you need directions?")
        
        state["response"] = "".join(response_parts)
        
        return NodeResult(
            node_name="generate_response",
            status=NodeStatus.SUCCESS
        )

    def _check_completion(self) -> bool:
        """Check if flight-to-hotel segment should transition."""
        return self._state.get("arrived_at_hotel", False)

    def _get_next_segment(self) -> str:
        """Get the next segment after flight-to-hotel."""
        return "hotel_to_activities"

def create_flight_to_hotel_orchestrator() -> FlightToHotelOrchestrator:
    """Factory function to create a FlightToHotelOrchestrator."""
    return FlightToHotelOrchestrator()


def create_flight_to_hotel_graph():
    """Create and return the compiled LangGraph for flight-to-hotel orchestrator."""
    orchestrator = FlightToHotelOrchestrator()
    return orchestrator.build_graph()
