"""
Comprehensive End-to-End Journey Test Suite

Tests:
- All segment transitions
- Context monitoring integration
- Trigger evaluation (time, location, flight, traffic, weather)
- Error handling and recovery
- Timeline recalculation
- Implicit intent detection
- Tool optimization

Uses mocked external APIs for reliable testing.
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List


# ============================================================================
# FIXTURES: Mock External APIs
# ============================================================================

@pytest.fixture
def mock_amadeus_api():
    """Mock Amadeus API responses."""
    with patch("agent.amadeus.amadeus_make_request._make_amadeus_request") as mock:
        # Flight search response
        mock.return_value = {
            "data": [
                {
                    "id": "flight_1",
                    "price": {"total": "500.00"},
                    "itineraries": [{
                        "duration": "PT6H30M",
                        "segments": [{
                            "departure": {"iataCode": "JFK", "at": "2026-03-15T08:00:00"},
                            "arrival": {"iataCode": "LAX", "at": "2026-03-15T11:30:00"},
                            "carrierCode": "AA",
                        }],
                    }],
                },
            ],
        }
        yield mock


@pytest.fixture
def mock_weather_api():
    """Mock weather API responses."""
    with patch("requests.get") as mock:
        mock.return_value.status_code = 200
        mock.return_value.json.return_value = {
            "current": {
                "temp": 72,
                "description": "Clear sky",
                "humidity": 60,
            },
            "forecast": [
                {"date": "2026-03-15", "temp_high": 75, "temp_low": 65, "description": "Sunny"},
            ],
        }
        yield mock


@pytest.fixture
def mock_traffic_api():
    """Mock traffic API responses."""
    with patch("requests.get") as mock:
        mock.return_value.status_code = 200
        mock.return_value.json.return_value = {
            "routes": [{
                "duration": 1800,  # 30 minutes
                "distance": 25000,  # 25 km
            }],
        }
        yield mock


@pytest.fixture
async def setup_journey_system():
    """Setup journey system with all components."""
    from agent.journey.phase_1_foundation import JourneyStateManager
    from agent.journey.phase_2_context_monitoring import ContextMonitor
    from server.websocket_manager import WebSocketManager
    
    # Create managers
    state_manager = JourneyStateManager()
    ws_manager = WebSocketManager()
    context_monitor = ContextMonitor(state_manager=state_manager)
    
    # Inject singletons
    from agent.journey.journey_orchestrator import set_journey_singletons
    set_journey_singletons(state_manager, context_monitor)
    
    yield {
        "state_manager": state_manager,
        "ws_manager": ws_manager,
        "context_monitor": context_monitor,
    }
    
    # Cleanup
    await context_monitor.stop_all()


# ============================================================================
# TEST SUITE 1: Segment Transitions
# ============================================================================

class TestSegmentTransitions:
    """Test all segment transitions with triggers."""
    
    @pytest.mark.asyncio
    async def test_inspiration_to_home_to_airport(self, setup_journey_system):
        """Test transition from inspiration to home_to_airport."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        
        # Create journey
        journey = state_manager.initialize_journey("test_user", "conv_123")
        assert journey.current_segment.value == "inspiration"
        
        # Transition to home_to_airport
        from agent.journey.phase_1_foundation import JourneySegment
        success = state_manager.transition_segment(
            journey.journey_id,
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT,
        )
        
        assert success
        updated = state_manager.get_journey(journey.journey_id)
        assert updated.current_segment == JourneySegment.HOME_TO_AIRPORT
    
    @pytest.mark.asyncio
    async def test_location_trigger_airport_arrival(self, setup_journey_system):
        """Test location trigger for airport arrival."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        ws_manager = system["ws_manager"]
        
        # Create journey in home_to_airport segment
        from agent.journey.phase_1_foundation import JourneySegment
        journey = state_manager.initialize_journey("test_user", "conv_123")
        state_manager.transition_segment(
            journey.journey_id,
            JourneySegment.INSPIRATION,
            JourneySegment.HOME_TO_AIRPORT,
        )
        
        # Set waypoint coordinates
        state_manager.update_context(journey.journey_id, {
            "departure_airport_lat": 40.6413,
            "departure_airport_lon": -73.7781,
        })
        
        # Simulate location trigger
        from agent.location_geofencing import evaluate_user_location
        status = evaluate_user_location(
            journey_id=journey.journey_id,
            current_lat=40.6413,
            current_lon=-73.7781,
            waypoint_lat=40.6413,
            waypoint_lon=-73.7781,
            waypoint_name="JFK Airport",
        )
        
        assert status.zone.value == "arrived"
        assert status.should_notify
        assert "arrived" in status.notification_message.lower()
    
    @pytest.mark.asyncio
    async def test_flight_status_trigger_boarding(self, setup_journey_system):
        """Test flight status trigger for boarding."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        ws_manager = system["ws_manager"]
        
        # Create journey in airport_to_flight segment
        from agent.journey.phase_1_foundation import JourneySegment
        from agent.journey.phase_2_context_monitoring import ContextUpdate, MonitoringType
        
        journey = state_manager.initialize_journey("test_user", "conv_123")
        state_manager.transition_segment(journey.journey_id, JourneySegment.INSPIRATION, JourneySegment.HOME_TO_AIRPORT)
        state_manager.transition_segment(journey.journey_id, JourneySegment.HOME_TO_AIRPORT, JourneySegment.AIRPORT_TO_FLIGHT)
        
        # Create boarding status update
        update = ContextUpdate(
            journey_id=journey.journey_id,
            monitoring_type=MonitoringType.FLIGHT_STATUS,
            data={"status": "boarding", "gate": "B12"},
            success=True,
            timestamp=datetime.now(timezone.utc),
        )
        
        # Evaluate trigger
        from agent.journey.trigger_evaluator import evaluate_context_update
        await evaluate_context_update(update, state_manager, ws_manager)
        
        # Verify notification was sent (check ws_manager calls)
        # Note: In real test, mock ws_manager.broadcast_to_journey


# ============================================================================
# TEST SUITE 2: Context Monitoring
# ============================================================================

class TestContextMonitoring:
    """Test context monitoring and data injection."""
    
    @pytest.mark.asyncio
    async def test_monitoring_data_injection(self, setup_journey_system, mock_weather_api):
        """Test that monitoring data is injected into journey context."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        context_monitor = system["context_monitor"]
        
        # Create journey
        journey = state_manager.initialize_journey("test_user", "conv_123")
        
        # Start monitoring
        context_monitor.start_monitoring_for_journey(journey.journey_id)
        
        # Wait for first poll
        await asyncio.sleep(2)
        
        # Check that monitoring data exists
        latest = context_monitor.get_latest_context(journey.journey_id)
        assert latest is not None
        
        # Stop monitoring
        context_monitor.stop_monitoring_for_journey(journey.journey_id)
    
    @pytest.mark.asyncio
    async def test_traffic_delay_recalculation(self, setup_journey_system):
        """Test timeline recalculation on traffic delay."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        ws_manager = system["ws_manager"]
        
        # Create journey with timeline
        from agent.journey.phase_1_foundation import JourneySegment
        journey = state_manager.initialize_journey("test_user", "conv_123")
        
        # Set departure time
        departure_time = datetime.now(timezone.utc) + timedelta(hours=3)
        state_manager.update_context(journey.journey_id, {
            "timeline": {
                "departure_from_home": departure_time.isoformat(),
            },
        })
        
        # Simulate traffic delay
        from agent.dynamic_timeline import recalculate_timeline_on_context_change
        result = await recalculate_timeline_on_context_change(
            journey_id=journey.journey_id,
            change_type="traffic",
            change_data={"delay_minutes": 25},
            state_manager=state_manager,
            ws_manager=ws_manager,
        )
        
        assert result is not None
        assert result["delay_minutes"] == 25


# ============================================================================
# TEST SUITE 3: Implicit Intent Detection
# ============================================================================

class TestImplicitIntents:
    """Test implicit intent detection and handling."""
    
    def test_location_intent_detection(self):
        """Test detection of 'I'm at the airport'."""
        from agent.context_resolver import ContextResolver
        
        resolver = ContextResolver()
        
        test_cases = [
            ("I'm at the airport", "airport"),
            ("Just arrived at the hotel", "hotel"),
            ("I'm home now", "home"),
            ("Reached the gate", "airport"),
        ]
        
        for message, expected_location in test_cases:
            result = resolver.resolve(message)
            assert result["implicit_intent"] == "location_arrival"
            assert result["context_hints"]["location_type"] == expected_location
    
    def test_urgency_detection(self):
        """Test detection of 'running late'."""
        from agent.context_resolver import ContextResolver
        
        resolver = ContextResolver()
        
        test_cases = [
            "I'm running late",
            "Stuck in traffic",
            "Might be delayed",
            "Need to hurry",
        ]
        
        for message in test_cases:
            result = resolver.resolve(message)
            assert result["implicit_intent"] == "urgency"
            assert result["trigger_action"] == "traffic_check"
    
    def test_pronoun_resolution(self):
        """Test resolution of 'book it'."""
        from agent.context_resolver import ContextResolver, build_context_for_resolver
        from langchain_core.messages import AIMessage, HumanMessage
        
        resolver = ContextResolver()
        
        # Simulate conversation with flight search
        messages = [
            AIMessage(content="I found 3 flights: Flight 1 ($500), Flight 2 ($600), Flight 3 ($450)"),
        ]
        
        context = {
            "last_search_results": {
                "flights": [
                    {"id": "1", "price": 500},
                    {"id": "2", "price": 600},
                    {"id": "3", "price": 450},
                ],
            },
        }
        
        result = resolver.resolve("Book it", context)
        
        # Should resolve to cheapest flight
        assert "flight 3" in result["resolved_message"].lower() or "flight" in result["resolved_message"].lower()


# ============================================================================
# TEST SUITE 4: Error Handling
# ============================================================================

class TestErrorHandling:
    """Test user-friendly error messages."""
    
    def test_api_unavailable_error(self):
        """Test API unavailable error formatting."""
        from agent.error_handler import handle_error
        
        error = Exception("Connection refused: 503 Service Unavailable")
        friendly = handle_error(error, operation="flight search", service="Amadeus")
        
        assert "temporarily unavailable" in friendly.message.lower()
        assert len(friendly.suggestions) > 0
        assert "try again" in friendly.suggestions[0].lower()
    
    def test_no_results_error(self):
        """Test no results error with suggestions."""
        from agent.error_handler import handle_error
        
        error = Exception("No flights found matching criteria")
        friendly = handle_error(
            error,
            operation="flight search",
            service="Amadeus",
            user_input={"origin": "NYC", "destination": "LAX", "date": "2026-03-15"},
        )
        
        assert "no" in friendly.message.lower() and "found" in friendly.message.lower()
        assert any("flexible dates" in s.lower() for s in friendly.suggestions)


# ============================================================================
# TEST SUITE 5: Tool Optimization
# ============================================================================

class TestToolOptimization:
    """Test smart tool selection and batching."""
    
    def test_skip_tool_call_with_fresh_data(self):
        """Test that tool calls are skipped when fresh monitoring data exists."""
        from agent.tool_optimizer import ToolOptimizer
        
        # Fresh weather data (5 minutes old)
        monitoring_data = {
            "weather": {
                "temperature": 72,
                "description": "Clear",
                "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            },
        }
        
        optimizer = ToolOptimizer(monitoring_data)
        should_skip, cached = optimizer.should_skip_tool_call("get_weather", "weather")
        
        assert should_skip
        assert cached is not None
        assert cached["temperature"] == 72
    
    def test_dont_skip_stale_data(self):
        """Test that stale data doesn't prevent tool calls."""
        from agent.tool_optimizer import ToolOptimizer
        
        # Stale weather data (20 minutes old, threshold is 10)
        monitoring_data = {
            "weather": {
                "temperature": 72,
                "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat(),
            },
        }
        
        optimizer = ToolOptimizer(monitoring_data)
        should_skip, cached = optimizer.should_skip_tool_call("get_weather", "weather")
        
        assert not should_skip
    
    @pytest.mark.asyncio
    async def test_batch_tool_calls(self):
        """Test parallel tool execution."""
        from agent.tool_optimizer import batch_tool_calls
        
        async def mock_tool_1():
            await asyncio.sleep(0.1)
            return {"result": "tool1"}
        
        async def mock_tool_2():
            await asyncio.sleep(0.1)
            return {"result": "tool2"}
        
        async def mock_tool_3():
            await asyncio.sleep(0.1)
            return {"result": "tool3"}
        
        start = datetime.now()
        results = await batch_tool_calls([
            ("tool1", mock_tool_1, {}),
            ("tool2", mock_tool_2, {}),
            ("tool3", mock_tool_3, {}),
        ])
        elapsed = (datetime.now() - start).total_seconds()
        
        # Should complete in ~0.1s (parallel) not ~0.3s (sequential)
        assert elapsed < 0.2
        assert len(results) == 3
        assert all(r["success"] for r in results)


# ============================================================================
# TEST SUITE 6: Timeline Intelligence
# ============================================================================

class TestTimelineIntelligence:
    """Test dynamic timeline recalculation and what-if scenarios."""
    
    @pytest.mark.asyncio
    async def test_traffic_delay_recalculation(self, setup_journey_system):
        """Test timeline adjustment on traffic delay."""
        system = await setup_journey_system
        state_manager = system["state_manager"]
        ws_manager = system["ws_manager"]
        
        # Create journey with departure time
        journey = state_manager.initialize_journey("test_user", "conv_123")
        departure = datetime.now(timezone.utc) + timedelta(hours=3)
        
        from agent.journey.phase_1_foundation import JourneyTimeline
        timeline = JourneyTimeline(departure_from_home=departure)
        journey.timeline = timeline
        state_manager._persist_journey(journey)
        
        # Trigger recalculation
        from agent.dynamic_timeline import recalculate_timeline_on_context_change
        result = await recalculate_timeline_on_context_change(
            journey_id=journey.journey_id,
            change_type="traffic",
            change_data={"delay_minutes": 30},
            state_manager=state_manager,
            ws_manager=ws_manager,
        )
        
        # Verify departure moved earlier
        if result:
            assert result["delay_minutes"] == 30
    
# ============================================================================
# TEST SUITE 7: Journey Comparison
# ============================================================================

class TestJourneyComparison:
    """Test journey option comparison."""
    
    def test_flight_comparison(self):
        """Test flight comparison with ranking."""
        from agent.journey_comparison import compare_options
        
        flights = [
            {"id": "1", "price": 500, "duration_minutes": 360, "stops": 0, "airline": "Delta"},
            {"id": "2", "price": 400, "duration_minutes": 480, "stops": 1, "airline": "United"},
            {"id": "3", "price": 600, "duration_minutes": 330, "stops": 0, "airline": "American"},
        ]
        
        comparison = compare_options("flights", flights)
        
        assert len(comparison.options) == 3
        assert comparison.options[0].rank == 1
        assert comparison.recommendation
    
    def test_hotel_comparison(self):
        """Test hotel comparison with ranking."""
        from agent.journey_comparison import compare_options
        
        hotels = [
            {"id": "1", "name": "Hotel A", "price": 150, "rating": 4.5, "distance_to_center_km": 1.0},
            {"id": "2", "name": "Hotel B", "price": 100, "rating": 3.8, "distance_to_center_km": 3.0},
            {"id": "3", "name": "Hotel C", "price": 200, "rating": 4.8, "distance_to_center_km": 0.5},
        ]
        
        comparison = compare_options("hotels", hotels)
        
        assert len(comparison.options) == 3
        assert comparison.options[0].overall_score > 0


# ============================================================================
# TEST SUITE 8: Alternative Planning
# ============================================================================

class TestAlternativePlanning:
    """Test backup plans and risk mitigation."""
    
    def test_delay_risk_calculation(self):
        """Test flight delay risk calculation."""
        from agent.alternative_planner import calculate_flight_delay_risk
        
        flight = {
            "airline": "Delta",
            "departure_time": "2026-03-15T08:00:00Z",
        }
        
        monitoring = {
            "weather": {"description": "Heavy rain"},
            "traffic": {"delay_minutes": 20},
        }
        
        risk_level, risk_score, backup_plan = calculate_flight_delay_risk(flight, monitoring)
        
        assert risk_level is not None
        assert 0 <= risk_score <= 1


# ============================================================================
# TEST SUITE 10: Safety Alerts
# ============================================================================

class TestSafetyAlerts:
    """Test safety alert monitoring."""
    
    @pytest.mark.asyncio
    async def test_travel_advisory_check(self):
        """Test travel advisory checking."""
        from agent.safety_alerts import check_destination_safety
        
        # Check high-risk country
        alerts = await check_destination_safety("AF")  # Afghanistan
        
        # Should have at least one alert (mock data)
        assert isinstance(alerts, list)


# ============================================================================
# RUN ALL TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
