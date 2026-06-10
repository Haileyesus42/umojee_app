"""
Phase 5: Timeline & Intelligence

This module provides journey timeline management and decision intelligence:
- Timeline calculator with multi-factor calculations
- Journey intelligence layer with confidence indicators
- Adaptation engine for disruption handling

This module is COMPLETELY INDEPENDENT - no dependencies on other phases.

Run tests: pytest agent/journey/phase_5_timeline_intelligence/test_phase_5.py -v
"""

from .timeline_calculator import (
    TimelineCalculator,
    TimelineEvent,
    JourneyTimeline,
    EventType,
    ConditionalBranch,
)

from .intelligence import (
    JourneyIntelligence,
    ConfidenceLevel,
    ConfidenceIndicator,
    DestinationMatch,
    ComparisonView,
    ComparisonItem,
)

from .adaptation_engine import (
    AdaptationEngine,
    Disruption,
    DisruptionType,
    DisruptionSeverity,
    ImpactAssessment,
    AdaptedPlan,
    PlanAdjustment,
    OneTapAction,
    OneTapActionKind,
)

__all__ = [
    # Timeline Calculator
    "TimelineCalculator",
    "TimelineEvent",
    "JourneyTimeline",
    "EventType",
    "ConditionalBranch",
    # Journey Intelligence
    "JourneyIntelligence",
    "ConfidenceLevel",
    "ConfidenceIndicator",
    "DestinationMatch",
    "ComparisonView",
    "ComparisonItem",
    # Adaptation Engine
    "AdaptationEngine",
    "Disruption",
    "DisruptionType",
    "DisruptionSeverity",
    "ImpactAssessment",
    "AdaptedPlan",
    "PlanAdjustment",
    "OneTapAction",
    "OneTapActionKind",
]
