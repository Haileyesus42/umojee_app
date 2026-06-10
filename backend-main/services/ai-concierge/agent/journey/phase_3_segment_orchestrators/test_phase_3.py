"""
Phase 3: Test Suite - Segment Orchestrators

This test file validates the Phase 3 implementation including:
- Base segment orchestrator
- Inspiration orchestrator (Segment 1)
- Home to Airport orchestrator (Segment 2)

Run with: pytest agent/journey/phase_3_segment_orchestrators/test_phase_3.py -v

Note: Async tests require pytest-asyncio. Install with: pip install pytest-asyncio
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)
from .base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
    OrchestratorResult,
)
from .segments.inspiration import (
    InspirationOrchestrator,
    ConfidenceLevel,
    DestinationSuggestion,
    UserIntent,
    create_inspiration_orchestrator,
)
from .segments.home_to_airport import (
    HomeToAirportOrchestrator,
    TransportMode,
    TransportOption,
    RiskLevel,
    DepartureCalculation,
    RiskAssessment,
    create_home_to_airport_orchestrator,
)
from .segments.airport_to_flight import create_airport_to_flight_orchestrator
from .segments.flight_to_hotel import create_flight_to_hotel_orchestrator
from .segments.hotel_to_activities import create_hotel_to_activities_orchestrator
from .segments.return_journey import create_return_journey_orchestrator


# =============================================================================
# Base Orchestrator Tests
# =============================================================================

class TestBaseOrchestrator:
    """Tests for the base orchestrator functionality."""

    def test_node_result_creation(self):
        """Test creating a NodeResult."""
        result = NodeResult(
            node_name="test_node",
            status=NodeStatus.SUCCESS,
            data={"key": "value"}
        )

        assert result.node_name == "test_node"
        assert result.status == NodeStatus.SUCCESS
        assert result.data["key"] == "value"
        assert result.should_continue is True

    def test_orchestrator_result_creation(self):
        """Test creating an OrchestratorResult."""
        result = OrchestratorResult(
            segment_name="test_segment",
            success=True,
            nodes_executed=["node1", "node2"],
            response_message="Test response"
        )

        assert result.segment_name == "test_segment"
        assert result.success is True
        assert len(result.nodes_executed) == 2
        assert result.response_message == "Test response"


# =============================================================================
# Inspiration Orchestrator Tests
# =============================================================================

class TestInspirationOrchestrator:
    """Tests for the Trip Inspiration orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create an inspiration orchestrator for testing."""
        return create_inspiration_orchestrator()

    @pytest.mark.asyncio
    async def test_orchestrator_creation(self, orchestrator):
        """Test orchestrator is created correctly."""
        assert orchestrator.segment_name == "inspiration"
        assert len(orchestrator._nodes) > 0
        assert "intent_extraction" in orchestrator._nodes

    @pytest.mark.asyncio
    async def test_execute_with_message(self, orchestrator):
        """Test executing orchestrator with user message."""
        result = await orchestrator.execute(
            journey_context={},
            user_message="I want to go somewhere warm with beaches for a week"
        )

        assert result.success is True
        assert len(result.nodes_executed) > 0
        assert result.response_message is not None

    @pytest.mark.asyncio
    async def test_intent_extraction(self, orchestrator):
        """Test that intent is extracted correctly."""
        await orchestrator.execute(
            journey_context={},
            user_message="Beach vacation for 7 days, budget $3000"
        )

        state = orchestrator.get_state()
        assert "extracted_intent" in state
        assert state["extracted_intent"] is not None

    @pytest.mark.asyncio
    async def test_destination_suggestions(self, orchestrator):
        """Test that destination suggestions are generated."""
        await orchestrator.execute(
            journey_context={},
            user_message="I want a relaxing beach vacation"
        )

        state = orchestrator.get_state()
        assert "suggestions" in state
        assert len(state["suggestions"]) > 0

    @pytest.mark.asyncio
    async def test_confidence_levels(self, orchestrator):
        """Test that confidence levels are assigned."""
        await orchestrator.execute(
            journey_context={},
            user_message="Beach vacation"
        )

        state = orchestrator.get_state()
        suggestions = state.get("suggestions", [])

        assert len(suggestions) > 0
        for suggestion in suggestions:
            assert hasattr(suggestion, "confidence")
            assert suggestion.confidence in ConfidenceLevel

    def test_user_intent_dataclass(self):
        """Test UserIntent dataclass."""
        intent = UserIntent(
            travel_type="vacation",
            duration_days=7,
            budget_range=(2000, 5000),
            interests=["beaches", "culture"]
        )

        assert intent.travel_type == "vacation"
        assert intent.duration_days == 7
        assert intent.budget_range == (2000, 5000)

    def test_destination_suggestion_dataclass(self):
        """Test DestinationSuggestion dataclass."""
        suggestion = DestinationSuggestion(
            destination="Bali",
            country="Indonesia",
            confidence=ConfidenceLevel.VERY_GOOD,
            match_reasons=["Beautiful beaches"],
            budget_estimate=3500,
            budget_comfort="comfortable",
            best_time_to_visit="April-October",
            highlights=["Temples", "Rice terraces"]
        )

        assert suggestion.destination == "Bali"
        assert suggestion.confidence == ConfidenceLevel.VERY_GOOD

    @pytest.mark.asyncio
    async def test_next_segment(self, orchestrator):
        """Test that correct next segment is returned."""
        assert orchestrator._get_next_segment() == "home_to_airport"


# =============================================================================
# Home to Airport Orchestrator Tests
# =============================================================================

class TestHomeToAirportOrchestrator:
    """Tests for the Home to Airport orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create a home-to-airport orchestrator for testing."""
        return create_home_to_airport_orchestrator()

    @pytest.mark.asyncio
    async def test_orchestrator_creation(self, orchestrator):
        """Test orchestrator is created correctly."""
        assert orchestrator.segment_name == "home_to_airport"
        assert "location_setup" in orchestrator._nodes
        assert "departure_calculation" in orchestrator._nodes
        assert "risk_calculation" in orchestrator._nodes

    @pytest.mark.asyncio
    async def test_execute_basic(self, orchestrator):
        """Test basic execution."""
        journey_context = {
            "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
            "is_international": True
        }

        result = await orchestrator.execute(journey_context=journey_context)

        assert result.success is True
        assert len(result.nodes_executed) > 0
        assert result.response_message is not None

    @pytest.mark.asyncio
    async def test_departure_calculation(self, orchestrator):
        """Test departure time calculation."""
        journey_context = {
            "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
            "is_international": True
        }

        await orchestrator.execute(journey_context=journey_context)
        state = orchestrator.get_state()

        assert "departure_calculation" in state
        calc = state["departure_calculation"]
        assert calc.recommended_departure is not None
        assert calc.total_buffer_minutes > 0

    @pytest.mark.asyncio
    async def test_transport_recommendations(self, orchestrator):
        """Test transport options are generated."""
        await orchestrator.execute(journey_context={})
        state = orchestrator.get_state()

        assert "transport_options" in state
        options = state["transport_options"]
        assert len(options) > 0

        # First option should be recommended (highest reliability)
        assert options[0].recommended is True

    @pytest.mark.asyncio
    async def test_risk_calculation(self, orchestrator):
        """Test risk assessment is performed."""
        journey_context = {
            "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        }

        await orchestrator.execute(journey_context=journey_context)
        state = orchestrator.get_state()

        assert "risk_assessment" in state
        risk = state["risk_assessment"]
        # Production RiskAssessment uses overall_level
        level = risk.overall_level if hasattr(risk, "overall_level") else risk.level
        assert level in RiskLevel or level.value in [r.value for r in RiskLevel]
        assert len(risk.factors) > 0

    @pytest.mark.asyncio
    async def test_notifications_scheduled(self, orchestrator):
        """Test notifications are scheduled."""
        journey_context = {
            "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        }

        await orchestrator.execute(journey_context=journey_context)
    
        # Production NotificationScheduler tracks schedules internally
        pending = orchestrator.notification_scheduler.get_pending_schedules()
        assert len(pending) >= 2  # At least get_ready and time_to_leave

    def test_transport_option_dataclass(self):
        """Test TransportOption dataclass."""
        option = TransportOption(
            mode=TransportMode.TAXI,
            estimated_duration_minutes=45,
            estimated_cost=65.0,
            reliability_score=0.9,
            comfort_score=0.8,
            recommended=True,
            notes=["Door-to-door service"]
        )

        assert option.mode == TransportMode.TAXI
        assert option.reliability_score == 0.9

    def test_departure_calculation_dataclass(self):
        """Test DepartureCalculation dataclass."""
        now = datetime.now(timezone.utc)
        calc = DepartureCalculation(
            recommended_departure=now,
            latest_safe_departure=now + timedelta(minutes=30),
            factors={"checkin": 180, "security": 30},
            total_buffer_minutes=210,
            confidence=0.85
        )

        assert calc.total_buffer_minutes == 210
        assert calc.confidence == 0.85

    def test_risk_assessment_dataclass(self):
        """Test RiskAssessment dataclass."""
        assessment = RiskAssessment(
            level=RiskLevel.ON_TRACK,
            factors=["Plenty of time"],
            recommended_actions=[],
            time_buffer_remaining_minutes=120
        )

        assert assessment.level == RiskLevel.ON_TRACK
        assert assessment.time_buffer_remaining_minutes == 120

    @pytest.mark.asyncio
    async def test_domestic_vs_international(self, orchestrator):
        """Test different buffer for domestic vs international."""
        # International flight
        result_intl = await orchestrator.execute(
            journey_context={
                "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
                "is_international": True
            }
        )
        state_intl = orchestrator.get_state()

        # Reset orchestrator
        orchestrator = create_home_to_airport_orchestrator()

        # Domestic flight
        result_dom = await orchestrator.execute(
            journey_context={
                "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
                "is_international": False
            }
        )
        state_dom = orchestrator.get_state()

        # International should have larger buffer
        intl_buffer = state_intl["departure_calculation"].total_buffer_minutes
        dom_buffer = state_dom["departure_calculation"].total_buffer_minutes

        assert intl_buffer > dom_buffer

    @pytest.mark.asyncio
    async def test_next_segment(self, orchestrator):
        """Test that correct next segment is returned."""
        assert orchestrator._get_next_segment() == "airport_to_flight"


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase3Integration:
    """Integration tests for Phase 3 orchestrators."""

    @pytest.mark.asyncio
    async def test_inspiration_to_home_transition(self):
        """Test that inspiration segment correctly identifies next segment."""
        inspiration = create_inspiration_orchestrator()

        result = await inspiration.execute(
            journey_context={},
            user_message="I want to go to Bali"
        )

        # Should transition to home_to_airport when destination confirmed
        assert inspiration._get_next_segment() == "home_to_airport"

    @pytest.mark.asyncio
    async def test_orchestrator_state_isolation(self):
        """Test that multiple orchestrator instances don't share state."""
        orch1 = create_inspiration_orchestrator()
        orch2 = create_inspiration_orchestrator()

        await orch1.execute(
            journey_context={"test": "value1"},
            user_message="Message 1"
        )

        await orch2.execute(
            journey_context={"test": "value2"},
            user_message="Message 2"
        )

        state1 = orch1.get_state()
        state2 = orch2.get_state()

        assert state1["journey_context"]["test"] == "value1"
        assert state2["journey_context"]["test"] == "value2"

    @pytest.mark.asyncio
    async def test_full_segment_flow(self):
        """Test a complete flow through both implemented segments."""
        # Phase 1: Inspiration
        inspiration = create_inspiration_orchestrator()
        insp_result = await inspiration.execute(
            journey_context={},
            user_message="I want a beach vacation in Bali"
        )

        assert insp_result.success is True

        # Phase 2: Home to Airport (would be triggered after booking)
        home_to_airport = create_home_to_airport_orchestrator()
        hta_result = await home_to_airport.execute(
            journey_context={
                "flight_departure": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
                "destination": "Bali",
                "is_international": True
            }
        )

        assert hta_result.success is True
        assert hta_result.response_message is not None


# =============================================================================
# Airport to Flight Orchestrator Tests
# =============================================================================

class TestAirportToFlightOrchestrator:
    """Tests for the Airport to Flight orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create an airport-to-flight orchestrator for testing."""
        return create_airport_to_flight_orchestrator()

    @pytest.mark.asyncio
    async def test_orchestrator_creation(self, orchestrator):
        """Test orchestrator is created correctly."""
        assert orchestrator.segment_name == "airport_to_flight"
        assert "airport_context_init" in orchestrator._nodes

    @pytest.mark.asyncio
    async def test_execute_basic(self, orchestrator):
        """Test basic execution."""
        journey_context = {
            "flight_status": {
                "departure_airport": "JFK",
                "gate": "B12",
                "estimated_departure": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
            },
            "checked_in": True
        }
        result = await orchestrator.execute(journey_context=journey_context)
        assert result.success is True
        assert "Terminal" in result.response_message

# =============================================================================
# Flight to Hotel Orchestrator Tests
# =============================================================================

class TestFlightToHotelOrchestrator:
    """Tests for the Flight to Hotel orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create a flight-to-hotel orchestrator for testing."""
        return create_flight_to_hotel_orchestrator()

    @pytest.mark.asyncio
    async def test_execute_basic(self, orchestrator):
        """Test basic execution."""
        journey_context = {"is_international": True}
        result = await orchestrator.execute(journey_context=journey_context)
        assert result.success is True
        assert "immigration" in result.response_message.lower()

# =============================================================================
# Hotel to Activities Orchestrator Tests
# =============================================================================

class TestHotelToActivitiesOrchestrator:
    """Tests for the Hotel to Activities orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create a hotel-to-activities orchestrator for testing."""
        return create_hotel_to_activities_orchestrator()

    @pytest.mark.asyncio
    async def test_execute_with_energy(self, orchestrator):
        """Test execution with energy levels."""
        journey_context = {"energy_level": "tired"}
        result = await orchestrator.execute(journey_context=journey_context)
        assert result.success is True
        assert "relaxing" in result.response_message.lower()

# =============================================================================
# Return Journey Orchestrator Tests
# =============================================================================

class TestReturnJourneyOrchestrator:
    """Tests for the Return Journey orchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create a return orchestrator for testing."""
        return create_return_journey_orchestrator()

    @pytest.mark.asyncio
    async def test_execute_basic(self, orchestrator):
        """Test basic execution."""
        result = await orchestrator.execute(journey_context={})
        assert result.success is True
        assert "checkout" in result.response_message.lower()

# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
