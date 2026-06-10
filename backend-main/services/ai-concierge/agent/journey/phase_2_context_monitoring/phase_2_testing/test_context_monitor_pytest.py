"""
Pytest test suite for Context Monitor Service
Tests monitoring lifecycle, multiple monitoring types, and context updates
"""

import pytest
import asyncio
import sys
import os
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from context_monitor import (
    ContextMonitor,
    MonitoringType,
    MonitoringConfig,
    ContextUpdate
)


@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def monitoring_config():
    """Create fast monitoring config for tests"""
    return MonitoringConfig(
        location_interval_seconds=1,
        flight_status_interval_seconds=1,
        weather_interval_seconds=1,
        traffic_interval_seconds=1,
        airport_interval_seconds=1
    )


@pytest.fixture
def context_updates():
    """Track received context updates"""
    updates = []
    yield updates
    updates.clear()


@pytest.fixture
async def context_monitor(monitoring_config):
    """Create context monitor"""
    monitor = ContextMonitor(config=monitoring_config)
    yield monitor
    await monitor.stop_all()


class TestContextMonitor:
    """Test suite for ContextMonitor"""

    @pytest.mark.asyncio
    async def test_initialization(self, monitoring_config):
        """Test monitor initialization"""
        monitor = ContextMonitor(config=monitoring_config)
        
        assert monitor.config == monitoring_config
        assert monitor._running == False
        assert len(monitor._active_tasks) == 0
        assert len(monitor._latest_context) == 0

    @pytest.mark.asyncio
    async def test_start_monitoring(self, context_monitor):
        """Test starting monitoring for a journey"""
        success = await context_monitor.start_monitoring(
            "journey_001",
            [MonitoringType.LOCATION]
        )
        
        assert success == True
        assert context_monitor.is_monitoring("journey_001") == True
        assert "journey_001" in context_monitor.get_active_journeys()

    @pytest.mark.asyncio
    async def test_stop_monitoring(self, context_monitor):
        """Test stopping monitoring for a journey"""
        await context_monitor.start_monitoring("journey_002", [MonitoringType.LOCATION])
        
        stopped = await context_monitor.stop_monitoring("journey_002")
        
        assert stopped == True
        assert context_monitor.is_monitoring("journey_002") == False
        assert "journey_002" not in context_monitor.get_active_journeys()

    @pytest.mark.asyncio
    async def test_multiple_monitoring_types(self, context_monitor):
        """Test monitoring multiple types simultaneously"""
        types = [MonitoringType.LOCATION, MonitoringType.WEATHER, MonitoringType.TRAFFIC]
        
        success = await context_monitor.start_monitoring("journey_003", types)
        
        assert success == True
        await asyncio.sleep(1.5)
        
        latest = context_monitor.get_latest_context("journey_003")
        assert latest is not None
        assert len(latest) > 0

    @pytest.mark.asyncio
    async def test_latest_context_retrieval(self, context_monitor):
        """Test getting latest context"""
        await context_monitor.start_monitoring("journey_004", [MonitoringType.LOCATION])
        await asyncio.sleep(1.5)
        
        latest = context_monitor.get_latest_context("journey_004")
        assert latest is not None
        
        location = context_monitor.get_latest_context("journey_004", MonitoringType.LOCATION)
        assert location is not None
        assert MonitoringType.LOCATION in location

    @pytest.mark.asyncio
    async def test_context_update_callback(self, monitoring_config):
        """Test context update callback"""
        received_updates = []
        
        def callback(update: ContextUpdate):
            received_updates.append(update)
        
        monitor = ContextMonitor(config=monitoring_config, on_context_update=callback)
        await monitor.start_monitoring("journey_005", [MonitoringType.LOCATION])
        
        await asyncio.sleep(1.5)
        
        assert len(received_updates) > 0
        assert all(isinstance(u, ContextUpdate) for u in received_updates)
        
        await monitor.stop_all()

    @pytest.mark.asyncio
    async def test_multiple_journeys(self, context_monitor):
        """Test monitoring multiple journeys"""
        journeys = ["journey_006", "journey_007", "journey_008"]
        
        for journey_id in journeys:
            await context_monitor.start_monitoring(journey_id, [MonitoringType.LOCATION])
        
        active = context_monitor.get_active_journeys()
        assert len(active) == len(journeys)
        assert all(j in active for j in journeys)

    @pytest.mark.asyncio
    async def test_stop_all_monitoring(self, context_monitor):
        """Test stopping all monitoring at once"""
        for i in range(3):
            await context_monitor.start_monitoring(f"journey_{i}", [MonitoringType.LOCATION])
        
        assert len(context_monitor.get_active_journeys()) == 3
        
        await context_monitor.stop_all()
        
        assert len(context_monitor.get_active_journeys()) == 0

    @pytest.mark.asyncio
    async def test_duplicate_monitoring_start(self, context_monitor):
        """Test preventing duplicate monitoring for same journey"""
        first = await context_monitor.start_monitoring("journey_009", [MonitoringType.LOCATION])
        second = await context_monitor.start_monitoring("journey_009", [MonitoringType.LOCATION])
        
        assert first == True
        assert second == False

    @pytest.mark.asyncio
    async def test_is_monitoring(self, context_monitor):
        """Test checking if journey is being monitored"""
        assert context_monitor.is_monitoring("journey_010") == False
        
        await context_monitor.start_monitoring("journey_010", [MonitoringType.LOCATION])
        
        assert context_monitor.is_monitoring("journey_010") == True

    @pytest.mark.asyncio
    async def test_get_active_journeys(self, context_monitor):
        """Test getting list of active journeys"""
        assert context_monitor.get_active_journeys() == []
        
        await context_monitor.start_monitoring("journey_011", [MonitoringType.LOCATION])
        await context_monitor.start_monitoring("journey_012", [MonitoringType.LOCATION])
        
        active = context_monitor.get_active_journeys()
        assert len(active) == 2
        assert "journey_011" in active
        assert "journey_012" in active

    @pytest.mark.asyncio
    async def test_nonexistent_journey_context(self, context_monitor):
        """Test getting context for non-monitored journey"""
        context = context_monitor.get_latest_context("nonexistent")
        assert context is None

    @pytest.mark.asyncio
    async def test_stop_nonexistent_journey(self, context_monitor):
        """Test stopping monitoring for non-existent journey"""
        stopped = await context_monitor.stop_monitoring("nonexistent")
        assert stopped == False

    @pytest.mark.asyncio
    async def test_all_monitoring_types(self, context_monitor):
        """Test all monitoring types"""
        all_types = [
            MonitoringType.LOCATION,
            MonitoringType.FLIGHT_STATUS,
            MonitoringType.WEATHER,
            MonitoringType.TRAFFIC,
            MonitoringType.AIRPORT_CONDITIONS
        ]
        
        success = await context_monitor.start_monitoring("journey_013", all_types)
        assert success == True
        
        await asyncio.sleep(1.5)
        
        latest = context_monitor.get_latest_context("journey_013")
        assert latest is not None
        assert len(latest) > 0


class TestMonitoringConfig:
    """Test MonitoringConfig dataclass"""

    def test_default_config(self):
        """Test default configuration values"""
        config = MonitoringConfig()
        
        assert config.location_interval_seconds == 60
        assert config.flight_status_interval_seconds == 300
        assert config.weather_interval_seconds == 900
        assert config.traffic_interval_seconds == 180
        assert config.airport_interval_seconds == 600
        assert config.max_retries == 3
        assert config.retry_delay_seconds == 5

    def test_custom_config(self):
        """Test custom configuration"""
        config = MonitoringConfig(
            location_interval_seconds=30,
            flight_status_interval_seconds=120,
            max_retries=5
        )
        
        assert config.location_interval_seconds == 30
        assert config.flight_status_interval_seconds == 120
        assert config.max_retries == 5


class TestContextUpdate:
    """Test ContextUpdate dataclass"""

    def test_context_update_creation(self):
        """Test creating context update"""
        update = ContextUpdate(
            monitoring_type=MonitoringType.LOCATION,
            journey_id="journey_001",
            data={"lat": 25.2048, "lon": 55.2708},
            success=True
        )
        
        assert update.monitoring_type == MonitoringType.LOCATION
        assert update.journey_id == "journey_001"
        assert update.data["lat"] == 25.2048
        assert update.success == True
        assert update.timestamp is not None

    def test_failed_context_update(self):
        """Test failed context update"""
        update = ContextUpdate(
            monitoring_type=MonitoringType.WEATHER,
            journey_id="journey_002",
            data={},
            success=False,
            error="API Error"
        )
        
        assert update.success == False
        assert update.error == "API Error"


class TestMonitoringType:
    """Test MonitoringType enum"""

    def test_monitoring_types(self):
        """Test all monitoring type values"""
        assert MonitoringType.LOCATION.value == "location"
        assert MonitoringType.FLIGHT_STATUS.value == "flight_status"
        assert MonitoringType.WEATHER.value == "weather"
        assert MonitoringType.TRAFFIC.value == "traffic"
        assert MonitoringType.AIRPORT_CONDITIONS.value == "airport_conditions"

    def test_monitoring_type_count(self):
        """Test all monitoring types are present"""
        types = list(MonitoringType)
        assert len(types) == 5
