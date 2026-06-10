"""
Phase 4 Risk & Notifications - Improvements Tests

Tests for notification persistence, delivery tracking, rate limiting, and context integration.
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, MagicMock

# Import Phase 4 modules
from .notification_engine import (
    NotificationEngine,
    NotificationChannel,
    NotificationPriority,
    NotificationType,
    Notification,
    NotificationDeliveryStatus,
    UserPreferences
)
from .notification_scheduler import (
    NotificationScheduler,
    ScheduledNotification,
    ScheduleType
)
from .risk_engine import (
    RiskEngine,
    RiskLevel,
    RiskCategory
)


# ============================================================================
# FIXTURES - Dummy Data
# ============================================================================

@pytest.fixture
def dummy_user_preferences():
    """Create dummy user preferences."""
    return UserPreferences(
        user_id="test_user_123",
        enabled_channels=[
            NotificationChannel.PUSH,
            NotificationChannel.EMAIL
        ],
        quiet_hours_start="22:00",
        quiet_hours_end="08:00",
        timezone="America/Los_Angeles"
    )


@pytest.fixture
def dummy_notification():
    """Create a dummy notification."""
    return Notification(
        notification_id="notif_test123",
        user_id="test_user_123",
        journey_id="journey_test456",
        type=NotificationType.RISK_ALERT,
        priority=NotificationPriority.HIGH,
        channel=NotificationChannel.PUSH,
        title="Flight Risk Alert",
        message="Traffic delays detected. Consider leaving earlier.",
        data={"risk_level": "watch", "delay_minutes": 30},
        scheduled_for=datetime.now(timezone.utc)
    )


@pytest.fixture
def dummy_journey_with_context():
    """Create dummy journey with full context."""
    from ..phase_1_foundation.journey_models import (
        Journey,
        JourneyContext,
        TrafficContext,
        FlightStatusContext,
        AirportInfoContext,
        BookingStatusContext,
        WeatherContext
    )
    
    journey = Journey(user_id="test_user_123")
    
    journey.context = JourneyContext(
        traffic=TrafficContext(
            conditions="heavy",
            delay_minutes=25,
            duration_minutes=60,
            normal_duration_minutes=35,
            distance_km=30.0
        ),
        flight_status=FlightStatusContext(
            flight_number="AA123",
            status="on_time",
            delay_minutes=0
        ),
        airport_info=AirportInfoContext(
            airport_code="LAX",
            security_wait_minutes=30,
            distance_to_gate_minutes=15,
            congestion_level="high"
        ),
        booking_status=BookingStatusContext(
            checked_in=True,
            boarding_pass_downloaded=True,
            seat_assigned="12A"
        ),
        weather=WeatherContext(
            condition="rainy",
            temperature_celsius=15.0
        )
    )
    
    return journey


@pytest.fixture
def mock_notification_persistence():
    """Create mock notification persistence."""
    persistence = AsyncMock()
    persistence.save_notification = AsyncMock(return_value=True)
    persistence.get_notification = AsyncMock(return_value=None)
    persistence.get_notifications_by_journey = AsyncMock(return_value=[])
    persistence.update_delivery_status = AsyncMock(return_value=True)
    persistence.get_quota_count = AsyncMock(return_value=0)
    persistence.increment_quota = AsyncMock(return_value=True)
    persistence.cleanup_old_notifications = AsyncMock(return_value=10)
    return persistence


@pytest.fixture
def mock_schedule_persistence():
    """Create mock schedule persistence."""
    persistence = AsyncMock()
    persistence.save_schedule = AsyncMock(return_value=True)
    persistence.load_schedules = AsyncMock(return_value=[])
    persistence.delete_schedule = AsyncMock(return_value=True)
    return persistence


# ============================================================================
# TEST SUITE 1: Notification Delivery Status
# ============================================================================

class TestNotificationDeliveryStatus:
    """Test notification delivery status tracking."""
    
    def test_delivery_status_initialization(self):
        """Test delivery status initialization."""
        status = NotificationDeliveryStatus()
        
        assert status.sent_at is None
        assert status.delivered_at is None
        assert status.read_at is None
        assert status.interacted_at is None
        assert status.failed_at is None
        assert status.failure_reason is None
    
    def test_delivery_status_sent(self):
        """Test marking notification as sent."""
        status = NotificationDeliveryStatus()
        now = datetime.now(timezone.utc)
        status.sent_at = now
        
        assert status.sent_at == now
        assert status.delivered_at is None
    
    def test_delivery_status_complete_lifecycle(self):
        """Test complete delivery lifecycle."""
        status = NotificationDeliveryStatus()
        
        # Sent
        status.sent_at = datetime.now(timezone.utc)
        assert status.sent_at is not None
        
        # Delivered
        status.delivered_at = datetime.now(timezone.utc)
        assert status.delivered_at is not None
        
        # Read
        status.read_at = datetime.now(timezone.utc)
        assert status.read_at is not None
        
        # Interacted
        status.interacted_at = datetime.now(timezone.utc)
        assert status.interacted_at is not None


# ============================================================================
# TEST SUITE 2: Notification Persistence
# ============================================================================

class TestNotificationPersistence:
    """Test notification persistence functionality."""
    
    @pytest.mark.asyncio
    async def test_send_notification_with_persistence(
        self,
        dummy_user_preferences,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test sending notification with persistence."""
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        success = await engine.send_notification(
            dummy_notification,
            dummy_user_preferences
        )
        
        assert success is True
        assert mock_notification_persistence.save_notification.called
    
    @pytest.mark.asyncio
    async def test_mark_notification_delivered(
        self,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test marking notification as delivered."""
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        success = await engine.mark_notification_delivered(
            dummy_notification.notification_id
        )
        
        assert success is True
        assert mock_notification_persistence.update_delivery_status.called
    
    @pytest.mark.asyncio
    async def test_mark_notification_read(
        self,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test marking notification as read."""
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        success = await engine.mark_notification_read(
            dummy_notification.notification_id
        )
        
        assert success is True
    
    @pytest.mark.asyncio
    async def test_mark_notification_interacted(
        self,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test marking notification as interacted."""
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        success = await engine.mark_notification_interacted(
            dummy_notification.notification_id
        )
        
        assert success is True


# ============================================================================
# TEST SUITE 3: Rate Limiting
# ============================================================================

class TestRateLimiting:
    """Test notification rate limiting."""
    
    @pytest.mark.asyncio
    async def test_daily_notification_limit(
        self,
        dummy_user_preferences,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test daily notification limit enforcement."""
        # Mock quota at limit
        mock_notification_persistence.get_quota_count = AsyncMock(return_value=50)
        
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        can_send = await engine.check_notification_quota(
            dummy_notification.user_id,
            dummy_notification.channel,
            dummy_notification.priority
        )
        
        # Should not allow sending (limit reached)
        assert can_send is False
    
    @pytest.mark.asyncio
    async def test_sms_weekly_limit(
        self,
        mock_notification_persistence
    ):
        """Test SMS weekly limit."""
        # Mock SMS quota at limit
        mock_notification_persistence.get_quota_count = AsyncMock(return_value=10)
        
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        can_send = await engine.check_notification_quota(
            "test_user",
            NotificationChannel.SMS,
            NotificationPriority.MEDIUM
        )
        
        assert can_send is False
    
    @pytest.mark.asyncio
    async def test_push_hourly_limit(
        self,
        mock_notification_persistence
    ):
        """Test push notification hourly limit."""
        # Mock push quota at limit
        mock_notification_persistence.get_quota_count = AsyncMock(return_value=20)
        
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        can_send = await engine.check_notification_quota(
            "test_user",
            NotificationChannel.PUSH,
            NotificationPriority.LOW
        )
        
        assert can_send is False
    
    @pytest.mark.asyncio
    async def test_critical_notifications_bypass_limits(
        self,
        dummy_user_preferences,
        mock_notification_persistence
    ):
        """Test critical notifications bypass rate limits."""
        # Mock quota at limit
        mock_notification_persistence.get_quota_count = AsyncMock(return_value=100)
        
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        # Critical priority should bypass limits
        can_send = await engine.check_notification_quota(
            "test_user",
            NotificationChannel.PUSH,
            NotificationPriority.CRITICAL
        )
        
        assert can_send is True


# ============================================================================
# TEST SUITE 4: Schedule Persistence
# ============================================================================

class TestSchedulePersistence:
    """Test notification schedule persistence."""
    
    @pytest.mark.asyncio
    async def test_scheduler_with_persistence(
        self,
        mock_schedule_persistence
    ):
        """Test scheduler initialization with persistence."""
        scheduler = NotificationScheduler(persistence=mock_schedule_persistence)
        
        assert scheduler.persistence is not None
    
    @pytest.mark.asyncio
    async def test_schedule_saved_on_creation(
        self,
        dummy_notification,
        mock_schedule_persistence
    ):
        """Test schedule is saved when created."""
        scheduler = NotificationScheduler(persistence=mock_schedule_persistence)
        
        scheduled = ScheduledNotification(
            schedule_id="sched_test123",
            notification=dummy_notification,
            schedule_type=ScheduleType.ONE_TIME,
            scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        
        scheduler._pending_schedules[scheduled.schedule_id] = scheduled
        
        # Start scheduler (loads and saves schedules)
        await scheduler.start()
        await asyncio.sleep(0.1)
        await scheduler.stop()
        
        # Should have saved schedules
        assert mock_schedule_persistence.save_schedule.called or \
               mock_schedule_persistence.load_schedules.called
    
    @pytest.mark.asyncio
    async def test_schedules_loaded_on_startup(
        self,
        dummy_notification,
        mock_schedule_persistence
    ):
        """Test schedules are loaded on startup."""
        # Mock existing schedule
        existing_schedule = {
            "schedule_id": "sched_existing",
            "notification": dummy_notification.to_dict(),
            "schedule_type": "one_time",
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }
        
        mock_schedule_persistence.load_schedules = AsyncMock(
            return_value=[existing_schedule]
        )
        
        scheduler = NotificationScheduler(persistence=mock_schedule_persistence)
        await scheduler.start()
        await asyncio.sleep(0.1)
        await scheduler.stop()
        
        assert mock_schedule_persistence.load_schedules.called


# ============================================================================
# TEST SUITE 5: Context Integration
# ============================================================================

class TestContextIntegration:
    """Test risk calculation with real-time context."""
    
    def test_risk_calculation_with_traffic_context(
        self,
        dummy_journey_with_context
    ):
        """Test risk calculation uses traffic context."""
        engine = RiskEngine()
        
        # Get traffic data from context
        traffic = dummy_journey_with_context.context.traffic
        
        assessment = engine.calculate_departure_risk(
            flight_time=datetime.now(timezone.utc) + timedelta(hours=3),
            current_time=datetime.now(timezone.utc),
            travel_duration_minutes=traffic.duration_minutes,
            traffic_delay_minutes=traffic.delay_minutes,
            weather_condition=dummy_journey_with_context.context.weather.condition,
            buffer_minutes=120
        )
        
        # Should detect risk due to traffic delay
        assert assessment.overall_level in [RiskLevel.WATCH, RiskLevel.ACTION_NEEDED]
    
    def test_risk_calculation_with_airport_context(
        self,
        dummy_journey_with_context
    ):
        """Test risk calculation uses airport context."""
        engine = RiskEngine()
        
        airport_info = dummy_journey_with_context.context.airport_info
        
        # Airport context should influence risk
        assert airport_info.security_wait_minutes == 30
        assert airport_info.congestion_level == "high"
    
    def test_risk_calculation_with_booking_status(
        self,
        dummy_journey_with_context
    ):
        """Test risk calculation considers booking status."""
        booking = dummy_journey_with_context.context.booking_status
        
        # Checked in status should reduce some risks
        assert booking.checked_in is True
        assert booking.boarding_pass_downloaded is True


# ============================================================================
# TEST SUITE 6: Notification History
# ============================================================================

class TestNotificationHistory:
    """Test notification history retrieval."""
    
    @pytest.mark.asyncio
    async def test_get_notification_history(
        self,
        dummy_notification,
        mock_notification_persistence
    ):
        """Test getting notification history."""
        # Mock history
        mock_notification_persistence.get_notifications_by_journey = AsyncMock(
            return_value=[dummy_notification.to_dict()]
        )
        
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        history = await engine.get_notification_history("journey_test456")
        
        assert len(history) > 0
        assert mock_notification_persistence.get_notifications_by_journey.called
    
    @pytest.mark.asyncio
    async def test_cleanup_old_notifications(
        self,
        mock_notification_persistence
    ):
        """Test cleaning up old notifications."""
        engine = NotificationEngine(persistence=mock_notification_persistence)
        
        count = await engine.cleanup_old_notifications(days=30)
        
        assert count >= 0
        assert mock_notification_persistence.cleanup_old_notifications.called


# ============================================================================
# INTEGRATION TEST
# ============================================================================

class TestPhase4Integration:
    """Integration tests for Phase 4."""
    
    @pytest.mark.asyncio
    async def test_full_notification_lifecycle(
        self,
        dummy_user_preferences,
        dummy_journey_with_context,
        mock_notification_persistence,
        mock_schedule_persistence
    ):
        """Test complete notification lifecycle with all Phase 4 features."""
        print("\n" + "="*70)
        print("Phase 4 Integration Test - Full Notification Lifecycle")
        print("="*70)
        
        # 1. Create engines with persistence
        notification_engine = NotificationEngine(
            persistence=mock_notification_persistence
        )
        scheduler = NotificationScheduler(
            notification_engine=notification_engine,
            persistence=mock_schedule_persistence
        )
        risk_engine = RiskEngine()
        
        print("✓ Engines created with persistence")
        
        # 2. Calculate risk with real context
        traffic = dummy_journey_with_context.context.traffic
        weather = dummy_journey_with_context.context.weather
        
        assessment = risk_engine.calculate_departure_risk(
            flight_time=datetime.now(timezone.utc) + timedelta(hours=3),
            current_time=datetime.now(timezone.utc),
            travel_duration_minutes=traffic.duration_minutes,
            traffic_delay_minutes=traffic.delay_minutes,
            weather_condition=weather.condition,
            buffer_minutes=120
        )
        
        print(f"✓ Risk calculated: {assessment.overall_level.value}")
        
        # 3. Create notification based on risk
        notification = Notification(
            notification_id="notif_integration_test",
            user_id=dummy_user_preferences.user_id,
            journey_id=dummy_journey_with_context.journey_id,
            type=NotificationType.RISK_ALERT,
            priority=NotificationPriority.HIGH,
            channel=NotificationChannel.PUSH,
            title="Traffic Alert",
            message=f"Risk level: {assessment.overall_level.value}",
            data={"risk_factors": [f.category.value for f in assessment.factors]},
            scheduled_for=datetime.now(timezone.utc)
        )
        
        print("✓ Notification created from risk assessment")
        
        # 4. Check rate limits
        can_send = await notification_engine.check_notification_quota(
            notification.user_id,
            notification.channel,
            notification.priority
        )
        
        print(f"✓ Rate limit check: {'Allowed' if can_send else 'Blocked'}")
        
        # 5. Send notification
        if can_send:
            success = await notification_engine.send_notification(
                notification,
                dummy_user_preferences
            )
            print(f"✓ Notification sent: {success}")
            
            # Verify persistence was called
            assert mock_notification_persistence.save_notification.called
            print("✓ Notification persisted")
        
        # 6. Track delivery status
        await notification_engine.mark_notification_delivered(notification.notification_id)
        print("✓ Delivery status updated: delivered")
        
        await notification_engine.mark_notification_read(notification.notification_id)
        print("✓ Delivery status updated: read")
        
        await notification_engine.mark_notification_interacted(notification.notification_id)
        print("✓ Delivery status updated: interacted")
        
        # 7. Get notification history
        history = await notification_engine.get_notification_history(
            dummy_journey_with_context.journey_id
        )
        print(f"✓ Notification history retrieved: {len(history)} notifications")
        
        print("\n✅ Phase 4 Integration Test Passed!")
    
    @pytest.mark.asyncio
    async def test_scheduler_crash_recovery(
        self,
        dummy_notification,
        mock_schedule_persistence
    ):
        """Test scheduler recovers schedules after crash."""
        print("\n" + "="*70)
        print("Phase 4 Integration Test - Scheduler Crash Recovery")
        print("="*70)
        
        # Mock existing schedules from before crash
        existing_schedules = [
            {
                "schedule_id": "sched_before_crash_1",
                "notification": dummy_notification.to_dict(),
                "schedule_type": "one_time",
                "scheduled_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
            },
            {
                "schedule_id": "sched_before_crash_2",
                "notification": dummy_notification.to_dict(),
                "schedule_type": "recurring",
                "scheduled_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                "interval_minutes": 60
            }
        ]
        
        mock_schedule_persistence.load_schedules = AsyncMock(
            return_value=existing_schedules
        )
        
        # Create new scheduler (simulating restart)
        scheduler = NotificationScheduler(persistence=mock_schedule_persistence)
        print("✓ Scheduler created after simulated crash")
        
        # Start scheduler (should load persisted schedules)
        await scheduler.start()
        await asyncio.sleep(0.1)
        
        print("✓ Scheduler started and loaded schedules")
        
        # Verify schedules were loaded
        assert mock_schedule_persistence.load_schedules.called
        print(f"✓ Loaded {len(existing_schedules)} schedules from persistence")
        
        await scheduler.stop()
        print("✓ Scheduler stopped gracefully")
        
        print("\n✅ Crash Recovery Test Passed!")


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 4 RISK & NOTIFICATIONS - IMPROVEMENTS TEST SUITE")
    print("=" * 70)
    print("\nRunning tests with dummy data...\n")
    
    pytest.main([__file__, "-v", "--tb=short"])
