"""
Phase 1: Test Suite - Journey State Management

This test file validates the Phase 1 implementation including:
- Journey data models
- Journey state manager
- Segment state machines

Run with: pytest agent/journey/phase_1_foundation/test_phase_1.py -v
"""

import pytest
from datetime import datetime, timedelta
from .journey_models import (
    Journey,
    JourneySegment,
    JourneyStatus,
    JourneyContext,
    SegmentState,
    SegmentStatus,
    RiskLevel,
    LocationContext,
    WeatherContext,
    FlightStatusContext,
    EnergyLevel,
    BudgetComfort,
    Milestone,
)
from .journey_state import JourneyStateManager
from .segments import SegmentStateMachine, SegmentCriteria


# =============================================================================
# Journey Models Tests
# =============================================================================

class TestJourneyModels:
    """Tests for Journey data models."""

    def test_journey_creation(self):
        """Test basic journey creation."""
        journey = Journey(user_id="user123")

        assert journey.user_id == "user123"
        assert journey.status == JourneyStatus.PLANNING
        assert journey.current_segment == JourneySegment.INSPIRATION
        assert len(journey.segments) == 6  # All 6 segments initialized

    def test_journey_segments_initialized(self):
        """Test that all segments are initialized on journey creation."""
        journey = Journey(user_id="user123")

        segment_types = [s.segment_type for s in journey.segments]

        assert JourneySegment.INSPIRATION in segment_types
        assert JourneySegment.HOME_TO_AIRPORT in segment_types
        assert JourneySegment.AIRPORT_TO_FLIGHT in segment_types
        assert JourneySegment.FLIGHT_TO_HOTEL in segment_types
        assert JourneySegment.HOTEL_TO_ACTIVITIES in segment_types
        assert JourneySegment.RETURN in segment_types

    def test_get_segment(self):
        """Test getting a specific segment."""
        journey = Journey(user_id="user123")

        segment = journey.get_segment(JourneySegment.HOME_TO_AIRPORT)

        assert segment is not None
        assert segment.segment_type == JourneySegment.HOME_TO_AIRPORT
        assert segment.status == SegmentStatus.PENDING

    def test_segment_activation(self):
        """Test activating a segment."""
        segment = SegmentState(segment_type=JourneySegment.INSPIRATION)

        assert segment.status == SegmentStatus.PENDING
        assert segment.activated_at is None

        segment.activate()

        assert segment.status == SegmentStatus.ACTIVE
        assert segment.activated_at is not None

    def test_segment_completion(self):
        """Test completing a segment."""
        segment = SegmentState(segment_type=JourneySegment.INSPIRATION)
        segment.activate()

        segment.complete()

        assert segment.status == SegmentStatus.COMPLETED
        assert segment.completed_at is not None

    def test_milestone_management(self):
        """Test adding and completing milestones."""
        segment = SegmentState(segment_type=JourneySegment.HOME_TO_AIRPORT)

        # Add milestone
        milestone = segment.add_milestone("Check traffic", "Monitor traffic conditions")

        assert len(segment.milestones) == 1
        assert milestone.name == "Check traffic"
        assert milestone.completed is False

        # Complete milestone
        result = segment.complete_milestone(milestone.id)

        assert result is True
        assert milestone.completed is True
        assert milestone.completed_at is not None

    def test_journey_context(self):
        """Test journey context with all factors."""
        context = JourneyContext(
            location=LocationContext(
                latitude=40.7128,
                longitude=-74.0060,
                city="New York",
            ),
            weather=WeatherContext(
                condition="sunny",
                temperature_celsius=22.5,
            ),
            energy_level=EnergyLevel.FRESH,
            budget_comfort=BudgetComfort.COMFORTABLE,
        )

        assert context.location.city == "New York"
        assert context.weather.condition == "sunny"
        assert context.energy_level == EnergyLevel.FRESH

    def test_journey_to_mongo_dict(self):
        """Test converting journey to MongoDB document."""
        journey = Journey(user_id="user123", conversation_id="conv456")

        doc = journey.to_mongo_dict()

        assert doc["_id"] == journey.journey_id
        assert doc["user_id"] == "user123"
        assert doc["conversation_id"] == "conv456"
        assert doc["status"] == "planning"
        assert len(doc["segments"]) == 6


# =============================================================================
# Journey State Manager Tests
# =============================================================================

class TestJourneyStateManager:
    """Tests for Journey State Manager."""

    def test_initialize_journey(self):
        """Test journey initialization."""
        manager = JourneyStateManager()

        journey = manager.initialize_journey(user_id="user123")

        assert journey is not None
        assert journey.user_id == "user123"
        # First segment (inspiration) should be active
        inspiration = journey.get_segment(JourneySegment.INSPIRATION)
        assert inspiration.status == SegmentStatus.ACTIVE

    def test_get_journey(self):
        """Test retrieving a journey."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        retrieved = manager.get_journey(journey.journey_id)

        assert retrieved is not None
        assert retrieved.journey_id == journey.journey_id

    def test_update_segment_status(self):
        """Test updating segment status."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        segment = manager.update_segment_status(
            journey.journey_id,
            JourneySegment.HOME_TO_AIRPORT,
            SegmentStatus.ACTIVE,
            RiskLevel.WATCH
        )

        assert segment is not None
        assert segment.status == SegmentStatus.ACTIVE
        assert segment.risk_level == RiskLevel.WATCH

    def test_transition_segment(self):
        """Test transitioning between segments."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        # Transition from inspiration to home_to_airport
        result = manager.transition_segment(
            journey.journey_id,
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT
        )

        assert result is True

        # Verify states
        updated_journey = manager.get_journey(journey.journey_id)
        inspiration = updated_journey.get_segment(JourneySegment.INSPIRATION)
        home_to_airport = updated_journey.get_segment(JourneySegment.HOME_TO_AIRPORT)

        assert inspiration.status == SegmentStatus.COMPLETED
        assert home_to_airport.status == SegmentStatus.ACTIVE
        assert updated_journey.current_segment == JourneySegment.HOME_TO_AIRPORT

    def test_update_context(self):
        """Test updating journey context."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        context = manager.update_context(
            journey.journey_id,
            {
                "energy_level": EnergyLevel.TIRED,
                "timezone": "America/New_York"
            }
        )

        assert context is not None
        assert context.energy_level == EnergyLevel.TIRED
        assert context.timezone == "America/New_York"

    def test_get_active_segment(self):
        """Test getting the active segment."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        active = manager.get_active_segment(journey.journey_id)

        assert active is not None
        assert active.segment_type == JourneySegment.INSPIRATION
        assert active.status == SegmentStatus.ACTIVE

    def test_complete_journey(self):
        """Test completing a journey."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        result = manager.complete_journey(journey.journey_id)

        assert result is True

        updated = manager.get_journey(journey.journey_id)
        assert updated.status == JourneyStatus.COMPLETED

    def test_cancel_journey(self):
        """Test cancelling a journey."""
        manager = JourneyStateManager()
        journey = manager.initialize_journey(user_id="user123")

        result = manager.cancel_journey(journey.journey_id)

        assert result is True

        updated = manager.get_journey(journey.journey_id)
        assert updated.status == JourneyStatus.CANCELLED


# =============================================================================
# Segment State Machine Tests
# =============================================================================

class TestSegmentStateMachine:
    """Tests for Segment State Machine."""

    def test_segment_order(self):
        """Test that segment order is correct."""
        machine = SegmentStateMachine()

        assert machine.SEGMENT_ORDER == [
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT,
            JourneySegment.AIRPORT_TO_FLIGHT,
            JourneySegment.FLIGHT_TO_HOTEL,
            JourneySegment.HOTEL_TO_ACTIVITIES,
            JourneySegment.RETURN,
        ]

    def test_get_next_segment(self):
        """Test getting the next segment in order."""
        machine = SegmentStateMachine()

        assert machine.get_next_segment(JourneySegment.INSPIRATION) == JourneySegment.HOME_TO_AIRPORT
        assert machine.get_next_segment(JourneySegment.HOME_TO_AIRPORT) == JourneySegment.AIRPORT_TO_FLIGHT
        assert machine.get_next_segment(JourneySegment.RETURN) is None  # Last segment

    def test_check_activation_criteria_first_segment(self):
        """Test that first segment can always be activated."""
        machine = SegmentStateMachine()
        journey = Journey(user_id="user123")

        can_activate = machine.check_activation_criteria(journey, JourneySegment.INSPIRATION)

        assert can_activate is True

    def test_check_activation_criteria_requires_previous(self):
        """Test that later segments require previous completion."""
        machine = SegmentStateMachine()
        journey = Journey(user_id="user123")

        # Cannot activate home_to_airport without completing inspiration
        can_activate = machine.check_activation_criteria(
            journey,
            JourneySegment.HOME_TO_AIRPORT
        )

        # This depends on the booking criteria, so it should fail
        assert can_activate is False

    def test_should_transition_no_transition_needed(self):
        """Test that no transition happens when criteria not met."""
        machine = SegmentStateMachine()
        journey = Journey(user_id="user123")

        # Activate inspiration
        inspiration = journey.get_segment(JourneySegment.INSPIRATION)
        inspiration.activate()

        # No transition should happen (completion criteria not met)
        next_segment = machine.should_transition(journey)

        assert next_segment is None

    def test_custom_criteria_creation(self):
        """Test creating custom segment criteria."""
        from .segments import create_custom_criteria

        criteria = create_custom_criteria(
            JourneySegment.INSPIRATION,
            activation_conditions=[lambda j: True],
            completion_conditions=[lambda j: j.user_id == "user123"]
        )

        journey = Journey(user_id="user123")

        assert criteria.can_activate(journey) is True
        assert criteria.is_complete(journey) is True

    def test_criteria_all_conditions_must_pass(self):
        """Test that all criteria conditions must pass."""
        from .segments import create_custom_criteria

        criteria = create_custom_criteria(
            JourneySegment.INSPIRATION,
            activation_conditions=[
                lambda j: True,
                lambda j: False,  # This will fail
            ],
            completion_conditions=[]
        )

        journey = Journey(user_id="user123")

        # Should fail because one condition returns False
        assert criteria.can_activate(journey) is False


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase1Integration:
    """Integration tests for Phase 1 components working together."""

    def test_full_journey_lifecycle(self):
        """Test a complete journey lifecycle through state manager."""
        manager = JourneyStateManager()

        # 1. Initialize journey
        journey = manager.initialize_journey(
            user_id="user123",
            conversation_id="conv456"
        )
        assert journey.status == JourneyStatus.PLANNING

        # 2. Verify first segment is active
        active = manager.get_active_segment(journey.journey_id)
        assert active.segment_type == JourneySegment.INSPIRATION

        # 3. Transition to next segment
        manager.transition_segment(
            journey.journey_id,
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT
        )

        # 4. Verify transition
        journey = manager.get_journey(journey.journey_id)
        assert journey.status == JourneyStatus.IN_PROGRESS
        assert journey.current_segment == JourneySegment.HOME_TO_AIRPORT

        # 5. Update context
        manager.update_context(journey.journey_id, {"energy_level": EnergyLevel.MODERATE})

        # 6. Complete journey
        manager.complete_journey(journey.journey_id)

        final_journey = manager.get_journey(journey.journey_id)
        assert final_journey.status == JourneyStatus.COMPLETED

    def test_state_machine_with_manager(self):
        """Test state machine working with state manager."""
        manager = JourneyStateManager()
        machine = SegmentStateMachine()

        journey = manager.initialize_journey(user_id="user123")

        # State machine should identify next segment
        next_seg = machine.get_next_segment(journey.current_segment)
        assert next_seg == JourneySegment.HOME_TO_AIRPORT

    def test_multiple_journeys_isolation(self):
        """Test that multiple journeys don't interfere with each other."""
        manager = JourneyStateManager()

        # Create two journeys
        journey1 = manager.initialize_journey(user_id="user1")
        journey2 = manager.initialize_journey(user_id="user2")

        # Transition journey1 only
        manager.transition_segment(
            journey1.journey_id,
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT
        )

        # Verify journey2 is unaffected
        j1 = manager.get_journey(journey1.journey_id)
        j2 = manager.get_journey(journey2.journey_id)

        assert j1.current_segment == JourneySegment.HOME_TO_AIRPORT
        assert j2.current_segment == JourneySegment.INSPIRATION


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
