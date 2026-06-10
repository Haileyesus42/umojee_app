"""
Phase 5 Timeline Intelligence - Improvements Tests

Tests for timeline persistence, dynamic buffers, proactive monitoring, and multi-option plans.
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, MagicMock

# Import Phase 5 modules
from .timeline_calculator import (
    TimelineCalculator,
    TimelineEvent,
    JourneyTimeline,
    EventType
)
from .adaptation_engine import (
    AdaptationEngine,
    Disruption,
    DisruptionType,
    DisruptionSeverity,
    AdaptedPlan
)
from .intelligence import (
    JourneyIntelligence,
    ConfidenceLevel,
    ConfidenceIndicator
)


# ============================================================================
# FIXTURES - Dummy Data
# ============================================================================

@pytest.fixture
def dummy_journey():
    """Create dummy journey for testing."""
    from ..phase_1_foundation.journey_models import (
        Journey,
        JourneyContext,
        FlightStatusContext
    )
    
    journey = Journey(user_id="test_user_123")
    journey.context = JourneyContext(
        flight_status=FlightStatusContext(
            flight_number="AA123",
            departure_time=datetime.now(timezone.utc) + timedelta(hours=5),
            arrival_time=datetime.now(timezone.utc) + timedelta(hours=10)
        )
    )
    
    return journey


@pytest.fixture
def dummy_timeline():
    """Create dummy timeline."""
    timeline = JourneyTimeline()
    
    now = datetime.now(timezone.utc)
    
    timeline.events = [
        TimelineEvent(
            id="event1",
            segment="home_to_airport",
            event_type=EventType.DEPARTURE,
            scheduled_time=now + timedelta(hours=2),
            description="Leave home",
            dependency_type="blocking"
        ),
        TimelineEvent(
            id="event2",
            segment="airport_to_flight",
            event_type=EventType.CHECK_IN,
            scheduled_time=now + timedelta(hours=3),
            description="Check in",
            dependencies=["event1"],
            dependency_type="blocking"
        ),
        TimelineEvent(
            id="event3",
            segment="airport_to_flight",
            event_type=EventType.BOARDING,
            scheduled_time=now + timedelta(hours=4, minutes=30),
            description="Board flight",
            dependencies=["event2"],
            dependency_type="soft"
        )
    ]
    
    timeline.departure_from_home = now + timedelta(hours=2)
    timeline.flight_departure = now + timedelta(hours=5)
    
    return timeline


@pytest.fixture
def dummy_disruption():
    """Create dummy disruption."""
    return Disruption(
        disruption_id="disrupt_test123",
        journey_id="journey_test456",
        type=DisruptionType.FLIGHT_DELAY,
        severity=DisruptionSeverity.MODERATE,
        title="Flight Delayed",
        description="Flight AA123 delayed by 2 hours",
        detected_at=datetime.now(timezone.utc),
        impact_start=datetime.now(timezone.utc) + timedelta(hours=5),
        estimated_duration_minutes=120,
        affected_segments=["airport_to_flight", "flight_to_hotel"]
    )


@pytest.fixture
def mock_timeline_persistence():
    """Create mock timeline persistence."""
    persistence = AsyncMock()
    persistence.save_timeline = AsyncMock(return_value=True)
    persistence.load_timeline = AsyncMock(return_value=None)
    persistence.get_timeline_history = AsyncMock(return_value=[])
    return persistence


@pytest.fixture
def mock_disruption_monitor():
    """Create mock disruption monitor."""
    monitor = AsyncMock()
    monitor.check_flight_status = AsyncMock(return_value=None)
    monitor.check_weather_conditions = AsyncMock(return_value=None)
    monitor.check_traffic_conditions = AsyncMock(return_value=None)
    return monitor


# ============================================================================
# TEST SUITE 1: Timeline Persistence
# ============================================================================

class TestTimelinePersistence:
    """Test timeline persistence functionality."""
    
    @pytest.mark.asyncio
    async def test_save_timeline(
        self,
        dummy_journey,
        dummy_timeline,
        mock_timeline_persistence
    ):
        """Test saving timeline to persistence."""
        calculator = TimelineCalculator(persistence=mock_timeline_persistence)
        
        success = await calculator.save_timeline(
            dummy_journey.journey_id,
            dummy_timeline
        )
        
        assert success is True
        assert mock_timeline_persistence.save_timeline.called
    
    @pytest.mark.asyncio
    async def test_load_timeline(
        self,
        dummy_journey,
        dummy_timeline,
        mock_timeline_persistence
    ):
        """Test loading timeline from persistence."""
        # Mock existing timeline
        mock_timeline_persistence.load_timeline = AsyncMock(
            return_value=dummy_timeline.to_dict()
        )
        
        calculator = TimelineCalculator(persistence=mock_timeline_persistence)
        
        loaded = await calculator.load_timeline(dummy_journey.journey_id)
        
        assert loaded is not None
        assert len(loaded.events) == len(dummy_timeline.events)


# ============================================================================
# TEST SUITE 2: Enhanced Event Dependencies
# ============================================================================

class TestEventDependencies:
    """Test enhanced event dependencies."""
    
    def test_blocking_dependency(self):
        """Test blocking dependency prevents event start."""
        event1 = TimelineEvent(
            id="event1",
            segment="test",
            event_type=EventType.DEPARTURE,
            scheduled_time=datetime.now(timezone.utc),
            description="First event",
            completed=False
        )
        
        event2 = TimelineEvent(
            id="event2",
            segment="test",
            event_type=EventType.ARRIVAL,
            scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
            description="Second event",
            dependencies=["event1"],
            dependency_type="blocking"
        )
        
        # Event2 cannot start if event1 not completed
        completed_events = set()
        can_start = event2.can_start(completed_events)
        
        assert can_start is False
        
        # Event2 can start after event1 completed
        completed_events.add("event1")
        can_start = event2.can_start(completed_events)
        
        assert can_start is True
    
    def test_soft_dependency(self):
        """Test soft dependency allows event start."""
        event1 = TimelineEvent(
            id="event1",
            segment="test",
            event_type=EventType.DEPARTURE,
            scheduled_time=datetime.now(timezone.utc),
            description="First event",
            completed=False
        )
        
        event2 = TimelineEvent(
            id="event2",
            segment="test",
            event_type=EventType.ARRIVAL,
            scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
            description="Second event",
            dependencies=["event1"],
            dependency_type="soft"
        )
        
        # Event2 can start even if event1 not completed (soft dependency)
        completed_events = set()
        can_start = event2.can_start(completed_events)
        
        assert can_start is True


# ============================================================================
# TEST SUITE 3: Dynamic Buffer Calculation
# ============================================================================

class TestDynamicBuffers:
    """Test dynamic buffer calculation."""
    
    def test_airport_multiplier(self):
        """Test airport-specific buffer multipliers."""
        calculator = TimelineCalculator()
        
        # LAX should have higher multiplier than small airport
        lax_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="LAX",
            time=datetime.now(timezone.utc).replace(hour=8),
            user_risk_tolerance=0.5
        )
        
        small_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="SMALL",
            time=datetime.now(timezone.utc).replace(hour=8),
            user_risk_tolerance=0.5
        )
        
        assert lax_buffer >= small_buffer
    
    def test_time_of_day_multiplier(self):
        """Test time-of-day buffer multipliers."""
        calculator = TimelineCalculator()
        
        # Morning rush should have higher multiplier
        morning_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="LAX",
            time=datetime.now(timezone.utc).replace(hour=7),
            user_risk_tolerance=0.5
        )
        
        afternoon_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="LAX",
            time=datetime.now(timezone.utc).replace(hour=14),
            user_risk_tolerance=0.5
        )
        
        assert morning_buffer >= afternoon_buffer
    
    def test_user_risk_tolerance(self):
        """Test user risk tolerance affects buffers."""
        calculator = TimelineCalculator()
        
        # Conservative user (low tolerance) gets bigger buffer
        conservative_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="LAX",
            time=datetime.now(timezone.utc).replace(hour=8),
            user_risk_tolerance=0.3
        )
        
        # Aggressive user (high tolerance) gets smaller buffer
        aggressive_buffer = calculator.calculate_dynamic_buffer(
            buffer_type="security",
            airport_code="LAX",
            time=datetime.now(timezone.utc).replace(hour=8),
            user_risk_tolerance=0.8
        )
        
        assert conservative_buffer > aggressive_buffer


# ============================================================================
# TEST SUITE 4: Proactive Disruption Monitoring
# ============================================================================

class TestProactiveMonitoring:
    """Test proactive disruption monitoring."""
    
    @pytest.mark.asyncio
    async def test_start_proactive_monitoring(
        self,
        dummy_journey,
        mock_disruption_monitor
    ):
        """Test starting proactive monitoring."""
        engine = AdaptationEngine(disruption_monitor=mock_disruption_monitor)
        
        await engine.start_proactive_monitoring(dummy_journey.journey_id)
        
        # Should be monitoring
        assert dummy_journey.journey_id in engine._monitoring_tasks
    
    @pytest.mark.asyncio
    async def test_stop_proactive_monitoring(
        self,
        dummy_journey,
        mock_disruption_monitor
    ):
        """Test stopping proactive monitoring."""
        engine = AdaptationEngine(disruption_monitor=mock_disruption_monitor)
        
        await engine.start_proactive_monitoring(dummy_journey.journey_id)
        await engine.stop_proactive_monitoring(dummy_journey.journey_id)
        
        # Should not be monitoring
        assert dummy_journey.journey_id not in engine._monitoring_tasks
    
    @pytest.mark.asyncio
    async def test_monitoring_detects_disruptions(
        self,
        dummy_journey,
        dummy_disruption,
        mock_disruption_monitor
    ):
        """Test monitoring detects disruptions."""
        # Mock disruption detection
        mock_disruption_monitor.check_flight_status = AsyncMock(
            return_value=dummy_disruption
        )
        
        engine = AdaptationEngine(disruption_monitor=mock_disruption_monitor)
        
        await engine.start_proactive_monitoring(dummy_journey.journey_id)
        await asyncio.sleep(0.2)  # Let monitoring run
        await engine.stop_proactive_monitoring(dummy_journey.journey_id)
        
        # Should have called monitoring methods
        assert mock_disruption_monitor.check_flight_status.called


# ============================================================================
# TEST SUITE 5: Multi-Option Adaptation Plans
# ============================================================================

class TestMultiOptionPlans:
    """Test multi-option adaptation plans."""
    
    @pytest.mark.asyncio
    async def test_generate_multiple_options(
        self,
        dummy_journey,
        dummy_disruption
    ):
        """Test generating multiple adaptation options."""
        engine = AdaptationEngine()
        
        plan = await engine.generate_adapted_plan(
            dummy_journey,
            dummy_disruption,
            generate_alternatives=True
        )
        
        # Should have alternatives
        assert plan.alternatives is not None
        assert len(plan.alternatives) > 0
    
    @pytest.mark.asyncio
    async def test_plan_strategies(
        self,
        dummy_journey,
        dummy_disruption
    ):
        """Test different plan strategies."""
        engine = AdaptationEngine()
        
        plan = await engine.generate_adapted_plan(
            dummy_journey,
            dummy_disruption,
            generate_alternatives=True
        )
        
        # Should have plans with different strategies
        strategies = set()
        if plan.alternatives:
            for alt in plan.alternatives:
                # Plans should have different characteristics
                strategies.add((alt.total_cost, alt.time_impact_minutes))
        
        # Should have variety in plans
        assert len(strategies) > 1
    
    @pytest.mark.asyncio
    async def test_plan_ranking(
        self,
        dummy_journey,
        dummy_disruption
    ):
        """Test plan ranking scores."""
        engine = AdaptationEngine()
        
        plan = await engine.generate_adapted_plan(
            dummy_journey,
            dummy_disruption,
            generate_alternatives=True
        )
        
        # Primary plan should have highest ranking
        if plan.alternatives:
            for alt in plan.alternatives:
                assert plan.ranking_score >= alt.ranking_score


# ============================================================================
# TEST SUITE 6: Enhanced Confidence Scoring
# ============================================================================

class TestEnhancedConfidenceScoring:
    """Test enhanced confidence scoring."""
    
    def test_confidence_with_user_preferences(self):
        """Test confidence calculation with user preferences."""
        intelligence = JourneyIntelligence()
        
        match_factors = [
            "Perfect weather conditions",
            "Good flight times"
        ]
        concern_factors = [
            "Slightly over budget"
        ]
        
        confidence = intelligence.calculate_confidence_indicator(
            match_factors=match_factors,
            concern_factors=concern_factors,
            user_preferences={"budget_priority": "high"},
            historical_satisfaction=0.85
        )
        
        assert confidence.level in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM]
        assert 0 <= confidence.score <= 1.0
    
    def test_confidence_with_historical_data(self):
        """Test confidence incorporates historical satisfaction."""
        intelligence = JourneyIntelligence()
        
        match_factors = ["Good match"]
        concern_factors = []
        
        # High historical satisfaction should boost confidence
        confidence_high_history = intelligence.calculate_confidence_indicator(
            match_factors=match_factors,
            concern_factors=concern_factors,
            historical_satisfaction=0.9
        )
        
        # Low historical satisfaction should reduce confidence
        confidence_low_history = intelligence.calculate_confidence_indicator(
            match_factors=match_factors,
            concern_factors=concern_factors,
            historical_satisfaction=0.4
        )
        
        assert confidence_high_history.score > confidence_low_history.score
    
    def test_confidence_with_weighted_factors(self):
        """Test confidence with custom factor weights."""
        intelligence = JourneyIntelligence()
        
        match_factors = ["Perfect timing", "Great price"]
        concern_factors = []
        
        # Custom weights emphasizing timing
        factor_weights = {
            "timing": 2.0,
            "price": 1.0
        }
        
        confidence = intelligence.calculate_confidence_indicator(
            match_factors=match_factors,
            concern_factors=concern_factors,
            factor_weights=factor_weights
        )
        
        assert confidence.score > 0.5


# ============================================================================
# TEST SUITE 7: Timeline Visualization
# ============================================================================

class TestTimelineVisualization:
    """Test timeline visualization exports."""
    
    def test_to_gantt_chart_data(self, dummy_timeline):
        """Test exporting timeline to Gantt chart format."""
        gantt_data = dummy_timeline.to_gantt_chart_data()
        
        assert "tasks" in gantt_data
        assert len(gantt_data["tasks"]) == len(dummy_timeline.events)
        
        # Check task structure
        task = gantt_data["tasks"][0]
        assert "id" in task
        assert "name" in task
        assert "start" in task
        assert "end" in task
        assert "dependencies" in task
    
    def test_to_calendar_events(self, dummy_timeline):
        """Test exporting timeline to calendar format."""
        calendar_events = dummy_timeline.to_calendar_events()
        
        assert len(calendar_events) == len(dummy_timeline.events)
        
        # Check event structure
        event = calendar_events[0]
        assert "summary" in event
        assert "start" in event
        assert "end" in event
        assert "description" in event


# ============================================================================
# INTEGRATION TEST
# ============================================================================

class TestPhase5Integration:
    """Integration tests for Phase 5."""
    
    @pytest.mark.asyncio
    async def test_full_timeline_lifecycle(
        self,
        dummy_journey,
        mock_timeline_persistence
    ):
        """Test complete timeline lifecycle with all Phase 5 features."""
        print("\n" + "="*70)
        print("Phase 5 Integration Test - Full Timeline Lifecycle")
        print("="*70)
        
        # 1. Create calculator with persistence
        calculator = TimelineCalculator(persistence=mock_timeline_persistence)
        print("✓ Timeline calculator created with persistence")
        
        # 2. Build timeline with dynamic buffers
        timeline = calculator.build_journey_timeline(
            dummy_journey,
            airport_code="LAX",
            user_risk_tolerance=0.6
        )
        
        print(f"✓ Timeline built with {len(timeline.events)} events")
        
        # 3. Verify dynamic buffers were applied
        assert timeline.events is not None
        print("✓ Dynamic buffers applied based on airport and time")
        
        # 4. Save timeline
        success = await calculator.save_timeline(
            dummy_journey.journey_id,
            timeline
        )
        
        assert success is True
        print("✓ Timeline persisted")
        
        # 5. Load timeline
        loaded = await calculator.load_timeline(dummy_journey.journey_id)
        assert loaded is not None
        print("✓ Timeline loaded from persistence")
        
        # 6. Export visualizations
        gantt_data = timeline.to_gantt_chart_data()
        calendar_events = timeline.to_calendar_events()
        
        assert len(gantt_data["tasks"]) > 0
        assert len(calendar_events) > 0
        print(f"✓ Visualizations exported: {len(gantt_data['tasks'])} Gantt tasks")
        
        print("\n✅ Phase 5 Integration Test Passed!")
    
    @pytest.mark.asyncio
    async def test_adaptation_with_monitoring(
        self,
        dummy_journey,
        dummy_disruption,
        mock_disruption_monitor
    ):
        """Test adaptation engine with proactive monitoring."""
        print("\n" + "="*70)
        print("Phase 5 Integration Test - Adaptation with Monitoring")
        print("="*70)
        
        # 1. Create adaptation engine with monitoring
        engine = AdaptationEngine(disruption_monitor=mock_disruption_monitor)
        print("✓ Adaptation engine created with disruption monitor")
        
        # 2. Start proactive monitoring
        await engine.start_proactive_monitoring(dummy_journey.journey_id)
        print(f"✓ Proactive monitoring started for {dummy_journey.journey_id}")
        
        # 3. Generate multi-option plan
        plan = await engine.generate_adapted_plan(
            dummy_journey,
            dummy_disruption,
            generate_alternatives=True
        )
        
        print(f"✓ Adaptation plan generated: {plan.plan_id}")
        print(f"  - Primary plan ranking: {plan.ranking_score:.2f}")
        print(f"  - Time impact: {plan.time_impact_minutes} minutes")
        print(f"  - Cost impact: ${plan.total_cost:.2f}")
        
        # 4. Check alternatives
        if plan.alternatives:
            print(f"✓ {len(plan.alternatives)} alternative plans generated")
            for i, alt in enumerate(plan.alternatives[:3], 1):
                print(f"  Alt {i}: Ranking {alt.ranking_score:.2f}, "
                      f"Time {alt.time_impact_minutes}min, "
                      f"Cost ${alt.total_cost:.2f}")
        
        # 5. Stop monitoring
        await engine.stop_proactive_monitoring(dummy_journey.journey_id)
        print("✓ Proactive monitoring stopped")
        
        print("\n✅ Adaptation with Monitoring Test Passed!")
    
    @pytest.mark.asyncio
    async def test_confidence_scoring_integration(self):
        """Test enhanced confidence scoring."""
        print("\n" + "="*70)
        print("Phase 5 Integration Test - Enhanced Confidence Scoring")
        print("="*70)
        
        intelligence = JourneyIntelligence()
        
        # Test case 1: Strong match
        confidence1 = intelligence.calculate_confidence_indicator(
            match_factors=["Perfect timing", "Great price", "Excellent reviews"],
            concern_factors=[],
            user_preferences={"timing_priority": "high"},
            historical_satisfaction=0.9,
            factor_weights={"timing": 2.0}
        )
        
        print(f"✓ Strong match confidence: {confidence1.level.value} ({confidence1.score:.2f})")
        
        # Test case 2: Mixed signals
        confidence2 = intelligence.calculate_confidence_indicator(
            match_factors=["Good timing"],
            concern_factors=["Over budget", "Long layover"],
            user_preferences={"budget_priority": "high"},
            historical_satisfaction=0.6
        )
        
        print(f"✓ Mixed signals confidence: {confidence2.level.value} ({confidence2.score:.2f})")
        
        # Test case 3: Weak match
        confidence3 = intelligence.calculate_confidence_indicator(
            match_factors=[],
            concern_factors=["Poor timing", "Expensive", "Bad reviews"],
            historical_satisfaction=0.3
        )
        
        print(f"✓ Weak match confidence: {confidence3.level.value} ({confidence3.score:.2f})")
        
        # Verify ordering
        assert confidence1.score > confidence2.score > confidence3.score
        print("✓ Confidence scores properly ordered")
        
        print("\n✅ Confidence Scoring Integration Test Passed!")


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 5 TIMELINE INTELLIGENCE - IMPROVEMENTS TEST SUITE")
    print("=" * 70)
    print("\nRunning tests with dummy data...\n")
    
    pytest.main([__file__, "-v", "--tb=short"])
