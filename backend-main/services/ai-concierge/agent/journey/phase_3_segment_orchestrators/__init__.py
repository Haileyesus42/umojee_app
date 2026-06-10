"""
Phase 3: Segment Orchestrators

This module implements segment-specific orchestration logic for journey segments.

Components:
- base_orchestrator.py: Base class for all segment orchestrators
- segments/inspiration.py: Trip Inspiration & Intent Discovery (Segment 1)
- segments/home_to_airport.py: Home to Airport (Segment 2)

Additional segments (Segments 3-6) to be implemented:
- Airport to Flight
- Flight to Hotel
- Hotel to Activities
- Return Journey

This module is COMPLETELY INDEPENDENT - no dependencies on other phases.

Run tests: pytest agent/journey/phase_3_segment_orchestrators/test_phase_3.py -v
"""

from .base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
    OrchestratorResult,
)

from .segments.inspiration import (
    InspirationOrchestrator,
    ConfidenceLevel,
    DestinationSuggestion,
    UserIntent,
    create_inspiration_orchestrator,
)

from .segments.home_to_airport import (
    HomeToAirportOrchestrator,
    TransportMode,
    TransportOption,
    DepartureCalculation,
    create_home_to_airport_orchestrator,
)

from .segments.airport_to_flight import (
    AirportToFlightOrchestrator,
    BoardingStatus,
    AirportContext,
    create_airport_to_flight_orchestrator,
)

from .segments.flight_to_hotel import (
    FlightToHotelOrchestrator,
    create_flight_to_hotel_orchestrator,
)

from .segments.hotel_to_activities import (
    HotelToActivitiesOrchestrator,
    create_hotel_to_activities_orchestrator,
)

from .segments.return_journey import (
    ReturnJourneyOrchestrator,
    create_return_journey_orchestrator,
)

__all__ = [
    # Base orchestrator
    "BaseSegmentOrchestrator",
    "NodeResult",
    "NodeStatus",
    "OrchestratorResult",
    # Inspiration orchestrator
    "InspirationOrchestrator",
    "ConfidenceLevel",
    "DestinationSuggestion",
    "UserIntent",
    "create_inspiration_orchestrator",
    # Home to Airport orchestrator
    "HomeToAirportOrchestrator",
    "TransportMode",
    "TransportOption",
    "DepartureCalculation",
    "create_home_to_airport_orchestrator",
    # Airport to Flight orchestrator
    "AirportToFlightOrchestrator",
    "BoardingStatus",
    "AirportContext",
    "create_airport_to_flight_orchestrator",
    # Flight to Hotel
    "FlightToHotelOrchestrator",
    "create_flight_to_hotel_orchestrator",
    # Hotel to Activities
    "HotelToActivitiesOrchestrator",
    "create_hotel_to_activities_orchestrator",
    # Return Journey
    "ReturnJourneyOrchestrator",
    "create_return_journey_orchestrator",
]
