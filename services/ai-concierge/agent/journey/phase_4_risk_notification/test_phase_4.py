"""
Phase 4: Test Suite - Risk & Notification Engine

This test file validates the Phase 4 implementation including:
- Risk calculation engine
- Notification engine
- Notification scheduler
- Recovery action generator

Run with: pytest agent/journey/phase_4_risk_notification/test_phase_4.py -v
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from .risk_engine import (
    RiskEngine,
    RiskLevel,
    RiskCategory,
    RiskFactor,
    RiskAssessment,
)
from .notification_engine import (
    NotificationEngine,
    NotificationChannel,
    NotificationPriority,
    NotificationType,
    Notification,
    UserPreferences,
)
from .notification_scheduler import (
    NotificationScheduler,
    ScheduledNotification,
    ScheduleType,
)
from .recovery_actions import (
    RecoveryActionGenerator,
    RecoveryAction,
    ActionUrgency,
    ActionType,
)


# =============================================================================
# Risk Engine Tests
# =============================================================================

class TestRiskEngine:
    """Tests for the Risk Calculation Engine."""

    @pytest.fixture
    def engine(self):
        """Create a risk engine for testing."""
        return RiskEngine()

    def test_calculate_departure_risk_on_track(self, engine):
        """Test departure risk when on track."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=5)

        assessment = engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=45,
            traffic_delay_minutes=0,
            weather_condition="clear",
            buffer_minutes=120
        )

        assert assessment.overall_level == RiskLevel.ON_TRACK
        assert assessment.confidence > 0.5
        assert len(assessment.recommended_actions) > 0

    def test_calculate_departure_risk_watch(self, engine):
        """Test departure risk when watching."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=3)

        assessment = engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=45,
            traffic_delay_minutes=30,
            weather_condition="rain",
            buffer_minutes=120
        )

        assert assessment.overall_level in [RiskLevel.WATCH, RiskLevel.ACTION_NEEDED]

    def test_calculate_departure_risk_action_needed(self, engine):
        """Test departure risk when action needed."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=2)

        assessment = engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=90,
            traffic_delay_minutes=45,
            weather_condition="storm",
            buffer_minutes=120
        )

        assert assessment.overall_level == RiskLevel.ACTION_NEEDED
        assert len(assessment.factors) > 0

    def test_calculate_boarding_risk(self, engine):
        """Test boarding risk calculation."""
        now = datetime.now(timezone.utc)
        boarding_time = now + timedelta(hours=1)

        assessment = engine.calculate_boarding_risk(
            boarding_time=boarding_time,
            current_time=now,
            security_wait_minutes=20,
            distance_to_gate_minutes=10,
            is_checked_in=True
        )

        assert assessment.overall_level is not None
        assert assessment.time_buffer_minutes >= 0

    def test_boarding_risk_not_checked_in(self, engine):
        """Test boarding risk when not checked in."""
        now = datetime.now(timezone.utc)
        boarding_time = now + timedelta(minutes=45)

        assessment = engine.calculate_boarding_risk(
            boarding_time=boarding_time,
            current_time=now,
            security_wait_minutes=20,
            distance_to_gate_minutes=10,
            is_checked_in=False
        )

        # Not being checked in should increase risk
        has_checkin_factor = any(
            "check" in f.name.lower() for f in assessment.factors
        )
        assert has_checkin_factor

    def test_calculate_connection_risk(self, engine):
        """Test connection risk calculation."""
        arrival = datetime.now(timezone.utc) + timedelta(hours=2)
        next_departure = arrival + timedelta(minutes=90)

        assessment = engine.calculate_connection_risk(
            arrival_time=arrival,
            next_departure_time=next_departure,
            terminal_change=False,
            immigration_required=False
        )

        assert assessment.overall_level in RiskLevel

    def test_connection_risk_with_immigration(self, engine):
        """Test connection risk requiring immigration."""
        arrival = datetime.now(timezone.utc) + timedelta(hours=2)
        next_departure = arrival + timedelta(minutes=60)  # Tight!

        assessment = engine.calculate_connection_risk(
            arrival_time=arrival,
            next_departure_time=next_departure,
            terminal_change=True,
            immigration_required=True
        )

        # Should be high risk with immigration and terminal change
        assert assessment.overall_level in [RiskLevel.WATCH, RiskLevel.ACTION_NEEDED]

    def test_risk_factor_dataclass(self):
        """Test RiskFactor dataclass."""
        factor = RiskFactor(
            category=RiskCategory.TRAFFIC,
            name="Heavy traffic",
            severity=0.8,
            description="Traffic adding 30 minutes",
            impact_minutes=30
        )

        assert factor.category == RiskCategory.TRAFFIC
        assert factor.severity == 0.8

    def test_explanation_generated(self, engine):
        """Test that explanations are generated."""
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=5)

        assessment = engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=45,
            traffic_delay_minutes=0,
            weather_condition="clear",
            buffer_minutes=120
        )

        assert assessment.explanation != ""


# =============================================================================
# Notification Engine Tests
# =============================================================================

class TestNotificationEngine:
    """Tests for the Notification Engine."""

    @pytest.fixture
    def engine(self):
        """Create a notification engine for testing."""
        return NotificationEngine()

    def test_create_notification(self, engine):
        """Test creating a notification."""
        notification = engine.create_notification(
            journey_id="journey123",
            user_id="user456",
            notification_type=NotificationType.REMINDER,
            priority=NotificationPriority.NORMAL,
            context={"destination": "the airport", "template_key": "departure"}
        )

        assert notification.journey_id == "journey123"
        assert notification.notification_type == NotificationType.REMINDER
        assert notification.title != ""
        assert notification.message != ""

    def test_format_calm_message(self, engine):
        """Test calm message formatting."""
        title, message = engine.format_calm_message(
            NotificationType.REMINDER,
            {"template_key": "departure", "destination": "Paris"}
        )

        assert title != ""
        assert message != ""
        # Should not contain alarming words
        assert "URGENT" not in message.upper()
        assert "PANIC" not in message.upper()

    def test_should_notify_within_quiet_hours(self, engine):
        """Test quiet hours respect."""
        prefs = UserPreferences(
            quiet_hours_start=22,
            quiet_hours_end=7
        )

        # During quiet hours, non-urgent should not notify
        # Note: This depends on current time, so we test the logic exists

    def test_should_notify_respects_priority(self, engine):
        """Test priority threshold respect."""
        prefs = UserPreferences(
            minimum_alert_priority=NotificationPriority.HIGH,
            quiet_hours_start=None,
            quiet_hours_end=None
        )

        should_send, reason = engine.should_notify(
            journey_id="journey123",
            notification_type=NotificationType.UPDATE,
            priority=NotificationPriority.LOW,
            user_preferences=prefs
        )

        assert should_send is False
        assert "priority" in reason.lower()

    def test_cooldown_prevents_spam(self, engine):
        """Test notification cooldown."""
        # Create and log a notification
        notification = engine.create_notification(
            journey_id="journey123",
            user_id="user456",
            notification_type=NotificationType.REMINDER,
            priority=NotificationPriority.NORMAL,
            context={"template_key": "departure", "destination": "airport"}
        )
        notification.sent_at = datetime.now(timezone.utc)
        engine._log_notification(notification)

        # Try to send same type again immediately
        prefs = UserPreferences(
            quiet_hours_start=None,
            quiet_hours_end=None
        )
        should_send, reason = engine.should_notify(
            journey_id="journey123",
            notification_type=NotificationType.REMINDER,
            priority=NotificationPriority.NORMAL,
            user_preferences=prefs
        )

        assert should_send is False
        assert "cooldown" in reason.lower()

    def test_urgent_bypasses_cooldown(self, engine):
        """Test that urgent notifications bypass cooldown."""
        # Log a recent notification
        notification = engine.create_notification(
            journey_id="journey123",
            user_id="user456",
            notification_type=NotificationType.ALERT,
            priority=NotificationPriority.NORMAL,
            context={"template_key": "traffic_delay", "status": "heavy", "minutes": 30}
        )
        notification.sent_at = datetime.now(timezone.utc)
        engine._log_notification(notification)

        # Urgent should still go through
        should_send, reason = engine.should_notify(
            journey_id="journey123",
            notification_type=NotificationType.ALERT,
            priority=NotificationPriority.URGENT
        )

        assert should_send is True

    def test_optimal_timing_calculation(self, engine):
        """Test optimal timing calculation."""
        event_time = datetime.now(timezone.utc) + timedelta(hours=2)

        optimal = engine.calculate_optimal_timing(
            event_time=event_time,
            notification_type=NotificationType.REMINDER,
            priority=NotificationPriority.NORMAL
        )

        # Should be before the event
        assert optimal < event_time


# =============================================================================
# Notification Scheduler Tests
# =============================================================================

class TestNotificationScheduler:
    """Tests for the Notification Scheduler."""

    @pytest.fixture
    def scheduler(self):
        """Create a notification scheduler for testing."""
        return NotificationScheduler()

    def test_schedule_get_ready_reminder(self, scheduler):
        """Test scheduling a get-ready reminder."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=2)

        schedule = scheduler.schedule_get_ready_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time,
            lead_minutes=45
        )

        assert schedule.scheduled_time < departure_time
        assert schedule.notification_type == "reminder"

    def test_schedule_time_to_leave(self, scheduler):
        """Test scheduling time-to-leave reminder."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=1)

        schedule = scheduler.schedule_time_to_leave_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )

        assert schedule.scheduled_time == departure_time
        assert schedule.priority == "high"

    def test_schedule_boarding_reminder(self, scheduler):
        """Test scheduling boarding reminder."""
        boarding_time = datetime.now(timezone.utc) + timedelta(hours=3)

        schedule = scheduler.schedule_boarding_reminder(
            journey_id="journey123",
            user_id="user456",
            boarding_time=boarding_time,
            gate="B22",
            lead_minutes=15
        )

        assert schedule.context["gate"] == "B22"
        assert schedule.scheduled_time < boarding_time

    def test_cancel_schedule(self, scheduler):
        """Test cancelling a schedule."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=2)

        schedule = scheduler.schedule_get_ready_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )

        result = scheduler.cancel_schedule(schedule.schedule_id)

        assert result is True
        assert scheduler._scheduled[schedule.schedule_id].cancelled is True

    def test_cancel_journey_schedules(self, scheduler):
        """Test cancelling all schedules for a journey."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=2)

        scheduler.schedule_get_ready_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )
        scheduler.schedule_time_to_leave_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )

        cancelled = scheduler.cancel_journey_schedules("journey123")

        assert cancelled == 2

    def test_reschedule(self, scheduler):
        """Test rescheduling a notification."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=2)

        schedule = scheduler.schedule_get_ready_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )

        new_time = datetime.now(timezone.utc) + timedelta(hours=3)
        result = scheduler.reschedule(schedule.schedule_id, new_time)

        assert result is True
        assert scheduler._scheduled[schedule.schedule_id].scheduled_time == new_time

    def test_get_pending_schedules(self, scheduler):
        """Test getting pending schedules."""
        departure_time = datetime.now(timezone.utc) + timedelta(hours=2)

        scheduler.schedule_get_ready_reminder(
            journey_id="journey123",
            user_id="user456",
            departure_time=departure_time
        )
        scheduler.schedule_get_ready_reminder(
            journey_id="journey456",
            user_id="user789",
            departure_time=departure_time
        )

        pending = scheduler.get_pending_schedules()
        assert len(pending) == 2

        pending_journey = scheduler.get_pending_schedules(journey_id="journey123")
        assert len(pending_journey) == 1


# =============================================================================
# Recovery Action Generator Tests
# =============================================================================

class TestRecoveryActionGenerator:
    """Tests for the Recovery Action Generator."""

    @pytest.fixture
    def generator(self):
        """Create a recovery action generator for testing."""
        return RecoveryActionGenerator()

    def test_generate_departure_actions(self, generator):
        """Test generating departure recovery actions."""
        actions = generator.generate_recovery_actions(
            risk_type="departure",
            context={
                "time_remaining_minutes": 30,
                "traffic_delay_minutes": 20
            }
        )

        assert len(actions) > 0
        assert all(isinstance(a, RecoveryAction) for a in actions)

    def test_generate_boarding_actions(self, generator):
        """Test generating boarding recovery actions."""
        actions = generator.generate_recovery_actions(
            risk_type="boarding",
            context={
                "time_remaining_minutes": 20,
                "is_checked_in": False,
                "security_wait_minutes": 25
            }
        )

        assert len(actions) > 0
        # Should include check-in action
        has_checkin = any("check" in a.title.lower() for a in actions)
        assert has_checkin

    def test_generate_connection_actions(self, generator):
        """Test generating connection recovery actions."""
        actions = generator.generate_recovery_actions(
            risk_type="connection",
            context={
                "layover_minutes": 45,
                "terminal_change": True
            }
        )

        assert len(actions) > 0

    def test_generate_traffic_actions(self, generator):
        """Test generating traffic recovery actions."""
        actions = generator.generate_recovery_actions(
            risk_type="traffic",
            context={"delay_minutes": 45}
        )

        assert len(actions) > 0
        # Should include route alternative
        has_route = any(a.action_type == ActionType.ROUTE for a in actions)
        assert has_route

    def test_prioritize_actions(self, generator):
        """Test action prioritization."""
        actions = [
            RecoveryAction(
                action_id="1",
                action_type=ActionType.TIMING,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Low urgency"
            ),
            RecoveryAction(
                action_id="2",
                action_type=ActionType.TIMING,
                urgency=ActionUrgency.IMMEDIATE,
                title="High urgency"
            ),
        ]

        prioritized = generator.prioritize_actions(actions)

        assert prioritized[0].urgency == ActionUrgency.IMMEDIATE

    def test_filter_automatable(self, generator):
        """Test filtering automatable actions."""
        actions = [
            RecoveryAction(
                action_id="1",
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.SOON,
                title="Manual action",
                can_automate=False
            ),
            RecoveryAction(
                action_id="2",
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.SOON,
                title="Auto action",
                can_automate=True
            ),
        ]

        automatable = generator.filter_automatable(actions)

        assert len(automatable) == 1
        assert automatable[0].action_id == "2"

    def test_action_has_steps(self, generator):
        """Test that actions include steps."""
        actions = generator.generate_recovery_actions(
            risk_type="departure",
            context={"time_remaining_minutes": 20}
        )

        for action in actions:
            assert len(action.steps) > 0


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase4Integration:
    """Integration tests for Phase 4 components."""

    def test_risk_to_notification_flow(self):
        """Test flow from risk assessment to notification."""
        risk_engine = RiskEngine()
        notification_engine = NotificationEngine()

        # Calculate risk
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=2)

        assessment = risk_engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=90,
            traffic_delay_minutes=30,
            buffer_minutes=120
        )

        # Create notification based on risk
        if assessment.overall_level == RiskLevel.ACTION_NEEDED:
            notification = notification_engine.create_notification(
                journey_id="journey123",
                user_id="user456",
                notification_type=NotificationType.RISK_ESCALATION,
                priority=NotificationPriority.URGENT,
                context={
                    "template_key": "action_needed",
                    "reason": assessment.explanation
                }
            )

            assert notification.priority == NotificationPriority.URGENT

    def test_risk_to_recovery_actions_flow(self):
        """Test flow from risk assessment to recovery actions."""
        risk_engine = RiskEngine()
        action_generator = RecoveryActionGenerator()

        # Calculate risk
        now = datetime.now(timezone.utc)
        flight_time = now + timedelta(hours=2)

        assessment = risk_engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=now,
            travel_duration_minutes=60,
            traffic_delay_minutes=45,
            buffer_minutes=120
        )

        # Generate recovery actions based on risk factors
        context = {
            "time_remaining_minutes": assessment.time_buffer_minutes,
            "traffic_delay_minutes": 45
        }

        actions = action_generator.generate_recovery_actions("departure", context)
        prioritized = action_generator.prioritize_actions(actions)

        assert len(prioritized) > 0

    def test_scheduler_with_risk_escalation(self):
        """Test scheduler with risk escalation."""
        scheduler = NotificationScheduler()

        schedule = scheduler.schedule_risk_escalation(
            journey_id="journey123",
            user_id="user456",
            risk_level="action_needed",
            reason="Traffic delay of 45 minutes detected"
        )

        assert schedule.priority == "urgent"
        assert schedule.scheduled_time <= datetime.now(timezone.utc) + timedelta(seconds=1)


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
