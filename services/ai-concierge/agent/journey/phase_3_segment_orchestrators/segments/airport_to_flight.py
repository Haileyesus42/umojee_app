"""
Phase 3: Segment 3 - Airport to Flight Orchestrator

This orchestrator handles the journey from airport arrival to boarding:
- Airport context initialization
- Check-in status verification
- Security wait time estimation
- Gate synchronization
- Boarding risk assessment
- Boarding notification implementation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from enum import Enum
import logging

from ..base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
)

logger = logging.getLogger(__name__)

class BoardingStatus(str, Enum):
    """Status of the boarding process."""
    NOT_STARTED = "not_started"
    OPEN = "open"
    LAST_CALL = "last_call"
    CLOSED = "closed"
    BOARDED = "boarded"

@dataclass
class AirportContext:
    """Real-time airport context."""
    airport_code: str
    terminal: str
    gate: str
    security_wait_minutes: int
    congestion_level: str
    walking_time_to_gate_minutes: int

class AirportToFlightOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Airport to Flight segment.

    Handles the user's experience inside the airport:
    1. Initialize airport context (gate, terminal)
    2. Check if user has checked in
    3. Estimate security wait times
    4. Sync with real-time gate data
    5. Assess risk of missing boarding
    6. Notify user of boarding status
    """

    def __init__(self):
        super().__init__("airport_to_flight")

    def _register_nodes(self) -> None:
        """Register all nodes for the airport-to-flight segment."""
        self.register_node("airport_context_init", self._airport_context_init_node)
        self.register_node("checkin_status_check", self._checkin_status_check_node)
        self.register_node("security_wait_estimation", self._security_wait_estimation_node)
        self.register_node("gate_sync", self._gate_sync_node)
        self.register_node("boarding_risk_assessment", self._boarding_risk_assessment_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("generate_response", self._generate_response_node)

    async def _airport_context_init_node(self, state: Dict[str, Any]) -> NodeResult:
        """Initialize airport-specific data, enriched with Phase 2 monitoring if available."""
        journey_context = state.get("journey_context", {})
        flight_status = journey_context.get("flight_status", {})

        airport_code = flight_status.get("departure_airport", "JFK")
        terminal = flight_status.get("terminal", "4")
        gate = flight_status.get("gate", "B12")

        # Defaults
        security_wait = 25
        congestion = "moderate"

        # Enrich from cached Phase 2 airport monitoring
        cached_airport = journey_context.get("monitoring", {}).get("airport_conditions")
        if cached_airport and "error" not in cached_airport:
            logger.info("Enriching airport context with Phase 2 monitoring data")
            security_wait = cached_airport.get("security", {}).get("average_wait_minutes", security_wait)
            congestion = cached_airport.get("congestion", {}).get("overall_level", congestion)

        # Enrich from cached Phase 2 flight status monitoring (real-time gate updates)
        cached_flight = journey_context.get("monitoring", {}).get("flight_status")
        if cached_flight and "error" not in cached_flight:
            gate = cached_flight.get("gate", gate)
            terminal = cached_flight.get("terminal", terminal)

        airport_ctx = AirportContext(
            airport_code=airport_code,
            terminal=terminal,
            gate=gate,
            security_wait_minutes=security_wait,
            congestion_level=congestion,
            walking_time_to_gate_minutes=15
        )

        state["airport_context"] = airport_ctx
        logger.info(f"Airport context initialized for {airport_code}, Gate {gate} (congestion: {congestion})")

        return NodeResult(
            node_name="airport_context_init",
            status=NodeStatus.SUCCESS,
            data={"airport_context": airport_ctx.__dict__}
        )

    async def _checkin_status_check_node(self, state: Dict[str, Any]) -> NodeResult:
        """Verify if the user has checked in."""
        journey_context = state.get("journey_context", {})
        
        # In a real scenario, this would check a check-in tool or database
        checked_in = journey_context.get("checked_in", False)
        state["is_checked_in"] = checked_in

        if not checked_in:
            state["response_override"] = "Don't forget to check in for your flight! You can do this at the kiosks or via the airline app."
        
        return NodeResult(
            node_name="checkin_status_check",
            status=NodeStatus.SUCCESS,
            data={"is_checked_in": checked_in}
        )

    async def _security_wait_estimation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Estimate security wait times using Phase 2 cached data or direct API."""
        airport_ctx = state.get("airport_context")
        journey_context = state.get("journey_context", {})

        # Try cached Phase 2 airport intelligence first
        cached_airport = journey_context.get("monitoring", {}).get("airport_conditions")
        if cached_airport and "error" not in cached_airport:
            wait_time = cached_airport.get("security", {}).get("average_wait_minutes", airport_ctx.security_wait_minutes)
            crowd_level = cached_airport.get("security", {}).get("current_crowd_level", "moderate")
            logger.info(f"Security wait from Phase 2 monitor: {wait_time}min (crowd: {crowd_level})")
        else:
            # Fallback: try direct API call
            try:
                from ...phase_2_context_monitoring.context_tools import get_airport_intelligence
                result = get_airport_intelligence.invoke({"airport_code": airport_ctx.airport_code})
                if "error" not in result:
                    wait_time = result.get("security", {}).get("average_wait_minutes", airport_ctx.security_wait_minutes)
                    crowd_level = result.get("security", {}).get("current_crowd_level", "moderate")
                    logger.info(f"Security wait from direct API: {wait_time}min")
                else:
                    wait_time = airport_ctx.security_wait_minutes
                    crowd_level = airport_ctx.congestion_level
            except Exception as e:
                logger.warning(f"Airport intelligence API failed: {e}")
                wait_time = airport_ctx.security_wait_minutes
                crowd_level = airport_ctx.congestion_level

        state["security_wait"] = wait_time
        state["crowd_level"] = crowd_level

        return NodeResult(
            node_name="security_wait_estimation",
            status=NodeStatus.SUCCESS,
            data={"security_wait_minutes": wait_time, "crowd_level": crowd_level}
        )

    async def _gate_sync_node(self, state: Dict[str, Any]) -> NodeResult:
        """Monitor gate changes and calculate walking time using production TimelineCalculator."""
        airport_ctx = state.get("airport_context")
        journey_context = state.get("journey_context", {})
        
        # Monitor gate
        current_gate = journey_context.get("flight_status", {}).get("gate", airport_ctx.gate)
        if current_gate != airport_ctx.gate:
            logger.info(f"Gate change detected: {airport_ctx.gate} -> {current_gate}")
            airport_ctx.gate = current_gate
        
        # Use production TimelineCalculator for walking time
        result = self.timeline_calculator.calculate_time_to_gate(
            current_location="Security",
            gate=current_gate,
            airport_code=airport_ctx.airport_code,
            crowd_level=airport_ctx.congestion_level
        )
        
        state["walking_time"] = result["estimated_minutes"]
        state["gate_recommendation"] = result["recommendation"]
        
        return NodeResult(
            node_name="gate_sync",
            status=NodeStatus.SUCCESS,
            data={
                "current_gate": current_gate, 
                "walking_time": result["estimated_minutes"],
                "recommendation": result["recommendation"]
            }
        )

    async def _boarding_risk_assessment_node(self, state: Dict[str, Any]) -> NodeResult:
        """Calculate risk of missing boarding using production RiskEngine."""
        journey_context = state.get("journey_context", {})
        flight_status = journey_context.get("flight_status", {})
        
        # Get boarding time
        departure_str = flight_status.get("estimated_departure")
        if departure_str:
            departure_time = datetime.fromisoformat(departure_str)
            if departure_time.tzinfo is None:
                departure_time = departure_time.replace(tzinfo=timezone.utc)
        else:
            departure_time = datetime.now(timezone.utc) + timedelta(hours=2)
            
        boarding_time = departure_time - timedelta(minutes=45)
        
        # Use production RiskEngine
        assessment = self.risk_engine.calculate_boarding_risk(
            boarding_time=boarding_time,
            current_time=datetime.now(timezone.utc),
            security_wait_minutes=state.get("security_wait", 25),
            distance_to_gate_minutes=state.get("walking_time", 15),
            is_checked_in=state.get("is_checked_in", True)
        )
            
        state["boarding_risk_assessment"] = assessment
        state["boarding_time"] = boarding_time
        
        return NodeResult(
            node_name="boarding_risk_assessment",
            status=NodeStatus.SUCCESS,
            data={
                "risk_level": assessment.overall_level.value,
                "factors": [f.name for f in assessment.factors],
                "actions": assessment.recommended_actions
            }
        )

    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a smarter, LLM-powered airport recommendation.
        """
        airport_ctx = state.get("airport_context")
        security_wait = state.get("security_wait")
        boarding_risk = state.get("boarding_risk_assessment")
        journey_context = state.get("journey_context", {})
        
        if not airport_ctx:
            return NodeResult(node_name="smart_recommendation", status=NodeStatus.SKIPPED)

        # Build context for LLM
        context_data = {
            "airport": airport_ctx.airport_code,
            "terminal": airport_ctx.terminal,
            "gate": airport_ctx.gate,
            "security_wait": security_wait,
            "boarding_risk": boarding_risk.overall_level.value if hasattr(boarding_risk, "overall_level") else str(boarding_risk),
            "is_international": journey_context.get("is_international", False)
        }
        
        recommendation = await self.generate_smart_recommendation(
            recommendation_type="airport",
            title=f"Travel Tip for {airport_ctx.airport_code}",
            content_prompt=f"Based on a {security_wait} minute security wait and the user's location at Terminal {airport_ctx.terminal}, provide a helpful tip. Should they find a lounge? Is there a specific amenity nearby? Suggest one thing to do while waiting for Gate {airport_ctx.gate}. Keep it very brief.",
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
        if state.get("response_override"):
            state["response"] = state["response_override"]
            return NodeResult(node_name="generate_response", status=NodeStatus.SUCCESS)

        airport_ctx = state.get("airport_context")
        risk = state.get("boarding_risk")
        wait = state.get("security_wait")
        walk = state.get("walking_time")
        
        response_parts = [
            f"You're at {airport_ctx.airport_code}. Your flight departs from **Terminal {airport_ctx.terminal}, Gate {airport_ctx.gate}**.\n",
            f"\n• **Security wait:** ~{wait} minutes",
            f"\n• **Walk to gate:** ~{walk} minutes\n",
        ]
        
        if risk == "on_track":
            response_parts.append("\n✅ You're on track. Plenty of time to relax or grab a coffee.")
        elif risk == "watch":
            response_parts.append("\n⚠️ Time is getting a bit tight. I recommend heading towards security soon.")
        else:
            response_parts.append("\n🚨 **Action Needed:** Please head to your gate immediately to ensure you don't miss boarding.")
            
        state["response"] = "".join(response_parts)
        
        return NodeResult(
            node_name="generate_response",
            status=NodeStatus.SUCCESS
        )

    def _check_completion(self) -> bool:
        """Check if airport-to-flight segment should transition."""
        return self._state.get("is_boarded", False)

    def _get_next_segment(self) -> str:
        """Get the next segment after airport-to-flight."""
        return "flight_to_hotel"

def create_airport_to_flight_orchestrator() -> AirportToFlightOrchestrator:
    """Factory function to create an AirportToFlightOrchestrator."""
    return AirportToFlightOrchestrator()


def create_airport_to_flight_graph():
    """Create and return the compiled LangGraph for airport-to-flight orchestrator."""
    orchestrator = AirportToFlightOrchestrator()
    return orchestrator.build_graph()
