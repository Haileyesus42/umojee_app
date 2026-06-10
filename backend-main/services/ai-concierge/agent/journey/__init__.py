"""
Nexus Flow Journey Orchestration System

This package contains the implementation for the journey-based travel orchestration
system. It is organized into 5 phases, each with sample implementations and tests.

IMPORTANT: Each phase module is COMPLETELY INDEPENDENT and has NO dependencies
on other phase modules. This allows different developers to work on different
phases simultaneously without conflicts.

Phase Structure:
----------------

Phase 1: Foundation - Journey State Management (phase_1_foundation/)
    - Journey data models (MongoDB schemas)
    - Journey state manager
    - Segment state machines
    Developer Timeline: Week 1-2

Phase 2: Context Monitoring Engine (phase_2_context_monitoring/)
    - Context monitor service (background monitoring)
    - Background task manager (async execution)
    - Real-time context APIs (tool integration)
    Developer Timeline: Week 3-4

Phase 3: Segment Orchestrators (phase_3_segment_orchestrators/)
    - Base segment orchestrator
    - Segment 1: Trip Inspiration & Intent Discovery
    - Segment 2: Home → Airport
    - (Additional segments: Airport→Flight, Flight→Hotel, Hotel→Activities, Return)
    Developer Timeline: Week 5-7

Phase 4: Risk & Notification Engine (phase_4_risk_notification/)
    - Risk calculation engine
    - Notification orchestrator
    - Notification scheduler
    - Recovery action generator
    Developer Timeline: Week 8-9

Phase 5: Timeline & Intelligence (phase_5_timeline_intelligence/)
    - Timeline calculator
    - Journey intelligence layer
    - Adaptation engine
    Developer Timeline: Week 10-11

Running Tests:
--------------
Each phase has its own test file. Run tests for a specific phase:

    pytest agent/journey/phase_1_foundation/test_phase_1.py -v
    pytest agent/journey/phase_2_context_monitoring/test_phase_2.py -v
    pytest agent/journey/phase_3_segment_orchestrators/test_phase_3.py -v
    pytest agent/journey/phase_4_risk_notification/test_phase_4.py -v
    pytest agent/journey/phase_5_timeline_intelligence/test_phase_5.py -v

Or run all tests:

    pytest agent/journey/ -v

Usage:
------
Import from specific phase modules:

    # Phase 1
    from agent.journey.phase_1_foundation import JourneyStateManager, Journey

    # Phase 2
    from agent.journey.phase_2_context_monitoring import ContextMonitor

    # Phase 3
    from agent.journey.phase_3_segment_orchestrators import InspirationOrchestrator

    # Phase 4
    from agent.journey.phase_4_risk_notification import RiskEngine, NotificationEngine

    # Phase 5
    from agent.journey.phase_5_timeline_intelligence import TimelineCalculator

Note:
-----
These are SAMPLE IMPLEMENTATIONS designed to demonstrate the architecture and
provide a starting point for development. Each module contains TODO comments
indicating where full implementations should be added.
"""

# Phase 1: Foundation
from .phase_1_foundation import (
    Journey,
    JourneyContext,
    JourneySegment,
    JourneyStatus,
    SegmentStatus,
    RiskLevel,
    EnergyLevel,
    BudgetComfort,
    JourneyStateManager,
    SegmentStateMachine,
    MongoJourneyRepository,
    get_journey_repository,
    JourneyTimeline,
    JourneyMessage,
    Recommendation,
    MessageType,
    UIBlock,
    UIBlockType,
    MessageAction,
)

# Phase 2: Context Monitoring
from .phase_2_context_monitoring import (
    ContextMonitor,
    BackgroundTaskManager,
    MonitoringType,
    ScheduledTask,
)

# Phase 3: Segment Orchestrators
from .phase_3_segment_orchestrators import (
    BaseSegmentOrchestrator,
    InspirationOrchestrator,
    HomeToAirportOrchestrator,
    AirportToFlightOrchestrator,
    FlightToHotelOrchestrator,
    HotelToActivitiesOrchestrator,
    ReturnJourneyOrchestrator,
    NodeResult,
    NodeStatus,
)

# Phase 4: Risk & Notification
from .phase_4_risk_notification import (
    RiskEngine,
    RiskAssessment,
    NotificationEngine,
    NotificationScheduler,
    RecoveryActionGenerator,
)

# Phase 6: Integration & Orchestration
from .journey_orchestrator import (
    JourneyOrchestrator,
    create_journey_orchestrator,
)

__all__ = [
    # Foundation (Phase 1)
    "Journey",
    "JourneyContext",
    "JourneySegment",
    "JourneyStatus",
    "SegmentStatus",
    "RiskLevel",
    "EnergyLevel",
    "BudgetComfort",
    "JourneyStateManager",
    "SegmentStateMachine",
    "MongoJourneyRepository",
    "get_journey_repository",
    "JourneyTimeline",
    "JourneyMessage",
    "Recommendation",
    "MessageType",
    "UIBlock",
    "UIBlockType",
    "MessageAction",
    
    # Context (Phase 2)
    "ContextMonitor",
    "BackgroundTaskManager",
    "MonitoringType",
    "ScheduledTask",
    
    # Orchestration (Phase 3)
    "BaseSegmentOrchestrator",
    "InspirationOrchestrator",
    "HomeToAirportOrchestrator",
    "AirportToFlightOrchestrator",
    "FlightToHotelOrchestrator",
    "HotelToActivitiesOrchestrator",
    "ReturnJourneyOrchestrator",
    "NodeResult",
    "NodeStatus",
    
    # Risk & Notification (Phase 4)
    "RiskEngine",
    "RiskAssessment",
    "NotificationEngine",
    "NotificationScheduler",
    "RecoveryActionGenerator",
    
    # Intelligence (Phase 5)
    "TimelineCalculator",
    "JourneyIntelligence",
    "AdaptationEngine",
    "EventType",
    
    # Orchestration (Phase 6)
    "JourneyOrchestrator",
    "create_journey_orchestrator",
]
