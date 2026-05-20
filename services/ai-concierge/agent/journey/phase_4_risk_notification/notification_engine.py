"""
Phase 4: Notification Engine

This module provides the notification orchestration system.
It handles notification formatting, timing, and delivery across channels.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Callable, Tuple, Protocol
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field, asdict
from enum import Enum
import logging
import uuid
import json

logger = logging.getLogger(__name__)


class NotificationPersistence(Protocol):
    """Protocol for notification persistence implementations."""
    
    async def save_notification(self, notification: 'Notification') -> bool:
        """Save a notification to persistent storage."""
        ...
    
    async def get_notification_history(self, journey_id: str, limit: int = 20) -> List['Notification']:
        """Get notification history for a journey."""
        ...
    
    async def update_notification_status(self, notification_id: str, status: Dict[str, Any]) -> bool:
        """Update notification delivery status."""
        ...
    
    async def cleanup_old_notifications(self, days: int = 30) -> int:
        """Delete notifications older than N days."""
        ...


class NotificationChannel(str, Enum):
    """Available notification channels."""
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationType(str, Enum):
    """Types of notifications."""
    REMINDER = "reminder"
    ALERT = "alert"
    UPDATE = "update"
    CONFIRMATION = "confirmation"
    RISK_ESCALATION = "risk_escalation"


@dataclass
class NotificationDeliveryStatus:
    """Track notification delivery through its lifecycle."""
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None  # Provider confirmed delivery
    read_at: Optional[datetime] = None  # User opened/viewed
    interacted_at: Optional[datetime] = None  # User took action
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


@dataclass
class Notification:
    """A notification to be sent to the user."""
    notification_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    journey_id: str = ""
    user_id: str = ""
    notification_type: NotificationType = NotificationType.UPDATE
    priority: NotificationPriority = NotificationPriority.NORMAL
    title: str = ""
    message: str = ""
    channels: List[NotificationChannel] = field(default_factory=lambda: [NotificationChannel.PUSH])
    data: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    delivery_status: NotificationDeliveryStatus = field(default_factory=NotificationDeliveryStatus)
    
    # Backwards compatibility
    @property
    def sent_at(self) -> Optional[datetime]:
        return self.delivery_status.sent_at
    
    @property
    def delivered(self) -> bool:
        return self.delivery_status.delivered_at is not None
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage."""
        data = asdict(self)
        # Convert datetime objects to ISO strings
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        # Handle nested delivery_status
        if 'delivery_status' in data:
            for key, value in data['delivery_status'].items():
                if isinstance(value, datetime):
                    data['delivery_status'][key] = value.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Notification':
        """Deserialize from dictionary."""
        # Convert ISO strings back to datetime
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        
        # Handle delivery_status
        if 'delivery_status' in data:
            status_data = data['delivery_status']
            for key in ['sent_at', 'delivered_at', 'read_at', 'interacted_at', 'failed_at']:
                if key in status_data and status_data[key] and isinstance(status_data[key], str):
                    status_data[key] = datetime.fromisoformat(status_data[key])
            data['delivery_status'] = NotificationDeliveryStatus(**status_data)
        
        # Convert enum strings back to enums
        if 'notification_type' in data and isinstance(data['notification_type'], str):
            data['notification_type'] = NotificationType(data['notification_type'])
        if 'priority' in data and isinstance(data['priority'], str):
            data['priority'] = NotificationPriority(data['priority'])
        if 'channels' in data:
            data['channels'] = [NotificationChannel(ch) if isinstance(ch, str) else ch for ch in data['channels']]
        
        return cls(**data)


@dataclass
class UserPreferences:
    """User notification preferences."""
    quiet_hours_start: Optional[int] = 22  # 10 PM
    quiet_hours_end: Optional[int] = 7     # 7 AM
    preferred_channels: List[NotificationChannel] = field(
        default_factory=lambda: [NotificationChannel.PUSH]
    )
    sms_enabled: bool = False
    email_enabled: bool = True
    minimum_alert_priority: NotificationPriority = NotificationPriority.NORMAL


class NotificationEngine:
    """
    Orchestrates notification creation and delivery.

    This engine handles:
    - Formatting notifications in a calm, reassuring tone
    - Respecting user preferences and quiet hours
    - Choosing optimal delivery channels
    - Tracking notification history to avoid spam
    - Rate limiting and quota management
    """

    # Notification cooldown to prevent spam
    DEFAULT_COOLDOWN_MINUTES = 15
    
    # Delivery/read awareness: don't escalate to SMS if push was read within this window
    ESCALATION_READ_WINDOW_MINUTES = 30
    
    # Rate limiting quotas
    DAILY_NOTIFICATION_LIMIT = 50
    WEEKLY_SMS_LIMIT = 10  # SMS is expensive
    HOURLY_PUSH_LIMIT = 5

    def __init__(self, persistence: Optional[NotificationPersistence] = None):
        """Initialize the notification engine.
        
        Args:
            persistence: Optional persistence layer for storing notifications
        """
        self._notification_history: Dict[str, List[Notification]] = {}
        self._channel_handlers: Dict[NotificationChannel, Callable] = {}
        self._persistence = persistence
        
        # Rate limiting tracking (in-memory, should be persisted in production)
        self._user_notification_counts: Dict[str, Dict[str, int]] = {}  # user_id -> {daily, weekly_sms, hourly_push}

    def register_channel_handler(
        self,
        channel: NotificationChannel,
        handler: Callable[[Notification], bool]
    ) -> None:
        """
        Register a handler for a notification channel.

        Args:
            channel: The channel this handler processes
            handler: Function to send notification, returns success status
        """
        self._channel_handlers[channel] = handler
        logger.info(f"Registered handler for channel: {channel.value}")

    def check_notification_quota(
        self,
        user_id: str,
        channel: NotificationChannel,
        priority: NotificationPriority
    ) -> Tuple[bool, str]:
        """
        Check if user hasn't exceeded notification quotas.
        
        Args:
            user_id: User ID to check
            channel: Notification channel
            priority: Priority level (urgent bypasses quotas)
            
        Returns:
            Tuple of (within_quota, reason)
        """
        # Urgent notifications bypass quotas
        if priority == NotificationPriority.URGENT:
            return True, "Urgent - quota bypassed"
        
        # Initialize tracking for user if not exists
        if user_id not in self._user_notification_counts:
            self._user_notification_counts[user_id] = {
                'daily': 0,
                'weekly_sms': 0,
                'hourly_push': 0,
                'last_reset_daily': datetime.now(timezone.utc),
                'last_reset_weekly': datetime.now(timezone.utc),
                'last_reset_hourly': datetime.now(timezone.utc)
            }
        
        counts = self._user_notification_counts[user_id]
        now = datetime.now(timezone.utc)
        
        # Reset counters if time windows have passed
        if (now - counts['last_reset_daily']).days >= 1:
            counts['daily'] = 0
            counts['last_reset_daily'] = now
        
        if (now - counts['last_reset_weekly']).days >= 7:
            counts['weekly_sms'] = 0
            counts['last_reset_weekly'] = now
        
        if (now - counts['last_reset_hourly']).total_seconds() >= 3600:
            counts['hourly_push'] = 0
            counts['last_reset_hourly'] = now
        
        # Check quotas
        if counts['daily'] >= self.DAILY_NOTIFICATION_LIMIT:
            return False, f"Daily limit reached ({self.DAILY_NOTIFICATION_LIMIT})"
        
        if channel == NotificationChannel.SMS and counts['weekly_sms'] >= self.WEEKLY_SMS_LIMIT:
            return False, f"Weekly SMS limit reached ({self.WEEKLY_SMS_LIMIT})"
        
        if channel == NotificationChannel.PUSH and counts['hourly_push'] >= self.HOURLY_PUSH_LIMIT:
            return False, f"Hourly push notification limit reached ({self.HOURLY_PUSH_LIMIT})"
        
        return True, "Within quota"

    def _increment_quota_counter(self, user_id: str, channel: NotificationChannel) -> None:
        """Increment quota counters after successful send."""
        if user_id not in self._user_notification_counts:
            return
        
        counts = self._user_notification_counts[user_id]
        counts['daily'] = counts.get('daily', 0) + 1
        
        if channel == NotificationChannel.SMS:
            counts['weekly_sms'] = counts.get('weekly_sms', 0) + 1
        elif channel == NotificationChannel.PUSH:
            counts['hourly_push'] = counts.get('hourly_push', 0) + 1

    def should_notify(
        self,
        journey_id: str,
        notification_type: NotificationType,
        priority: NotificationPriority,
        user_id: str = "",
        user_preferences: Optional[UserPreferences] = None
    ) -> Tuple[bool, str]:
        """
        Determine if a notification should be sent.

        Implements "silence is a feature" - avoids unnecessary notifications.

        Args:
            journey_id: Journey this notification is for
            notification_type: Type of notification
            priority: Priority level
            user_id: User ID for quota checking
            user_preferences: User's notification preferences

        Returns:
            Tuple of (should_send, reason)
        """
        prefs = user_preferences or UserPreferences()
        now = datetime.now(timezone.utc)

        # Check quiet hours (except for urgent)
        if priority != NotificationPriority.URGENT:
            current_hour = now.hour
            if prefs.quiet_hours_start and prefs.quiet_hours_end:
                if prefs.quiet_hours_start > prefs.quiet_hours_end:
                    # Quiet hours span midnight
                    is_quiet = current_hour >= prefs.quiet_hours_start or current_hour < prefs.quiet_hours_end
                else:
                    is_quiet = prefs.quiet_hours_start <= current_hour < prefs.quiet_hours_end

                if is_quiet:
                    return False, "Quiet hours - notification deferred"

        # Check priority threshold
        priority_order = [
            NotificationPriority.LOW,
            NotificationPriority.NORMAL,
            NotificationPriority.HIGH,
            NotificationPriority.URGENT
        ]
        if priority_order.index(priority) < priority_order.index(prefs.minimum_alert_priority):
            return False, "Below user's minimum priority threshold"

        # Check cooldown (except for urgent)
        if priority != NotificationPriority.URGENT:
            recent = self._get_recent_notifications(journey_id, minutes=self.DEFAULT_COOLDOWN_MINUTES)
            same_type = [n for n in recent if n.notification_type == notification_type]
            if same_type:
                return False, f"Cooldown - similar notification sent {len(same_type)} minutes ago"

        return True, "Notification approved"

    def calculate_optimal_timing(
        self,
        event_time: datetime,
        notification_type: NotificationType,
        priority: NotificationPriority
    ) -> datetime:
        """
        Calculate the optimal time to send a notification.

        Args:
            event_time: Time of the event this notification is about
            notification_type: Type of notification
            priority: Priority level

        Returns:
            Optimal datetime to send the notification
        """
        now = datetime.now(timezone.utc)

        if priority == NotificationPriority.URGENT:
            return now  # Send immediately

        # Calculate lead time based on notification type
        lead_times = {
            NotificationType.REMINDER: timedelta(minutes=45),
            NotificationType.ALERT: timedelta(minutes=15),
            NotificationType.UPDATE: timedelta(minutes=5),
            NotificationType.RISK_ESCALATION: timedelta(minutes=0),
        }

        lead_time = lead_times.get(notification_type, timedelta(minutes=30))
        optimal_time = event_time - lead_time

        # Don't schedule in the past
        if optimal_time < now:
            return now

        return optimal_time

    def format_calm_message(
        self,
        notification_type: NotificationType,
        context: Dict[str, Any]
    ) -> Tuple[str, str]:
        """
        Format a notification message in a calm, reassuring tone.

        Args:
            notification_type: Type of notification
            context: Context data for the message

        Returns:
            Tuple of (title, message)
        """
        # Templates for calm messaging
        templates = {
            NotificationType.REMINDER: {
                "departure": (
                    "Time to get ready",
                    "Your trip to {destination} begins soon. A good time to start preparing."
                ),
                "time_to_leave": (
                    "Ready when you are",
                    "It's a good time to head to the airport. Traffic looks {traffic_status}."
                ),
                "boarding": (
                    "Boarding starting soon",
                    "Gate {gate} will begin boarding in about {minutes} minutes."
                ),
            },
            NotificationType.ALERT: {
                "traffic_delay": (
                    "Traffic update",
                    "Traffic is {status}. You might want to leave {minutes} minutes earlier."
                ),
                "gate_change": (
                    "Gate has changed",
                    "Your flight is now boarding from gate {new_gate}. You have plenty of time."
                ),
                "flight_delay": (
                    "Flight update",
                    "Your flight is delayed by {minutes} minutes. New departure: {new_time}."
                ),
            },
            NotificationType.RISK_ESCALATION: {
                "action_needed": (
                    "Action suggested",
                    "To ensure you make your flight, consider leaving now. {reason}"
                ),
            },
            NotificationType.UPDATE: {
                "status": (
                    "Journey update",
                    "{update_message}"
                ),
            },
        }

        # Get template
        type_templates = templates.get(notification_type, {})
        template_key = context.get("template_key", list(type_templates.keys())[0] if type_templates else "status")
        template = type_templates.get(template_key, ("Update", "{message}"))

        # Format with context
        try:
            title = template[0].format(**context) if "{" in template[0] else template[0]
            message = template[1].format(**context)
        except KeyError as e:
            logger.warning(f"Missing context key for notification: {e}")
            title = template[0]
            message = context.get("message", "Please check your journey status.")

        return title, message

    def create_notification(
        self,
        journey_id: str,
        user_id: str,
        notification_type: NotificationType,
        priority: NotificationPriority,
        context: Dict[str, Any],
        channels: Optional[List[NotificationChannel]] = None
    ) -> Notification:
        """
        Create a notification.

        Args:
            journey_id: Journey ID
            user_id: User ID
            notification_type: Type of notification
            priority: Priority level
            context: Context for message formatting
            channels: Channels to send to

        Returns:
            Created Notification object
        """
        title, message = self.format_calm_message(notification_type, context)

        notification = Notification(
            journey_id=journey_id,
            user_id=user_id,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            channels=channels or [NotificationChannel.PUSH],
            data=context
        )

        return notification

    async def send_notification(
        self,
        notification: Notification,
        user_preferences: Optional[UserPreferences] = None
    ) -> bool:
        """
        Send a notification through appropriate channels.

        Args:
            notification: The notification to send
            user_preferences: User's notification preferences

        Returns:
            True if sent successfully through at least one channel
        """
        prefs = user_preferences or UserPreferences()
        sent = False
        sent_channels = []

        for channel in notification.channels:
            # Check quota for this channel
            within_quota, quota_reason = self.check_notification_quota(
                notification.user_id, 
                channel, 
                notification.priority
            )
            if not within_quota:
                logger.warning(f"Quota exceeded for {notification.user_id} on {channel.value}: {quota_reason}")
                continue
            
            # Check if channel is enabled
            if channel == NotificationChannel.SMS and not prefs.sms_enabled:
                continue
            if channel == NotificationChannel.EMAIL and not prefs.email_enabled:
                continue

            # Delivery/read awareness: skip escalation channel (e.g. SMS) if we already
            # sent the same topic via push and user read it within the window
            if not self._should_escalate_to_channel(
                notification, channel, sent_channels
            ):
                logger.info(
                    f"Skipping {channel.value}: same-topic push already read within "
                    f"{self.ESCALATION_READ_WINDOW_MINUTES} min"
                )
                continue

            handler = self._channel_handlers.get(channel)
            if handler:
                try:
                    success = await handler(notification)
                    if success:
                        sent = True
                        sent_channels.append(channel)
                        self._increment_quota_counter(notification.user_id, channel)
                        logger.info(f"Notification sent via {channel.value}: {notification.notification_id}")
                except Exception as e:
                    logger.error(f"Failed to send via {channel.value}: {e}")
                    notification.delivery_status.failed_at = datetime.now(timezone.utc)
                    notification.delivery_status.failure_reason = str(e)
            else:
                # Default: log the notification
                logger.info(
                    f"[{channel.value.upper()}] {notification.title}: {notification.message}"
                )
                sent = True
                sent_channels.append(channel)
                self._increment_quota_counter(notification.user_id, channel)

        if sent:
            notification.delivery_status.sent_at = datetime.now(timezone.utc)
            self._log_notification(notification)
            
            # Persist to storage if available
            if self._persistence:
                try:
                    await self._persistence.save_notification(notification)
                except Exception as e:
                    logger.error(f"Failed to persist notification {notification.notification_id}: {e}")

        return sent
    
    async def mark_notification_delivered(self, notification_id: str) -> bool:
        """
        Mark a notification as delivered (provider confirmed).
        
        Args:
            notification_id: The notification ID
            
        Returns:
            True if successfully marked
        """
        # Find in history
        for journey_notifs in self._notification_history.values():
            for notif in journey_notifs:
                if notif.notification_id == notification_id:
                    notif.delivery_status.delivered_at = datetime.now(timezone.utc)
                    if self._persistence:
                        await self._persistence.update_notification_status(
                            notification_id,
                            {'delivered_at': notif.delivery_status.delivered_at.isoformat()}
                        )
                    return True
        return False
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """
        Mark a notification as read by user.
        
        Args:
            notification_id: The notification ID
            
        Returns:
            True if successfully marked
        """
        for journey_notifs in self._notification_history.values():
            for notif in journey_notifs:
                if notif.notification_id == notification_id:
                    notif.delivery_status.read_at = datetime.now(timezone.utc)
                    if self._persistence:
                        await self._persistence.update_notification_status(
                            notification_id,
                            {'read_at': notif.delivery_status.read_at.isoformat()}
                        )
                    return True
        return False
    
    async def mark_notification_interacted(self, notification_id: str) -> bool:
        """
        Mark a notification as having user interaction.
        
        Args:
            notification_id: The notification ID
            
        Returns:
            True if successfully marked
        """
        for journey_notifs in self._notification_history.values():
            for notif in journey_notifs:
                if notif.notification_id == notification_id:
                    notif.delivery_status.interacted_at = datetime.now(timezone.utc)
                    if self._persistence:
                        await self._persistence.update_notification_status(
                            notification_id,
                            {'interacted_at': notif.delivery_status.interacted_at.isoformat()}
                        )
                    return True
        return False

    def _get_recent_notifications(
        self,
        journey_id: str,
        minutes: int = 15
    ) -> List[Notification]:
        """Get notifications sent in the last N minutes."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        history = self._notification_history.get(journey_id, [])
        return [n for n in history if n.sent_at and n.sent_at > cutoff]

    def _get_recent_notifications_by_topic(
        self,
        journey_id: str,
        notification_type: NotificationType,
        topic_key: Optional[str],
        minutes: int,
    ) -> List[Notification]:
        """Get recent notifications for the same topic (same journey, type, and optional topic_key)."""
        recent = self._get_recent_notifications(journey_id, minutes=minutes)
        topic = topic_key or ""
        return [
            n for n in recent
            if n.notification_type == notification_type
            and (n.data or {}).get("topic_key", "") == topic
        ]

    def _should_escalate_to_channel(
        self,
        notification: Notification,
        channel: NotificationChannel,
        already_sent_channels: List[NotificationChannel],
    ) -> bool:
        """
        Decide whether to send this notification on the given channel (e.g. SMS).
        If we already sent the same-topic alert via push and the user read it
        within ESCALATION_READ_WINDOW_MINUTES, skip escalation (e.g. no SMS).
        """
        # Only apply to "escalation" channels (SMS, email) when push was already sent
        if channel not in (NotificationChannel.SMS, NotificationChannel.EMAIL):
            return True
        if NotificationChannel.PUSH not in already_sent_channels:
            return True
        # Urgent always escalate
        if notification.priority == NotificationPriority.URGENT:
            return True

        topic_key = (notification.data or {}).get("topic_key")
        recent_same_topic = self._get_recent_notifications_by_topic(
            notification.journey_id,
            notification.notification_type,
            topic_key,
            minutes=self.ESCALATION_READ_WINDOW_MINUTES,
        )
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=self.ESCALATION_READ_WINDOW_MINUTES)
        for n in recent_same_topic:
            if n.delivery_status.read_at and n.delivery_status.read_at >= window_start:
                return False  # User already read same-topic push; don't send SMS
        return True

    def _log_notification(self, notification: Notification) -> None:
        """Log a sent notification to history."""
        if notification.journey_id not in self._notification_history:
            self._notification_history[notification.journey_id] = []

        self._notification_history[notification.journey_id].append(notification)

        # Keep only last 100 notifications per journey
        if len(self._notification_history[notification.journey_id]) > 100:
            self._notification_history[notification.journey_id] = \
                self._notification_history[notification.journey_id][-100:]

    async def get_notification_history(
        self,
        journey_id: str,
        limit: int = 20
    ) -> List[Notification]:
        """Get notification history for a journey."""
        # Try persistence first
        if self._persistence:
            try:
                return await self._persistence.get_notification_history(journey_id, limit)
            except Exception as e:
                logger.error(f"Failed to get history from persistence: {e}")
        
        # Fallback to in-memory
        history = self._notification_history.get(journey_id, [])
        return history[-limit:]
    
    async def cleanup_old_notifications(self, days: int = 30) -> int:
        """
        Delete notifications older than N days.
        
        Args:
            days: Number of days to keep
            
        Returns:
            Number of notifications deleted
        """
        if not self._persistence:
            logger.warning("No persistence layer configured for cleanup")
            return 0
        
        try:
            return await self._persistence.cleanup_old_notifications(days)
        except Exception as e:
            logger.error(f"Failed to cleanup old notifications: {e}")
            return 0
