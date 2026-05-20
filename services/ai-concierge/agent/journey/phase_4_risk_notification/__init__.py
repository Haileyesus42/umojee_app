"""
Phase 4: Risk & Notification Engine

This module provides dynamic risk calculation and calm notification system:
- Risk calculation engine
- Notification orchestrator
- Notification scheduling
- Recovery action generator

This module is COMPLETELY INDEPENDENT - no dependencies on other phases.

Run tests: pytest agent/journey/phase_4_risk_notification/test_phase_4.py -v
"""

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
    RecoveryPlaybook,
    OneTapAction,
    OneTapActionKind,
    ActionUrgency,
    ActionType,
)

__all__ = [
    # Risk Engine
    "RiskEngine",
    "RiskLevel",
    "RiskCategory",
    "RiskFactor",
    "RiskAssessment",
    # Notification Engine
    "NotificationEngine",
    "NotificationChannel",
    "NotificationPriority",
    "NotificationType",
    "Notification",
    "UserPreferences",
    # Notification Scheduler
    "NotificationScheduler",
    "ScheduledNotification",
    "ScheduleType",
    # Recovery Actions
    "RecoveryActionGenerator",
    "RecoveryAction",
    "RecoveryPlaybook",
    "OneTapAction",
    "OneTapActionKind",
    "ActionUrgency",
    "ActionType",
]
