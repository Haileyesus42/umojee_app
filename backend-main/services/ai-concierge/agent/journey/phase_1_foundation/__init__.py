"""
Phase 1: Foundation - Journey State Management

This module provides the foundational data models and state management
for the journey orchestration system.

Components:
- journey_models.py: Data models for Journey, Segments, Context
- journey_state.py: JourneyStateManager for state operations
- segments.py: SegmentStateMachine for transition logic

This module is COMPLETELY INDEPENDENT - no dependencies on other phases.

Run tests: pytest agent/journey/phase_1_foundation/test_phase_1.py -v
"""

from .journey_models import (
    JourneySegment,
    JourneyStatus,
    SegmentStatus,
    RiskLevel,
    EnergyLevel,
    BudgetComfort,
    LocationContext,
    WeatherContext,
    FlightStatusContext,
    Milestone,
    SegmentState,
    JourneyContext,
    JourneyTimeline,
    Journey,
    Recommendation,
    JourneyMessage,
    MessageType,
    UIBlock,
    UIBlockType,
    MessageAction,
)

from .journey_state import JourneyStateManager

from .segments import (
    SegmentStateMachine,
    SegmentCriteria,
    create_custom_criteria,
)

from .mongo_adapter import (
    MongoJourneyRepository,
    get_journey_repository,
)

__all__ = [
    # Enums
    "JourneySegment",
    "JourneyStatus",
    "SegmentStatus",
    "RiskLevel",
    "EnergyLevel",
    "BudgetComfort",
    # Context models
    "LocationContext",
    "WeatherContext",
    "FlightStatusContext",
    "Milestone",
    "SegmentState",
    "JourneyContext",
    "JourneyTimeline",
    # Main models
    "Journey",
    "Recommendation",
    "JourneyMessage",
    "MessageType",
    "UIBlock",
    "UIBlockType",
    "MessageAction",
    "JourneyStateManager",
    # State machine
    "SegmentStateMachine",
    "SegmentCriteria",
    "create_custom_criteria",
    # MongoDB integration
    "MongoJourneyRepository",
    "get_journey_repository",
]
