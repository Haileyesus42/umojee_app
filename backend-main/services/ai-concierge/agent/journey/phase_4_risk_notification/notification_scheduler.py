"""
Phase 4: Notification Scheduler

This module handles scheduling and timing of notifications.
It ensures notifications are sent at optimal times.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Callable, Awaitable, Protocol
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field, asdict
from enum import Enum
import asyncio
import logging
import uuid

logger = logging.getLogger(__name__)


class SchedulePersistence(Protocol):
    """Protocol for schedule persistence implementations."""
    
    async def save_schedule(self, schedule: 'ScheduledNotification') -> bool:
        """Save a scheduled notification."""
        ...
    
    async def load_schedules(self) -> List['ScheduledNotification']:
        """Load all pending scheduled notifications."""
        ...
    
    async def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        ...
    
    async def update_schedule(self, schedule: 'ScheduledNotification') -> bool:
        """Update an existing schedule."""
        ...


class ScheduleType(str, Enum):
    """Types of notification schedules."""
    ONE_TIME = "one_time"
    RECURRING = "recurring"
    CONDITIONAL = "conditional"


@dataclass
class ScheduledNotification:
    """A scheduled notification."""
    schedule_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    journey_id: str = ""
    user_id: str = ""
    schedule_type: ScheduleType = ScheduleType.ONE_TIME
    scheduled_time: Optional[datetime] = None
    notification_type: str = ""
    template_key: str = ""
    context: Dict[str, Any] = field(default_factory=dict)
    channels: List[str] = field(default_factory=lambda: ["push"])
    priority: str = "normal"
    sent: bool = False
    cancelled: bool = False
    recurrence_minutes: Optional[int] = None  # For recurring notifications
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage."""
        data = asdict(self)
        # Convert datetime to ISO string
        if data.get('scheduled_time') and isinstance(data['scheduled_time'], datetime):
            data['scheduled_time'] = data['scheduled_time'].isoformat()
        # Convert enum to string
        if isinstance(data.get('schedule_type'), ScheduleType):
            data['schedule_type'] = data['schedule_type'].value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ScheduledNotification':
        """Deserialize from dictionary."""
        # Convert ISO string back to datetime
        if 'scheduled_time' in data and isinstance(data['scheduled_time'], str):
            data['scheduled_time'] = datetime.fromisoformat(data['scheduled_time'])
        # Convert string back to enum
        if 'schedule_type' in data and isinstance(data['schedule_type'], str):
            data['schedule_type'] = ScheduleType(data['schedule_type'])
        return cls(**data)


class NotificationScheduler:
    """
    Schedules and manages notification delivery timing.

    This scheduler handles:
    - Time-based notifications (reminders, alerts)
    - Recurring notifications
    - Conditional notifications (based on journey state)
    - Notification rescheduling on context changes
    - Persistent storage and crash recovery
    """

    def __init__(
        self, 
        notification_handler: Optional[Callable] = None,
        persistence: Optional[SchedulePersistence] = None
    ):
        """
        Initialize the scheduler.

        Args:
            notification_handler: Async function to call when notification is due
            persistence: Optional persistence layer for storing schedules
        """
        self._scheduled: Dict[str, ScheduledNotification] = {}
        self._journey_schedules: Dict[str, List[str]] = {}  # journey_id -> schedule_ids
        self._notification_handler = notification_handler
        self._persistence = persistence
        self._running = False
        self._check_interval_seconds = 10
        self._scheduler_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the scheduler loop with crash recovery."""
        if self._running:
            logger.warning("Scheduler already running")
            return
        
        self._running = True
        
        # Load persisted schedules on startup
        if self._persistence:
            try:
                schedules = await self._persistence.load_schedules()
                for schedule in schedules:
                    if not schedule.sent and not schedule.cancelled:
                        self._add_schedule(schedule)
                logger.info(f"Loaded {len(schedules)} persisted schedules")
            except Exception as e:
                logger.error(f"Failed to load persisted schedules: {e}")
        
        logger.info("Notification scheduler started")
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())

    async def stop(self) -> None:
        """Stop the scheduler gracefully."""
        if not self._running:
            return
        
        self._running = False
        
        # Cancel the scheduler task
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        
        # Persist pending schedules
        if self._persistence:
            try:
                for schedule in self._scheduled.values():
                    if not schedule.sent and not schedule.cancelled:
                        await self._persistence.save_schedule(schedule)
                logger.info("Persisted pending schedules")
            except Exception as e:
                logger.error(f"Failed to persist schedules on shutdown: {e}")
        
        logger.info("Notification scheduler stopped")

    def schedule_get_ready_reminder(
        self,
        journey_id: str,
        user_id: str,
        departure_time: datetime,
        lead_minutes: int = 45,
        context: Optional[Dict[str, Any]] = None
    ) -> ScheduledNotification:
        """
        Schedule a "get ready" reminder.

        Args:
            journey_id: Journey ID
            user_id: User ID
            departure_time: When the user needs to leave
            lead_minutes: Minutes before departure to send
            context: Additional context for the notification

        Returns:
            The scheduled notification
        """
        scheduled_time = departure_time - timedelta(minutes=lead_minutes)

        existing = self._find_existing_schedule(
            journey_id=journey_id,
            template_key="departure",
            scheduled_time=scheduled_time,
        )
        if existing:
            logger.info(f"Get-ready reminder already scheduled for {scheduled_time}")
            return existing

        schedule = ScheduledNotification(
            journey_id=journey_id,
            user_id=user_id,
            schedule_type=ScheduleType.ONE_TIME,
            scheduled_time=scheduled_time,
            notification_type="reminder",
            template_key="departure",
            context=context or {"destination": "the airport"},
            priority="normal"
        )

        self._add_schedule(schedule)
        logger.info(f"Scheduled get-ready reminder for {scheduled_time}")

        return schedule

    def schedule_time_to_leave_reminder(
        self,
        journey_id: str,
        user_id: str,
        departure_time: datetime,
        context: Optional[Dict[str, Any]] = None
    ) -> ScheduledNotification:
        """
        Schedule a "time to leave" notification.

        Args:
            journey_id: Journey ID
            user_id: User ID
            departure_time: When the user needs to leave
            context: Additional context for the notification

        Returns:
            The scheduled notification
        """
        existing = self._find_existing_schedule(
            journey_id=journey_id,
            template_key="time_to_leave",
            scheduled_time=departure_time,
        )
        if existing:
            logger.info(f"Time-to-leave reminder already scheduled for {departure_time}")
            return existing

        schedule = ScheduledNotification(
            journey_id=journey_id,
            user_id=user_id,
            schedule_type=ScheduleType.ONE_TIME,
            scheduled_time=departure_time,
            notification_type="reminder",
            template_key="time_to_leave",
            context=context or {"traffic_status": "normal"},
            priority="high"
        )

        self._add_schedule(schedule)
        logger.info(f"Scheduled time-to-leave reminder for {departure_time}")

        return schedule

    def schedule_boarding_reminder(
        self,
        journey_id: str,
        user_id: str,
        boarding_time: datetime,
        gate: str,
        lead_minutes: int = 15,
        context: Optional[Dict[str, Any]] = None
    ) -> ScheduledNotification:
        """
        Schedule a boarding reminder.

        Args:
            journey_id: Journey ID
            user_id: User ID
            boarding_time: When boarding starts
            gate: Gate number
            lead_minutes: Minutes before boarding to send
            context: Additional context

        Returns:
            The scheduled notification
        """
        scheduled_time = boarding_time - timedelta(minutes=lead_minutes)

        ctx = context or {}
        ctx.update({"gate": gate, "minutes": lead_minutes})

        schedule = ScheduledNotification(
            journey_id=journey_id,
            user_id=user_id,
            schedule_type=ScheduleType.ONE_TIME,
            scheduled_time=scheduled_time,
            notification_type="reminder",
            template_key="boarding",
            context=ctx,
            priority="high"
        )

        self._add_schedule(schedule)
        logger.info(f"Scheduled boarding reminder for {scheduled_time}")

        return schedule

    def schedule_recurring_check(
        self,
        journey_id: str,
        user_id: str,
        check_type: str,
        interval_minutes: int,
        start_time: Optional[datetime] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ScheduledNotification:
        """
        Schedule a recurring check notification.

        Args:
            journey_id: Journey ID
            user_id: User ID
            check_type: Type of check (traffic, flight_status, etc.)
            interval_minutes: Minutes between checks
            start_time: When to start (now if not specified)
            context: Additional context

        Returns:
            The scheduled notification
        """
        schedule = ScheduledNotification(
            journey_id=journey_id,
            user_id=user_id,
            schedule_type=ScheduleType.RECURRING,
            scheduled_time=start_time or datetime.now(timezone.utc),
            notification_type="update",
            template_key=check_type,
            context=context or {},
            recurrence_minutes=interval_minutes
        )

        self._add_schedule(schedule)
        logger.info(f"Scheduled recurring {check_type} check every {interval_minutes} minutes")

        return schedule

    def schedule_risk_escalation(
        self,
        journey_id: str,
        user_id: str,
        risk_level: str,
        reason: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ScheduledNotification:
        """
        Schedule an immediate risk escalation notification.

        Args:
            journey_id: Journey ID
            user_id: User ID
            risk_level: Current risk level
            reason: Reason for escalation
            context: Additional context

        Returns:
            The scheduled notification
        """
        ctx = context or {}
        ctx.update({"risk_level": risk_level, "reason": reason})

        schedule = ScheduledNotification(
            journey_id=journey_id,
            user_id=user_id,
            schedule_type=ScheduleType.ONE_TIME,
            scheduled_time=datetime.now(timezone.utc),  # Immediate
            notification_type="risk_escalation",
            template_key="action_needed",
            context=ctx,
            priority="urgent"
        )

        self._add_schedule(schedule)
        logger.info(f"Scheduled risk escalation notification: {reason}")

        return schedule

    def cancel_schedule(self, schedule_id: str) -> bool:
        """
        Cancel a scheduled notification.

        Args:
            schedule_id: ID of the schedule to cancel

        Returns:
            True if cancelled successfully
        """
        if schedule_id in self._scheduled:
            self._scheduled[schedule_id].cancelled = True
            logger.info(f"Cancelled schedule: {schedule_id}")
            return True
        return False

    def cancel_journey_schedules(self, journey_id: str) -> int:
        """
        Cancel all schedules for a journey.

        Args:
            journey_id: Journey ID

        Returns:
            Number of schedules cancelled
        """
        schedule_ids = self._journey_schedules.get(journey_id, [])
        cancelled = 0

        for schedule_id in schedule_ids:
            if self.cancel_schedule(schedule_id):
                cancelled += 1

        logger.info(f"Cancelled {cancelled} schedules for journey {journey_id}")
        return cancelled

    def reschedule(
        self,
        schedule_id: str,
        new_time: datetime
    ) -> bool:
        """
        Reschedule a notification.

        Args:
            schedule_id: ID of the schedule
            new_time: New scheduled time

        Returns:
            True if rescheduled successfully
        """
        if schedule_id not in self._scheduled:
            return False

        schedule = self._scheduled[schedule_id]
        if schedule.sent or schedule.cancelled:
            return False

        schedule.scheduled_time = new_time
        logger.info(f"Rescheduled {schedule_id} to {new_time}")
        return True

    def reschedule_on_context_change(
        self,
        journey_id: str,
        new_departure_time: Optional[datetime] = None,
        new_boarding_time: Optional[datetime] = None
    ) -> int:
        """
        Automatically reschedule notifications based on context changes.
        """
        rescheduled_count = 0
        pending = self.get_pending_schedules(journey_id)

        for schedule in pending:
            if new_departure_time:
                if schedule.template_key == "departure":
                    # Reschedule get-ready reminder
                    new_time = new_departure_time - timedelta(minutes=45)
                    if self.reschedule(schedule.schedule_id, new_time):
                        rescheduled_count += 1
                elif schedule.template_key == "time_to_leave":
                    # Reschedule time-to-leave
                    if self.reschedule(schedule.schedule_id, new_departure_time):
                        rescheduled_count += 1
                        
            if new_boarding_time and schedule.template_key == "boarding":
                new_time = new_boarding_time - timedelta(minutes=15)
                if self.reschedule(schedule.schedule_id, new_time):
                    rescheduled_count += 1

        if rescheduled_count > 0:
            logger.info(f"Automatically rescheduled {rescheduled_count} notifications for journey {journey_id}")
            
        return rescheduled_count

    def get_pending_schedules(
        self,
        journey_id: Optional[str] = None
    ) -> List[ScheduledNotification]:
        """
        Get all pending (unsent, uncancelled) schedules.

        Args:
            journey_id: Optional filter by journey

        Returns:
            List of pending schedules
        """
        schedules = [
            s for s in self._scheduled.values()
            if not s.sent and not s.cancelled
        ]

        if journey_id:
            schedules = [s for s in schedules if s.journey_id == journey_id]

        return sorted(schedules, key=lambda s: s.scheduled_time or datetime.max)

    def _add_schedule(self, schedule: ScheduledNotification) -> None:
        """Add a schedule to the internal tracking."""
        self._scheduled[schedule.schedule_id] = schedule

        if schedule.journey_id not in self._journey_schedules:
            self._journey_schedules[schedule.journey_id] = []
        self._journey_schedules[schedule.journey_id].append(schedule.schedule_id)

    def _find_existing_schedule(
        self,
        journey_id: str,
        template_key: str,
        scheduled_time: datetime,
    ) -> Optional[ScheduledNotification]:
        """Find an equivalent pending schedule for the same journey and time."""
        for schedule in self.get_pending_schedules(journey_id):
            if (
                schedule.template_key == template_key
                and schedule.scheduled_time == scheduled_time
            ):
                return schedule
        return None

    async def _scheduler_loop(self) -> None:
        """Main scheduler loop that checks for due notifications."""
        while self._running:
            try:
                now = datetime.now(timezone.utc)

                for schedule in list(self._scheduled.values()):
                    if schedule.sent or schedule.cancelled:
                        continue

                    if schedule.scheduled_time and schedule.scheduled_time <= now:
                        await self._trigger_notification(schedule)

            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")

            await asyncio.sleep(self._check_interval_seconds)

    async def _trigger_notification(self, schedule: ScheduledNotification) -> None:
        """Trigger a scheduled notification."""
        try:
            if self._notification_handler:
                await self._notification_handler(schedule)
            else:
                logger.info(
                    f"Notification triggered: {schedule.notification_type} "
                    f"for journey {schedule.journey_id}"
                )

            schedule.sent = True

            # Handle recurring
            if schedule.schedule_type == ScheduleType.RECURRING and schedule.recurrence_minutes:
                # Schedule next occurrence
                new_schedule = ScheduledNotification(
                    journey_id=schedule.journey_id,
                    user_id=schedule.user_id,
                    schedule_type=ScheduleType.RECURRING,
                    scheduled_time=datetime.now(timezone.utc) + timedelta(minutes=schedule.recurrence_minutes),
                    notification_type=schedule.notification_type,
                    template_key=schedule.template_key,
                    context=schedule.context,
                    recurrence_minutes=schedule.recurrence_minutes
                )
                self._add_schedule(new_schedule)

        except Exception as e:
            logger.error(f"Error triggering notification {schedule.schedule_id}: {e}")
