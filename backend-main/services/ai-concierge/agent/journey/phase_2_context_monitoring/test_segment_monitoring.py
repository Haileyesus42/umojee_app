
import asyncio
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from agent.journey.phase_2_context_monitoring import ContextMonitor, MonitoringType
from agent.journey.phase_1_foundation import JourneySegment, Journey, JourneyStateManager

@pytest.mark.asyncio
async def test_sync_monitoring_to_segment():
    # Setup
    state_manager = MagicMock(spec=JourneyStateManager)
    monitor = ContextMonitor(state_manager=state_manager)
    
    journey_id = "test-journey-123"
    
    # Test INSPIRATION segment (should be Weather only)
    await monitor.sync_monitoring_to_segment(journey_id, JourneySegment.INSPIRATION)
    assert monitor.is_monitoring(journey_id)
    active_types = monitor._active_tasks[journey_id].keys()
    assert MonitoringType.WEATHER in active_types
    assert len(active_types) == 1
    
    # Test HOME_TO_AIRPORT transition (Location, Traffic, Flight Status)
    await monitor.sync_monitoring_to_segment(journey_id, JourneySegment.HOME_TO_AIRPORT)
    active_types = monitor._active_tasks[journey_id].keys()
    assert MonitoringType.LOCATION in active_types
    assert MonitoringType.TRAFFIC in active_types
    assert MonitoringType.FLIGHT_STATUS in active_types
    assert MonitoringType.WEATHER not in active_types
    
    await monitor.stop_all()

@pytest.mark.asyncio
async def test_segment_aware_interval():
    # Setup
    state_manager = MagicMock(spec=JourneyStateManager)
    monitor = ContextMonitor(state_manager=state_manager)
    journey_id = "test-journey-interval"
    
    # Mock a journey in the state manager
    mock_journey = MagicMock(spec=Journey)
    mock_journey.current_segment = JourneySegment.INSPIRATION
    state_manager.get_journey.return_value = mock_journey
    
    # Interval in INSPIRATION (default)
    interval_insp = await monitor._get_interval(journey_id, MonitoringType.LOCATION)
    assert interval_insp == monitor.config.location_interval_seconds
    
    # Interval in HOME_TO_AIRPORT (boosted)
    mock_journey.current_segment = JourneySegment.HOME_TO_AIRPORT
    interval_travel = await monitor._get_interval(journey_id, MonitoringType.LOCATION)
    assert interval_travel == 30 # Boosted value from our implementation
    
    await monitor.stop_all()
