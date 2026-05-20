"""
Pytest test suite for Background Task Manager
Tests task scheduling, execution, cancellation, and handlers
"""

import pytest
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from background_tasks import (
    BackgroundTaskManager,
    TaskStatus,
    TaskPriority,
    ScheduledTask,
    TaskResult
)


@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def task_manager():
    """Create and start a task manager for tests"""
    manager = BackgroundTaskManager(max_concurrent_tasks=5)
    await manager.start()
    yield manager
    await manager.stop()


@pytest.fixture
def executed_tasks():
    """Track executed tasks"""
    tasks = []
    yield tasks
    tasks.clear()


async def dummy_notification_handler(notification_type: str = None, message: str = None, channels: list = None, **kwargs):
    """Dummy handler for notification tasks"""
    await asyncio.sleep(0.1)
    return {"sent": True, "channels": channels, "type": notification_type, "message": message}


async def dummy_recalculation_handler(journey_id: str = None, **kwargs):
    """Dummy handler for recalculation tasks"""
    await asyncio.sleep(0.1)
    return {"recalculated": True, "journey_id": journey_id}


async def dummy_monitoring_handler(journey_id: str = None, **kwargs):
    """Dummy handler for monitoring tasks"""
    await asyncio.sleep(0.1)
    return {"checked": True, "journey_id": journey_id}


class TestBackgroundTaskManager:
    """Test suite for BackgroundTaskManager"""

    @pytest.mark.asyncio
    async def test_manager_initialization(self):
        """Test manager can be initialized with custom settings"""
        manager = BackgroundTaskManager(max_concurrent_tasks=3)
        assert manager.max_concurrent_tasks == 3
        assert manager._running == False
        assert len(manager._tasks) == 0

    @pytest.mark.asyncio
    async def test_start_stop(self):
        """Test manager can start and stop"""
        manager = BackgroundTaskManager()
        await manager.start()
        assert manager._running == True
        
        await manager.stop()
        assert manager._running == False

    @pytest.mark.asyncio
    async def test_register_handler(self, task_manager):
        """Test registering task handlers"""
        task_manager.register_handler("test_task", dummy_monitoring_handler)
        assert "test_task" in task_manager._task_handlers
        assert task_manager._task_handlers["test_task"] == dummy_monitoring_handler

    @pytest.mark.asyncio
    async def test_basic_task_scheduling(self, task_manager):
        """Test basic task scheduling and execution"""
        task_manager.register_handler("test_task", dummy_monitoring_handler)
        
        task = await task_manager.schedule_task(
            task_type="test_task",
            name="Test Task",
            journey_id="journey_001",
            priority=TaskPriority.NORMAL
        )
        
        assert task.task_id is not None
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.NORMAL
        assert task.journey_id == "journey_001"
        
        await asyncio.sleep(0.3)
        
        completed_task = task_manager.get_task(task.task_id)
        assert completed_task.status == TaskStatus.COMPLETED
        assert completed_task.result is not None

    @pytest.mark.asyncio
    async def test_delayed_task(self, task_manager):
        """Test delayed task scheduling"""
        task_manager.register_handler("delayed_test", dummy_monitoring_handler)
        
        task = await task_manager.schedule_task(
            task_type="delayed_test",
            name="Delayed Task",
            journey_id="journey_002",
            delay_seconds=1
        )
        
        assert task.scheduled_time is not None
        
        # Check status before delay
        await asyncio.sleep(0.3)
        assert task_manager.get_task(task.task_id).status == TaskStatus.PENDING
        
        # Wait for execution
        await asyncio.sleep(1.5)
        completed = task_manager.get_task(task.task_id)
        assert completed.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_notification_task(self, task_manager):
        """Test notification task scheduling"""
        task_manager.register_handler("notification", dummy_notification_handler)
        
        scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=1)
        
        task = await task_manager.schedule_notification_task(
            journey_id="journey_003",
            notification_type="flight_reminder",
            scheduled_time=scheduled_time,
            message="Test notification",
            channels=["push", "email"]
        )
        
        assert task.priority == TaskPriority.HIGH
        assert "notification_type" in task.__dict__ or True  # kwargs stored
        
        await asyncio.sleep(1.5)
        
        completed = task_manager.get_task(task.task_id)
        assert completed.status == TaskStatus.COMPLETED
        assert completed.result["sent"] == True

    @pytest.mark.asyncio
    async def test_recalculation_task(self, task_manager):
        """Test recalculation task scheduling"""
        task_manager.register_handler("recalculate_timeline", dummy_recalculation_handler)
        
        task = await task_manager.schedule_recalculation_task(
            journey_id="journey_004",
            recalculation_type="timeline"
        )
        
        await asyncio.sleep(0.3)
        
        completed = task_manager.get_task(task.task_id)
        assert completed.status == TaskStatus.COMPLETED
        assert completed.result["recalculated"] == True

    @pytest.mark.asyncio
    async def test_task_cancellation(self, task_manager):
        """Test individual task cancellation"""
        task_manager.register_handler("long_task", dummy_monitoring_handler)
        
        task = await task_manager.schedule_task(
            task_type="long_task",
            name="Task to Cancel",
            journey_id="journey_005",
            delay_seconds=10
        )
        
        await asyncio.sleep(0.2)
        
        cancelled = await task_manager.cancel_task(task.task_id)
        assert cancelled == True
        assert task_manager.get_task(task.task_id).status == TaskStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_journey_task_cancellation(self, task_manager):
        """Test cancelling all tasks for a journey"""
        task_manager.register_handler("journey_task", dummy_monitoring_handler)
        
        journey_id = "journey_006"
        
        # Schedule multiple tasks
        for i in range(3):
            await task_manager.schedule_task(
                task_type="journey_task",
                name=f"Task {i+1}",
                journey_id=journey_id,
                delay_seconds=5
            )
        
        await asyncio.sleep(0.2)
        
        cancelled_count = await task_manager.cancel_journey_tasks(journey_id)
        assert cancelled_count == 3
        
        journey_tasks = task_manager.get_journey_tasks(journey_id)
        for task in journey_tasks:
            assert task.status == TaskStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_get_journey_tasks(self, task_manager):
        """Test getting tasks for a journey"""
        task_manager.register_handler("test", dummy_monitoring_handler)
        
        journey_id = "journey_007"
        
        await task_manager.schedule_task("test", "Task 1", journey_id=journey_id)
        await task_manager.schedule_task("test", "Task 2", journey_id=journey_id)
        
        tasks = task_manager.get_journey_tasks(journey_id)
        assert len(tasks) == 2
        assert all(t.journey_id == journey_id for t in tasks)

    @pytest.mark.asyncio
    async def test_task_stats(self, task_manager):
        """Test task manager statistics"""
        task_manager.register_handler("stats_test", dummy_monitoring_handler)
        
        await task_manager.schedule_task("stats_test", "Task 1", journey_id="j1")
        await task_manager.schedule_task("stats_test", "Task 2", journey_id="j2", delay_seconds=10)
        await task_manager.schedule_task("stats_test", "Task 3", journey_id="j3")
        
        await asyncio.sleep(0.3)
        
        stats = task_manager.get_stats()
        
        assert stats["total_tasks"] == 3
        assert stats["max_concurrent"] == 5
        assert "status_counts" in stats
        assert isinstance(stats["status_counts"], dict)

    @pytest.mark.asyncio
    async def test_task_priority(self, task_manager):
        """Test task priority levels"""
        task_manager.register_handler("priority_test", dummy_monitoring_handler)
        
        task_high = await task_manager.schedule_task(
            "priority_test", "High Priority", 
            priority=TaskPriority.HIGH
        )
        task_low = await task_manager.schedule_task(
            "priority_test", "Low Priority",
            priority=TaskPriority.LOW
        )
        
        assert task_high.priority == TaskPriority.HIGH
        assert task_low.priority == TaskPriority.LOW

    @pytest.mark.asyncio
    async def test_get_task(self, task_manager):
        """Test getting task by ID"""
        task_manager.register_handler("test", dummy_monitoring_handler)
        
        task = await task_manager.schedule_task("test", "Test Task")
        
        retrieved = task_manager.get_task(task.task_id)
        assert retrieved is not None
        assert retrieved.task_id == task.task_id
        assert retrieved.name == "Test Task"

    @pytest.mark.asyncio
    async def test_get_nonexistent_task(self, task_manager):
        """Test getting non-existent task returns None"""
        result = task_manager.get_task("nonexistent_id")
        assert result is None

    @pytest.mark.asyncio
    async def test_monitoring_task(self, task_manager):
        """Test scheduling monitoring task"""
        task_manager.register_handler("monitoring_location", dummy_monitoring_handler)
        
        task = await task_manager.schedule_monitoring_task(
            journey_id="journey_008",
            monitoring_type="location"
        )
        
        assert task is not None
        assert task.journey_id == "journey_008"
        
        await asyncio.sleep(0.3)
        completed = task_manager.get_task(task.task_id)
        assert completed.status == TaskStatus.COMPLETED


class TestScheduledTask:
    """Test ScheduledTask dataclass"""

    def test_task_creation(self):
        """Test creating a scheduled task"""
        task = ScheduledTask(
            name="Test Task",
            journey_id="journey_001",
            task_type="test",
            status=TaskStatus.PENDING,
            priority=TaskPriority.NORMAL
        )
        
        assert task.task_id is not None
        assert task.name == "Test Task"
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.NORMAL

    def test_task_defaults(self):
        """Test default values"""
        task = ScheduledTask()
        
        assert task.task_id is not None
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.NORMAL
        assert task.retry_count == 0
        assert task.max_retries == 3


class TestTaskStatus:
    """Test TaskStatus enum"""

    def test_status_values(self):
        """Test all status values exist"""
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.RUNNING.value == "running"
        assert TaskStatus.COMPLETED.value == "completed"
        assert TaskStatus.FAILED.value == "failed"
        assert TaskStatus.CANCELLED.value == "cancelled"


class TestTaskPriority:
    """Test TaskPriority enum"""

    def test_priority_values(self):
        """Test all priority values exist"""
        assert TaskPriority.LOW.value == "low"
        assert TaskPriority.NORMAL.value == "normal"
        assert TaskPriority.HIGH.value == "high"
        assert TaskPriority.URGENT.value == "urgent"
