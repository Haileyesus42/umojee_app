"""
Phase 2: Background Task Manager

This module provides async task management for background operations.
It handles scheduling, execution, and cancellation of background tasks.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

import asyncio
from typing import Dict, Any, Optional, Callable, Awaitable, List
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Status of a scheduled task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Priority levels for tasks."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class ScheduledTask:
    """Represents a scheduled background task."""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    journey_id: Optional[str] = None
    task_type: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL
    scheduled_time: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class TaskResult:
    """Result from a task execution."""
    task_id: str
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: float = 0


class BackgroundTaskManager:
    """
    Manages background tasks for journey monitoring and notifications.

    This class provides:
    - Task scheduling (immediate or delayed)
    - Task execution with retries
    - Task cancellation
    - Task status tracking
    """

    def __init__(self, max_concurrent_tasks: int = 10):
        """
        Initialize the task manager.

        Args:
            max_concurrent_tasks: Maximum tasks to run concurrently
        """
        self.max_concurrent_tasks = max_concurrent_tasks
        self._tasks: Dict[str, ScheduledTask] = {}
        self._running_tasks: Dict[str, asyncio.Task] = {}
        self._task_handlers: Dict[str, Callable[..., Awaitable[Any]]] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self._running = False

    def register_handler(
        self,
        task_type: str,
        handler: Callable[..., Awaitable[Any]]
    ) -> None:
        """
        Register a handler function for a task type.

        Args:
            task_type: The type of task this handler processes
            handler: Async function to execute the task
        """
        self._task_handlers[task_type] = handler
        logger.info(f"Registered handler for task type: {task_type}")

    async def schedule_task(
        self,
        task_type: str,
        name: str,
        journey_id: Optional[str] = None,
        delay_seconds: int = 0,
        priority: TaskPriority = TaskPriority.NORMAL,
        **kwargs
    ) -> ScheduledTask:
        """
        Schedule a task for execution.

        Args:
            task_type: Type of task to execute
            name: Human-readable task name
            journey_id: Associated journey (optional)
            delay_seconds: Delay before execution
            priority: Task priority
            **kwargs: Additional arguments for the task handler

        Returns:
            The scheduled task
        """
        task = ScheduledTask(
            name=name,
            journey_id=journey_id,
            task_type=task_type,
            priority=priority,
            scheduled_time=datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
        )

        self._tasks[task.task_id] = task

        # Schedule execution
        asyncio_task = asyncio.create_task(
            self._execute_task(task, kwargs)
        )
        self._running_tasks[task.task_id] = asyncio_task

        logger.info(f"Scheduled task {task.task_id}: {name} (delay: {delay_seconds}s)")
        return task

    async def schedule_monitoring_task(
        self,
        journey_id: str,
        monitoring_type: str,
        interval_seconds: int = 60
    ) -> ScheduledTask:
        """
        Schedule a recurring monitoring task.
        
        Note: This schedules the FIRST check. For continuous monitoring,
        use ContextMonitor instead, which handles recurring loops.

        Args:
            journey_id: Journey to monitor
            monitoring_type: Type of monitoring
            interval_seconds: Delay before first check (not used for recurring)

        Returns:
            The scheduled task
        """
        return await self.schedule_task(
            task_type=f"monitoring_{monitoring_type}",
            name=f"Monitor {monitoring_type} for journey {journey_id}",
            journey_id=journey_id,
            delay_seconds=0  # Execute immediately (one-time check)
        )

    async def schedule_notification_task(
        self,
        journey_id: str,
        notification_type: str,
        scheduled_time: datetime,
        message: str,
        channels: List[str] = None
    ) -> ScheduledTask:
        """
        Schedule a notification task.

        Args:
            journey_id: Journey this notification is for
            notification_type: Type of notification
            scheduled_time: When to send the notification
            message: Notification message
            channels: Channels to send to (push, sms, email)

        Returns:
            The scheduled task
        """
        delay = (scheduled_time - datetime.now(timezone.utc)).total_seconds()
        delay = max(0, delay)  # Don't allow negative delay

        return await self.schedule_task(
            task_type="notification",
            name=f"Send {notification_type} notification",
            journey_id=journey_id,
            delay_seconds=int(delay),
            priority=TaskPriority.HIGH,
            notification_type=notification_type,
            message=message,
            channels=channels or ["push"]
        )

    async def schedule_recalculation_task(
        self,
        journey_id: str,
        recalculation_type: str
    ) -> ScheduledTask:
        """
        Schedule a timeline/risk recalculation task.

        Args:
            journey_id: Journey to recalculate
            recalculation_type: What to recalculate (timeline, risk, etc.)

        Returns:
            The scheduled task
        """
        return await self.schedule_task(
            task_type=f"recalculate_{recalculation_type}",
            name=f"Recalculate {recalculation_type} for journey {journey_id}",
            journey_id=journey_id,
            priority=TaskPriority.NORMAL
        )

    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a scheduled task.

        Args:
            task_id: Task to cancel

        Returns:
            True if cancelled successfully
        """
        if task_id not in self._tasks:
            return False

        task = self._tasks[task_id]

        # Cancel the asyncio task if running
        if task_id in self._running_tasks:
            self._running_tasks[task_id].cancel()
            del self._running_tasks[task_id]

        task.status = TaskStatus.CANCELLED
        logger.info(f"Cancelled task {task_id}")

        return True

    async def cancel_journey_tasks(self, journey_id: str) -> int:
        """
        Cancel all tasks for a journey.

        Args:
            journey_id: Journey whose tasks to cancel

        Returns:
            Number of tasks cancelled
        """
        cancelled = 0
        for task_id, task in list(self._tasks.items()):
            if task.journey_id == journey_id and task.status in [
                TaskStatus.PENDING, TaskStatus.RUNNING
            ]:
                await self.cancel_task(task_id)
                cancelled += 1

        logger.info(f"Cancelled {cancelled} tasks for journey {journey_id}")
        return cancelled

    def get_task(self, task_id: str) -> Optional[ScheduledTask]:
        """Get a task by ID."""
        return self._tasks.get(task_id)

    def get_journey_tasks(
        self,
        journey_id: str,
        status: Optional[TaskStatus] = None
    ) -> List[ScheduledTask]:
        """
        Get all tasks for a journey.

        Args:
            journey_id: Journey to get tasks for
            status: Filter by status (optional)

        Returns:
            List of tasks
        """
        tasks = [
            t for t in self._tasks.values()
            if t.journey_id == journey_id
        ]

        if status:
            tasks = [t for t in tasks if t.status == status]

        return tasks

    async def _execute_task(
        self,
        task: ScheduledTask,
        kwargs: Dict[str, Any]
    ) -> TaskResult:
        """
        Execute a scheduled task.

        Args:
            task: The task to execute
            kwargs: Arguments for the handler

        Returns:
            Task result
        """
        # Wait for scheduled time
        if task.scheduled_time:
            delay = (task.scheduled_time - datetime.now(timezone.utc)).total_seconds()
            if delay > 0:
                await asyncio.sleep(delay)

        # Acquire semaphore for concurrency control
        async with self._semaphore:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now(timezone.utc)
            start_time = datetime.now(timezone.utc)

            try:
                # Get handler for task type
                handler = self._task_handlers.get(task.task_type)

                if handler:
                    result = await handler(**kwargs)
                else:
                    # Default handler - just log
                    logger.info(f"No handler for task type: {task.task_type}")
                    result = None

                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.now(timezone.utc)
                task.result = result

                execution_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

                return TaskResult(
                    task_id=task.task_id,
                    success=True,
                    data=result,
                    execution_time_ms=execution_time
                )

            except asyncio.CancelledError:
                task.status = TaskStatus.CANCELLED
                raise

            except Exception as e:
                task.error = str(e)
                task.retry_count += 1

                if task.retry_count < task.max_retries:
                    logger.warning(
                        f"Task {task.task_id} failed, retrying "
                        f"({task.retry_count}/{task.max_retries}): {e}"
                    )
                    # Reschedule with exponential backoff
                    await asyncio.sleep(2 ** task.retry_count)
                    return await self._execute_task(task, kwargs)
                else:
                    task.status = TaskStatus.FAILED
                    logger.error(f"Task {task.task_id} failed after {task.max_retries} retries: {e}")

                    return TaskResult(
                        task_id=task.task_id,
                        success=False,
                        error=str(e)
                    )

    async def start(self) -> None:
        """Start the task manager."""
        self._running = True
        logger.info("Background task manager started")

    async def stop(self) -> None:
        """Stop the task manager and cancel all tasks."""
        self._running = False

        # Cancel all running tasks
        for task_id in list(self._running_tasks.keys()):
            await self.cancel_task(task_id)

        logger.info("Background task manager stopped")

    def get_stats(self) -> Dict[str, Any]:
        """Get task manager statistics."""
        status_counts = {status: 0 for status in TaskStatus}
        for task in self._tasks.values():
            status_counts[task.status] += 1

        return {
            "total_tasks": len(self._tasks),
            "running_tasks": len(self._running_tasks),
            "status_counts": {k.value: v for k, v in status_counts.items()},
            "max_concurrent": self.max_concurrent_tasks,
        }
