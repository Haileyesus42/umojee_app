"""
Phase 2: Test Suite - Context Monitoring Engine

This test file validates the Phase 2 implementation including:
- Context monitor service
- Background task manager
- Real-time context APIs (tools)

Run with: pytest agent/journey/phase_2_context_monitoring/test_phase_2.py -v

Note: Async tests require pytest-asyncio. Install with: pip install pytest-asyncio
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, AsyncMock, patch

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)
from . import (
    ContextMonitor,
    MonitoringConfig,
    MonitoringType,
    ContextUpdate,
    BackgroundTaskManager,
    ScheduledTask,
    TaskStatus,
    TaskPriority,
    TaskResult,
    get_current_location,
    get_flight_status,
    get_traffic_conditions,
    get_weather_forecast,
    get_airport_intelligence,
)


# =============================================================================
# Context Monitor Tests
# =============================================================================

class TestContextMonitor:
    """Tests for Context Monitor service."""

    @pytest.fixture
    def monitor(self):
        """Create a context monitor for testing."""
        config = MonitoringConfig(
            location_interval_seconds=1,  # Fast intervals for testing
            flight_status_interval_seconds=1,
            weather_interval_seconds=1,
            traffic_interval_seconds=1,
            airport_interval_seconds=1,
        )
        return ContextMonitor(config=config)

    @pytest.mark.asyncio
    async def test_start_monitoring(self, monitor):
        """Test starting monitoring for a journey."""
        journey_id = "journey123"

        result = await monitor.start_monitoring(journey_id)

        assert result is True
        assert monitor.is_monitoring(journey_id)
        assert journey_id in monitor.get_active_journeys()

        # Cleanup
        await monitor.stop_monitoring(journey_id)

    @pytest.mark.asyncio
    async def test_stop_monitoring(self, monitor):
        """Test stopping monitoring for a journey."""
        journey_id = "journey123"

        await monitor.start_monitoring(journey_id)
        result = await monitor.stop_monitoring(journey_id)

        assert result is True
        assert not monitor.is_monitoring(journey_id)

    @pytest.mark.asyncio
    async def test_cannot_start_monitoring_twice(self, monitor):
        """Test that monitoring cannot be started twice for same journey."""
        journey_id = "journey123"

        await monitor.start_monitoring(journey_id)
        result = await monitor.start_monitoring(journey_id)

        assert result is False  # Should fail

        # Cleanup
        await monitor.stop_monitoring(journey_id)

    @pytest.mark.asyncio
    async def test_monitoring_specific_types(self, monitor):
        """Test monitoring specific context types only."""
        journey_id = "journey123"

        await monitor.start_monitoring(
            journey_id,
            monitoring_types=[MonitoringType.LOCATION, MonitoringType.WEATHER]
        )

        assert monitor.is_monitoring(journey_id)

        # Cleanup
        await monitor.stop_monitoring(journey_id)

    @pytest.mark.asyncio
    async def test_context_update_callback(self, monitor):
        """Test that context updates trigger callback."""
        journey_id = "journey123"
        updates_received = []

        def callback(update: ContextUpdate):
            updates_received.append(update)

        monitor.on_context_update = callback

        await monitor.start_monitoring(
            journey_id,
            monitoring_types=[MonitoringType.LOCATION]
        )

        # Wait for at least one update
        await asyncio.sleep(3.0)

        await monitor.stop_monitoring(journey_id)

        assert len(updates_received) > 0
        assert updates_received[0].journey_id == journey_id
        assert updates_received[0].monitoring_type == MonitoringType.LOCATION

    @pytest.mark.asyncio
    async def test_get_latest_context(self, monitor):
        """Test retrieving latest context."""
        journey_id = "journey123"

        await monitor.start_monitoring(
            journey_id,
            monitoring_types=[MonitoringType.LOCATION]
        )

        # Wait for update
        await asyncio.sleep(3.0)

        context = monitor.get_latest_context(journey_id)

        assert context is not None
        assert MonitoringType.LOCATION in context

        # Cleanup
        await monitor.stop_monitoring(journey_id)

    @pytest.mark.asyncio
    async def test_stop_all_monitoring(self, monitor):
        """Test stopping all monitoring."""
        await monitor.start_monitoring("journey1")
        await monitor.start_monitoring("journey2")

        assert len(monitor.get_active_journeys()) == 2

        await monitor.stop_all()

        assert len(monitor.get_active_journeys()) == 0

    def test_monitoring_config_defaults(self):
        """Test monitoring config default values."""
        config = MonitoringConfig()

        assert config.location_interval_seconds == 60
        assert config.flight_status_interval_seconds == 300
        assert config.weather_interval_seconds == 900
        assert config.traffic_interval_seconds == 180
        assert config.airport_interval_seconds == 600


# =============================================================================
# Background Task Manager Tests
# =============================================================================

class TestBackgroundTaskManager:
    """Tests for Background Task Manager."""

    @pytest.fixture
    def manager(self):
        """Create a task manager for testing."""
        return BackgroundTaskManager(max_concurrent_tasks=5)

    @pytest.mark.asyncio
    async def test_schedule_task(self, manager):
        """Test scheduling a basic task."""
        await manager.start()

        task = await manager.schedule_task(
            task_type="test_task",
            name="Test Task",
            journey_id="journey123"
        )

        assert task is not None
        assert task.task_type == "test_task"
        assert task.journey_id == "journey123"
        assert task.status == TaskStatus.PENDING

        await manager.stop()

    @pytest.mark.asyncio
    async def test_task_execution_with_handler(self, manager):
        """Test task execution with registered handler."""
        executed = []

        async def test_handler(**kwargs):
            executed.append(kwargs)
            return {"result": "success"}

        manager.register_handler("test_task", test_handler)
        await manager.start()

        task = await manager.schedule_task(
            task_type="test_task",
            name="Test Task",
            test_param="test_value"
        )

        # Wait for execution
        await asyncio.sleep(0.5)

        assert len(executed) == 1
        assert executed[0]["test_param"] == "test_value"

        await manager.stop()

    @pytest.mark.asyncio
    async def test_delayed_task(self, manager):
        """Test scheduling a delayed task."""
        start_time = datetime.now(timezone.utc)
        executed_at = []

        async def test_handler(**kwargs):
            executed_at.append(datetime.now(timezone.utc))

        manager.register_handler("delayed_task", test_handler)
        await manager.start()

        await manager.schedule_task(
            task_type="delayed_task",
            name="Delayed Task",
            delay_seconds=1
        )

        # Wait for execution
        await asyncio.sleep(2)

        assert len(executed_at) == 1
        delay = (executed_at[0] - start_time).total_seconds()
        assert delay >= 1.0  # Should have waited at least 1 second

        await manager.stop()

    @pytest.mark.asyncio
    async def test_cancel_task(self, manager):
        """Test cancelling a task."""
        await manager.start()

        task = await manager.schedule_task(
            task_type="long_task",
            name="Long Task",
            delay_seconds=60  # Won't execute immediately
        )

        result = await manager.cancel_task(task.task_id)

        assert result is True
        assert manager.get_task(task.task_id).status == TaskStatus.CANCELLED

        await manager.stop()

    @pytest.mark.asyncio
    async def test_cancel_journey_tasks(self, manager):
        """Test cancelling all tasks for a journey."""
        await manager.start()

        # Schedule multiple tasks for same journey
        await manager.schedule_task(
            task_type="task1", name="Task 1", journey_id="journey123", delay_seconds=60
        )
        await manager.schedule_task(
            task_type="task2", name="Task 2", journey_id="journey123", delay_seconds=60
        )
        await manager.schedule_task(
            task_type="task3", name="Task 3", journey_id="journey456", delay_seconds=60
        )

        cancelled = await manager.cancel_journey_tasks("journey123")

        assert cancelled == 2

        # Other journey tasks should not be affected
        journey456_tasks = manager.get_journey_tasks("journey456")
        assert len(journey456_tasks) == 1

        await manager.stop()

    @pytest.mark.asyncio
    async def test_schedule_notification_task(self, manager):
        """Test scheduling a notification task."""
        await manager.start()

        scheduled_time = datetime.now(timezone.utc) + timedelta(minutes=30)

        task = await manager.schedule_notification_task(
            journey_id="journey123",
            notification_type="departure_reminder",
            scheduled_time=scheduled_time,
            message="Time to leave for the airport!",
            channels=["push", "sms"]
        )

        assert task is not None
        assert task.task_type == "notification"
        assert task.priority == TaskPriority.HIGH

        await manager.stop()

    @pytest.mark.asyncio
    async def test_get_journey_tasks(self, manager):
        """Test getting all tasks for a journey."""
        await manager.start()

        await manager.schedule_task(
            task_type="task1", name="Task 1", journey_id="journey123", delay_seconds=60
        )
        await manager.schedule_task(
            task_type="task2", name="Task 2", journey_id="journey123", delay_seconds=60
        )

        tasks = manager.get_journey_tasks("journey123")

        assert len(tasks) == 2

        await manager.stop()

    @pytest.mark.asyncio
    async def test_task_stats(self, manager):
        """Test getting task manager statistics."""
        await manager.start()

        await manager.schedule_task(
            task_type="task1", name="Task 1", delay_seconds=60
        )

        stats = manager.get_stats()

        assert stats["total_tasks"] >= 1
        assert stats["max_concurrent"] == 5
        assert "status_counts" in stats

        await manager.stop()

    @pytest.mark.asyncio
    async def test_task_retry_on_failure(self, manager):
        """Test that failed tasks are retried."""
        attempt_count = [0]

        async def failing_handler(**kwargs):
            attempt_count[0] += 1
            if attempt_count[0] < 3:
                raise Exception("Simulated failure")
            return {"success": True}

        manager.register_handler("retry_task", failing_handler)
        await manager.start()

        task = await manager.schedule_task(
            task_type="retry_task",
            name="Retry Task"
        )

        # Wait for retries
        await asyncio.sleep(10)

        assert attempt_count[0] == 3  # Should have retried twice

        await manager.stop()


# =============================================================================
# Context Tools Tests
# =============================================================================

class TestContextTools:
    """Tests for Context Tools (LangChain tools)."""

    def test_get_current_location(self):
        """Test get_current_location tool."""
        result = get_current_location.invoke({"user_id": "user123"})

        assert "latitude" in result
        assert "longitude" in result
        assert "city" in result
        assert "detected_at" in result

    def test_get_flight_status(self):
        """Test get_flight_status tool."""
        result = get_flight_status.invoke({"flight_number": "UA123"})

        assert result["flight_number"] == "UA123"
        assert "status" in result
        assert "departure_airport" in result
        assert "arrival_airport" in result
        assert "gate" in result

    def test_get_traffic_conditions(self):
        """Test get_traffic_conditions tool."""
        result = get_traffic_conditions.invoke({
            "origin_lat": 40.7128,
            "origin_lon": -74.0060,
            "dest_lat": 40.6413,
            "dest_lon": -73.7781
        })

        assert "conditions" in result
        assert "normal_duration_minutes" in result
        assert "current_duration_minutes" in result
        assert "delay_minutes" in result

    def test_get_weather_forecast(self):
        """Test get_weather_forecast tool."""
        result = get_weather_forecast.invoke({
            "latitude": 40.7128,
            "longitude": -74.0060,
            "days": 3
        })

        assert "current" in result
        assert "hourly" in result
        assert "daily" in result
        assert len(result["daily"]) == 3

    def test_get_airport_intelligence(self):
        """Test get_airport_intelligence tool."""
        result = get_airport_intelligence.invoke({"airport_code": "JFK"})

        assert result["airport_code"] == "JFK"
        assert "security" in result
        assert "terminals" in result
        assert "amenities" in result
        assert "congestion" in result


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase2Integration:
    """Integration tests for Phase 2 components."""

    @pytest.mark.asyncio
    async def test_monitor_with_task_manager(self):
        """Test context monitor integrated with task manager."""
        manager = BackgroundTaskManager()
        monitor = ContextMonitor(
            config=MonitoringConfig(location_interval_seconds=1)
        )

        # Track context updates
        updates = []
        monitor.on_context_update = lambda u: updates.append(u)

        await manager.start()
        await monitor.start_monitoring("journey123", [MonitoringType.LOCATION])

        # Wait for updates
        await asyncio.sleep(2)

        await monitor.stop_monitoring("journey123")
        await manager.stop()

        assert len(updates) > 0

    @pytest.mark.asyncio
    async def test_multiple_journeys_concurrent(self):
        """Test monitoring multiple journeys concurrently."""
        monitor = ContextMonitor(
            config=MonitoringConfig(location_interval_seconds=1)
        )

        journey_updates = {"j1": [], "j2": []}

        def callback(update: ContextUpdate):
            if update.journey_id == "j1":
                journey_updates["j1"].append(update)
            elif update.journey_id == "j2":
                journey_updates["j2"].append(update)

        monitor.on_context_update = callback

        await monitor.start_monitoring("j1", [MonitoringType.LOCATION])
        await monitor.start_monitoring("j2", [MonitoringType.WEATHER])

        await asyncio.sleep(2)

        await monitor.stop_all()

        # Both journeys should have updates
        assert len(journey_updates["j1"]) > 0
        assert len(journey_updates["j2"]) > 0


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
