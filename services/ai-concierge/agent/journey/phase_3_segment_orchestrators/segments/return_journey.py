"""
Phase 3: Segment 6 - Return Journey Orchestrator

This orchestrator handles the return journey home:
- Return activation and autopilot initialization
- Hotel checkout readiness
- Hotel to airport transport guidance
- Return flight monitoring
- Home arrival detection
- Post-trip automation and archiving
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

class ReturnJourneyOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Return Journey segment.

    Manages the final phase of the journey:
    1. Activate return flow (autopilot)
    2. Help with checkout reminders
    3. Calculate departure time for the airport (similar to Segment 2)
    4. Monitor return flight status
    5. Detect arrival home and close the journey
    """

    def __init__(self):
        super().__init__("return")

    def _register_nodes(self) -> None:
        """Register all nodes for the return segment."""
        self.register_node("return_activation", self._return_activation_node)
        self.register_node("checkout_readiness", self._checkout_readiness_node)
        self.register_node("transport_to_airport", self._transport_to_airport_node)
        self.register_node("return_flight_status", self._return_flight_status_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("generate_response", self._generate_response_node)

    async def _return_activation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Initialize the return journey autopilot."""
        logger.info("Return journey activated. Setting up autopilot.")
        state["autopilot_active"] = True
        return NodeResult(
            node_name="return_activation",
            status=NodeStatus.SUCCESS,
            data={"autopilot": True}
        )

    async def _checkout_readiness_node(self, state: Dict[str, Any]) -> NodeResult:
        """Remind the user about checkout and packing."""
        journey_context = state.get("journey_context", {})
        
        # Mock checkout info
        checkout_time = "11:00 AM"
        state["checkout_time"] = checkout_time
        state["packing_reminder"] = "It's your last day! Don't forget to double-check for chargers and small items."
        
        return NodeResult(
            node_name="checkout_readiness",
            status=NodeStatus.SUCCESS,
            data={"checkout_time": checkout_time}
        )

    async def _transport_to_airport_node(self, state: Dict[str, Any]) -> NodeResult:
        """Calculate when to leave for the airport, using Phase 2 traffic data when available."""
        journey_context = state.get("journey_context", {})

        departure_time = datetime.now(timezone.utc) + timedelta(hours=3)

        # Adjust buffer based on Phase 2 traffic monitoring
        cached_traffic = journey_context.get("monitoring", {}).get("traffic")
        if cached_traffic and "error" not in cached_traffic:
            travel_min = cached_traffic.get("current_duration_minutes", 45)
            traffic_delay = cached_traffic.get("delay_minutes", 0)
            # Airport buffer (2h international, 1.5h domestic) + actual travel time
            airport_buffer = 120 if journey_context.get("is_international", True) else 90
            total_buffer = airport_buffer + travel_min + traffic_delay
            logger.info(f"Return transport using Phase 2 traffic: {travel_min}min travel + {traffic_delay}min delay")
        else:
            total_buffer = 150  # default 2.5 hours

        recommended_leave = departure_time - timedelta(minutes=total_buffer)

        state["recommended_leave"] = recommended_leave
        state["transport_option"] = "Taxi (Recommended for reliability)"

        return NodeResult(
            node_name="transport_to_airport",
            status=NodeStatus.SUCCESS,
            data={"recommended_leave": recommended_leave.isoformat()}
        )

    async def _return_flight_status_node(self, state: Dict[str, Any]) -> NodeResult:
        """Monitor the status of the return flight using Phase 2 data when available."""
        journey_context = state.get("journey_context", {})

        # Try cached Phase 2 flight status monitoring
        cached_flight = journey_context.get("monitoring", {}).get("flight_status")
        if cached_flight and "error" not in cached_flight:
            status = cached_flight.get("status", "On Time")
            gate = cached_flight.get("gate", "TBD")
            delay = cached_flight.get("delay_minutes", 0)
            logger.info(f"Return flight from Phase 2 monitor: {status}, gate {gate}, delay {delay}min")
        else:
            status = "On Time"
            gate = "C42"
            delay = 0

        state["flight_status"] = status
        state["gate"] = gate
        state["flight_delay"] = delay

        return NodeResult(
            node_name="return_flight_status",
            status=NodeStatus.SUCCESS,
            data={"status": status, "gate": gate, "delay_minutes": delay}
        )

    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a smarter, LLM-powered return journey recommendation.
        """
        leave_time = state.get("recommended_leave")
        flight_status = state.get("flight_status")
        journey_context = state.get("journey_context", {})
        
        # Build context for LLM
        context_data = {
            "leave_time": leave_time.isoformat() if hasattr(leave_time, "isoformat") else str(leave_time),
            "flight_status": flight_status,
            "destination": journey_context.get("destination", "your location")
        }
        
        recommendation = await self.generate_smart_recommendation(
            recommendation_type="logistics",
            title="Safe Travels Home",
            content_prompt="The user is finishing their trip. Provide a final, thoughtful tip. Maybe a reminder about a specific tax refund process at the airport, or a last-minute souvenir they shouldn't miss. Keep it warm and concise.",
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
        """Generate the final journey response for the return trip."""
        checkout = state.get("checkout_time")
        leave_time = state.get("recommended_leave")
        transport = state.get("transport_option")
        status = state.get("flight_status")
        gate = state.get("gate")
        reminder = state.get("packing_reminder")
        
        response_parts = [
            f"It's time to head home. Your checkout is by **{checkout}**.\n",
            f"\n{reminder}\n",
            f"\n**Return Trip Details:**\n",
            f"• **Time to leave:** {self._format_time(leave_time, state.get('journey_context'))}\n",
            f"• **Transport:** {transport}\n",
            f"• **Flight status:** {status} (Gate {gate})\n",
            "\nI'll continue to monitor traffic and flight updates for you. Safe travels back!"
        ]
        
        state["response"] = "".join(response_parts)
        
        return NodeResult(
            node_name="generate_response",
            status=NodeStatus.SUCCESS
        )

    def _check_completion(self) -> bool:
        """Check if return segment should transition."""
        return self._state.get("arrived_home", False)

    def _get_next_segment(self) -> str:
        """Return segment is the final segment."""
        return "none"

def create_return_journey_orchestrator() -> ReturnJourneyOrchestrator:
    """Factory function to create a ReturnJourneyOrchestrator."""
    return ReturnJourneyOrchestrator()


def create_return_journey_graph():
    """Create and return the compiled LangGraph for return-journey orchestrator."""
    orchestrator = ReturnJourneyOrchestrator()
    return orchestrator.build_graph()
