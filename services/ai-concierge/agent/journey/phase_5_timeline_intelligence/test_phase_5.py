"""
Phase 5: Test Suite - Timeline & Intelligence

This test file validates the Phase 5 implementation including:
- Timeline calculator
- Journey intelligence layer
- Adaptation engine

Run with: pytest agent/journey/phase_5_timeline_intelligence/test_phase_5.py -v
"""

import pytest
from datetime import datetime, timedelta, timezone
from .timeline_calculator import (
    TimelineCalculator,
    TimelineEvent,
    JourneyTimeline,
    EventType,
)
from .intelligence import (
    JourneyIntelligence,
    ConfidenceLevel,
    ConfidenceIndicator,
    DestinationMatch,
    ComparisonView,
)
from .adaptation_engine import (
    AdaptationEngine,
    Disruption,
    DisruptionType,
    DisruptionSeverity,
    ImpactAssessment,
    AdaptedPlan,
)


# =============================================================================
# Timeline Calculator Tests
# =============================================================================

class TestTimelineCalculator:
    """Tests for the Timeline Calculator."""

    @pytest.fixture
    def calculator(self):
        """Create a timeline calculator for testing."""
        return TimelineCalculator()

    def test_calculate_departure_time_international(self, calculator):
        """Test departure time calculation for international flight."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=8)

        result = calculator.calculate_departure_time(
            flight_time=flight_time,
            travel_duration_minutes=45,
            is_international=True,
            has_checked_bags=True
        )

        assert result["recommended_departure"] < flight_time
        assert result["total_buffer_minutes"] > 180  # At least 3 hours buffer
        assert "components" in result

    def test_calculate_departure_time_domestic(self, calculator):
        """Test departure time calculation for domestic flight."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=5)

        result = calculator.calculate_departure_time(
            flight_time=flight_time,
            travel_duration_minutes=45,
            is_international=False,
            has_checked_bags=True
        )

        # Domestic should have smaller buffer
        intl_result = calculator.calculate_departure_time(
            flight_time=flight_time,
            travel_duration_minutes=45,
            is_international=True
        )

        assert result["total_buffer_minutes"] < intl_result["total_buffer_minutes"]

    def test_calculate_arrival_eta(self, calculator):
        """Test arrival ETA calculation."""
        landing_time = datetime.now(timezone.utc) + timedelta(hours=6)

        result = calculator.calculate_arrival_eta(
            landing_time=landing_time,
            is_international=True,
            has_checked_bags=True,
            transfer_time_minutes=30
        )

        assert result["estimated_arrival"] > landing_time
        assert "immigration" in result["components"]
        assert "baggage_claim" in result["components"]

    def test_calculate_time_to_gate(self, calculator):
        """Test time to gate calculation."""
        result = calculator.calculate_time_to_gate(
            current_location="security",
            gate="B22",
            airport_code="JFK",
            crowd_level="moderate"
        )

        assert result["estimated_minutes"] > 0
        assert "recommendation" in result

    def test_crowd_level_affects_gate_time(self, calculator):
        """Test that crowd level affects time to gate."""
        light = calculator.calculate_time_to_gate(
            current_location="security",
            gate="B22",
            airport_code="JFK",
            crowd_level="light"
        )

        heavy = calculator.calculate_time_to_gate(
            current_location="security",
            gate="B22",
            airport_code="JFK",
            crowd_level="heavy"
        )

        assert heavy["estimated_minutes"] > light["estimated_minutes"]

    def test_calculate_activity_duration(self, calculator):
        """Test activity duration calculation."""
        result = calculator.calculate_activity_duration(
            activity_type="museum_visit",
            base_duration_hours=2.0,
            user_pace="moderate"
        )

        assert result["estimated_duration_hours"] == 2.0
        assert result["buffer_minutes"] > 0
        assert result["total_block_minutes"] > result["estimated_duration_minutes"]

    def test_pace_affects_activity_duration(self, calculator):
        """Test that pace affects activity duration."""
        quick = calculator.calculate_activity_duration(
            activity_type="tour",
            base_duration_hours=2.0,
            user_pace="quick"
        )

        leisurely = calculator.calculate_activity_duration(
            activity_type="tour",
            base_duration_hours=2.0,
            user_pace="leisurely"
        )

        assert leisurely["estimated_duration_hours"] > quick["estimated_duration_hours"]

    def test_build_journey_timeline(self, calculator):
        """Test building a complete journey timeline."""
        now = datetime.now(timezone.utc)

        timeline = calculator.build_journey_timeline(
            flight_departure=now + timedelta(hours=24),
            flight_arrival=now + timedelta(hours=30),
            hotel_checkin=now + timedelta(hours=32),
            hotel_checkout=now + timedelta(days=5),
            return_flight_departure=now + timedelta(days=5, hours=4),
            return_flight_arrival=now + timedelta(days=5, hours=10),
            is_international=True
        )

        assert len(timeline.events) > 0
        assert timeline.departure_date is not None
        assert timeline.return_date is not None

    def test_recalculate_on_delay(self, calculator):
        """Test timeline recalculation when delayed."""
        now = datetime.now(timezone.utc)

        timeline = calculator.build_journey_timeline(
            flight_departure=now + timedelta(hours=24),
            flight_arrival=now + timedelta(hours=30),
            hotel_checkin=now + timedelta(hours=32),
            hotel_checkout=now + timedelta(days=5),
            return_flight_departure=now + timedelta(days=5, hours=4),
            return_flight_arrival=now + timedelta(days=5, hours=10)
        )

        original_events = len(timeline.events)

        # Delay the first event
        first_event_id = timeline.events[0].event_id
        updated = calculator.recalculate_on_delay(
            timeline=timeline,
            delayed_event_id=first_event_id,
            delay_minutes=30
        )

        assert len(updated.events) == original_events
        assert updated.last_calculated is not None


# =============================================================================
# Journey Intelligence Tests
# =============================================================================

class TestJourneyIntelligence:
    """Tests for the Journey Intelligence layer."""

    @pytest.fixture
    def intelligence(self):
        """Create a journey intelligence instance for testing."""
        return JourneyIntelligence()

    def test_explain_destination_match(self, intelligence):
        """Test destination match explanation."""
        user_intent = {
            "interests": ["beach", "culture", "food"],
            "budget_range": (2000, 5000),
            "duration_days": 7
        }

        match = intelligence.explain_destination_match("Bali", user_intent)

        assert match.destination == "Bali"
        assert match.country == "Indonesia"
        assert len(match.match_reasons) > 0
        assert match.confidence is not None

    def test_calculate_confidence_indicator_high(self, intelligence):
        """Test high confidence calculation."""
        confidence = intelligence.calculate_confidence_indicator(
            match_factors=["Great beaches", "Rich culture", "Affordable", "Good weather"],
            concern_factors=[]
        )

        assert confidence.level == ConfidenceLevel.VERY_GOOD
        assert confidence.score >= 0.75

    def test_calculate_confidence_indicator_with_concerns(self, intelligence):
        """Test confidence with concerns."""
        confidence = intelligence.calculate_confidence_indicator(
            match_factors=["Good beaches"],
            concern_factors=["Over budget", "Too far"]
        )

        assert confidence.level in [ConfidenceLevel.POSSIBLE, ConfidenceLevel.UNCERTAIN]
        assert confidence.score < 0.75

    def test_generate_comparison_view_destinations(self, intelligence):
        """Test destination comparison view."""
        options = [
            {
                "destination": "Bali",
                "budget_comfort": "comfortable",
                "duration_fit": "perfect",
                "activities_count": 15,
                "weather_match": "excellent",
                "overall_score": 0.9,
                "highlights": ["Beaches", "Temples", "Food"]
            },
            {
                "destination": "Tokyo",
                "budget_comfort": "stretch",
                "duration_fit": "good",
                "activities_count": 20,
                "weather_match": "good",
                "overall_score": 0.8,
                "highlights": ["Culture", "Food", "Shopping"]
            }
        ]

        comparison = intelligence.generate_comparison_view(options, "destination")

        assert comparison.comparison_type == "destination"
        assert len(comparison.items) == 2
        assert comparison.recommendation == "Bali"  # Higher score

    def test_generate_comparison_view_transport(self, intelligence):
        """Test transport comparison view."""
        options = [
            {
                "mode": "Taxi",
                "cost": 65,
                "duration_minutes": 45,
                "reliability": 0.9,
                "comfort_level": "high"
            },
            {
                "mode": "Subway",
                "cost": 12,
                "duration_minutes": 60,
                "reliability": 0.85,
                "comfort_level": "medium"
            }
        ]

        comparison = intelligence.generate_comparison_view(options, "transport")

        assert comparison.comparison_type == "transport"
        assert len(comparison.items) == 2

    def test_frame_budget_comfort_comfortable(self, intelligence):
        """Test budget framing for comfortable budget."""
        result = intelligence.frame_budget_comfort(
            estimated_cost=2000,
            user_budget=5000
        )
    
        from ..phase_1_foundation import BudgetComfort
        assert result["comfort"] == BudgetComfort.COMFORTABLE
        assert "within" in result["message"].lower()

    def test_frame_budget_comfort_stretch(self, intelligence):
        """Test budget framing for stretch budget."""
        result = intelligence.frame_budget_comfort(
            estimated_cost=4800,
            user_budget=5000
        )
    
        from ..phase_1_foundation import BudgetComfort
        assert result["comfort"] == BudgetComfort.STRETCH

    def test_frame_budget_comfort_premium(self, intelligence):
        """Test budget framing for premium budget."""
        result = intelligence.frame_budget_comfort(
            estimated_cost=7500,
            user_budget=5000
        )
    
        from ..phase_1_foundation import BudgetComfort
        assert result["comfort"] == BudgetComfort.PREMIUM

    def test_check_time_feasibility_realistic(self, intelligence):
        """Test feasibility check for realistic trip."""
        result = intelligence.check_time_feasibility(
            travel_duration_hours=8,
            trip_length_days=7,
            activities_planned=5
        )

        assert result["feasibility"] == "realistic"
        assert result["usable_days"] > 5

    def test_check_time_feasibility_rushed(self, intelligence):
        """Test feasibility check for rushed trip."""
        result = intelligence.check_time_feasibility(
            travel_duration_hours=12,
            trip_length_days=3,
            activities_planned=6
        )

        assert result["feasibility"] in ["rushed", "unrealistic"]


# =============================================================================
# Adaptation Engine Tests
# =============================================================================

class TestAdaptationEngine:
    """Tests for the Adaptation Engine."""

    @pytest.fixture
    def engine(self):
        """Create an adaptation engine for testing."""
        return AdaptationEngine()

    def test_detect_flight_delay(self, engine):
        """Test detecting flight delay disruption."""
        context_update = {
            "flight_status": {
                "flight_number": "UA123",
                "delay_minutes": 45,
                "status": "delayed"
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        assert disruption is not None
        assert disruption.disruption_type == DisruptionType.FLIGHT_DELAY
        assert disruption.impact_minutes == 45

    def test_detect_flight_cancellation(self, engine):
        """Test detecting flight cancellation disruption."""
        context_update = {
            "flight_status": {
                "flight_number": "UA123",
                "status": "cancelled"
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        assert disruption is not None
        assert disruption.disruption_type == DisruptionType.FLIGHT_CANCELLATION
        assert disruption.severity == DisruptionSeverity.CRITICAL

    def test_detect_traffic_delay(self, engine):
        """Test detecting traffic delay disruption."""
        context_update = {
            "traffic": {
                "delay_minutes": 45,
                "conditions": "heavy"
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        assert disruption is not None
        assert disruption.disruption_type == DisruptionType.TRAFFIC

    def test_detect_weather_disruption(self, engine):
        """Test detecting weather disruption."""
        context_update = {
            "weather": {
                "condition": "storm",
                "severity": "severe"
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        assert disruption is not None
        assert disruption.disruption_type == DisruptionType.WEATHER
        assert disruption.severity == DisruptionSeverity.MAJOR

    def test_no_disruption_detected(self, engine):
        """Test no disruption when conditions are normal."""
        context_update = {
            "flight_status": {
                "delay_minutes": 0,
                "status": "on_time"
            },
            "traffic": {
                "delay_minutes": 10
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        assert disruption is None

    def test_calculate_impact(self, engine):
        """Test impact calculation."""
        disruption = Disruption(
            disruption_type=DisruptionType.FLIGHT_DELAY,
            severity=DisruptionSeverity.MODERATE,
            impact_minutes=60,
            affected_segments=["flight_to_hotel"]
        )

        timeline = [
            {"event_id": "e1", "segment": "airport_to_flight"},
            {"event_id": "e2", "segment": "flight_to_hotel"},
            {"event_id": "e3", "segment": "hotel_to_activities"}
        ]

        impact = engine.calculate_impact(disruption, timeline)

        assert "e2" in impact.affected_events
        assert impact.total_delay_minutes == 60

    def test_generate_adapted_plan_delay(self, engine):
        """Test generating adapted plan for delay."""
        disruption = Disruption(
            disruption_type=DisruptionType.FLIGHT_DELAY,
            severity=DisruptionSeverity.MODERATE,
            description="Flight delayed by 60 minutes",
            impact_minutes=60,
            affected_segments=["flight_to_hotel"]
        )

        current_plan = {
            "events": [
                {"event_id": "e1", "segment": "flight_to_hotel"}
            ]
        }

        adapted_plan = engine.generate_adapted_plan(disruption, current_plan)

        assert adapted_plan is not None
        assert len(adapted_plan.adjustments) > 0
        assert adapted_plan.summary != ""

    def test_generate_adapted_plan_cancellation(self, engine):
        """Test generating adapted plan for cancellation."""
        disruption = Disruption(
            disruption_type=DisruptionType.FLIGHT_CANCELLATION,
            severity=DisruptionSeverity.CRITICAL,
            description="Flight cancelled",
            impact_minutes=1440,
            affected_segments=["airport_to_flight"]
        )

        adapted_plan = engine.generate_adapted_plan(disruption, {"events": []})

        assert adapted_plan.requires_approval is True
        # Cancellation should require rebooking
        has_replace = any(a.adjustment_type == "replace" for a in adapted_plan.adjustments)
        assert has_replace

    def test_severity_calculation(self, engine):
        """Test severity calculation from delay."""
        minor = engine._calculate_severity(15)
        moderate = engine._calculate_severity(60)
        major = engine._calculate_severity(180)
        critical = engine._calculate_severity(600)

        assert minor == DisruptionSeverity.MINOR
        assert moderate == DisruptionSeverity.MODERATE
        assert major == DisruptionSeverity.MAJOR
        assert critical == DisruptionSeverity.CRITICAL

    def test_auto_execute_minor_adaptations(self, engine):
        """Test auto-executing minor adaptations."""
        disruption = Disruption(
            disruption_type=DisruptionType.TRAFFIC,
            severity=DisruptionSeverity.MINOR,
            impact_minutes=20
        )

        adapted_plan = engine.generate_adapted_plan(disruption, {"events": []})
        executed = engine.auto_execute_minor_adaptations(adapted_plan)

        # Should execute non-booking, zero-cost adjustments
        for adjustment in executed:
            assert not adjustment.requires_booking
            assert adjustment.estimated_cost == 0


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase5Integration:
    """Integration tests for Phase 5 components."""

    def test_timeline_with_disruption_adaptation(self):
        """Test timeline recalculation with adaptation."""
        calculator = TimelineCalculator()
        engine = AdaptationEngine()

        now = datetime.now(timezone.utc)

        # Build initial timeline
        timeline = calculator.build_journey_timeline(
            flight_departure=now + timedelta(hours=24),
            flight_arrival=now + timedelta(hours=30),
            hotel_checkin=now + timedelta(hours=32),
            hotel_checkout=now + timedelta(days=5),
            return_flight_departure=now + timedelta(days=5, hours=4),
            return_flight_arrival=now + timedelta(days=5, hours=10)
        )

        # Detect a disruption
        context_update = {
            "flight_status": {
                "delay_minutes": 45,
                "status": "delayed"
            }
        }

        disruption = engine.detect_disruption(context_update, {})

        # Generate adapted plan
        adapted_plan = engine.generate_adapted_plan(
            disruption,
            {"events": [e.__dict__ for e in timeline.events]}
        )

        assert adapted_plan is not None
        assert len(adapted_plan.adjustments) > 0

    def test_intelligence_with_comparison_view(self):
        """Test full intelligence flow with comparison."""
        intelligence = JourneyIntelligence()

        user_intent = {
            "interests": ["beach", "culture"],
            "budget_range": (3000, 5000),
            "duration_days": 7
        }

        # Get destination matches
        destinations = ["Bali", "Barcelona", "Tokyo"]
        matches = []

        for dest in destinations:
            match = intelligence.explain_destination_match(dest, user_intent)
            matches.append({
                "destination": match.destination,
                "overall_score": match.confidence.score,
                "budget_comfort": "comfortable",
                "duration_fit": "good",
                "activities_count": 10,
                "weather_match": "good",
                "highlights": match.best_for[:3]
            })

        # Generate comparison
        comparison = intelligence.generate_comparison_view(matches, "destination")

        assert comparison.recommendation is not None
        assert len(comparison.items) == 3


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
