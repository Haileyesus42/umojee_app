"""
Phase 1: Segment State Machines

This module defines the segment transition logic and state machines.
Each segment has specific activation and completion criteria.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from .journey_models import (
    Journey,
    JourneySegment,
    SegmentState,
    SegmentStatus,
    JourneyContext,
)


class SegmentCriteria:
    """
    Defines activation and completion criteria for a segment.
    """

    def __init__(
        self,
        segment_type: JourneySegment,
        activation_conditions: List[Callable[[Journey], bool]] = None,
        completion_conditions: List[Callable[[Journey], bool]] = None,
    ):
        self.segment_type = segment_type
        self.activation_conditions = activation_conditions or []
        self.completion_conditions = completion_conditions or []

    def can_activate(self, journey: Journey) -> bool:
        """Check if all activation conditions are met."""
        if not self.activation_conditions:
            return True
        return all(condition(journey) for condition in self.activation_conditions)

    def is_complete(self, journey: Journey) -> bool:
        """Check if all completion conditions are met."""
        if not self.completion_conditions:
            return False
        return all(condition(journey) for condition in self.completion_conditions)


class SegmentStateMachine:
    """
    Manages segment state transitions based on defined criteria.

    This class handles the logic for determining when segments should
    activate and complete, enabling automatic journey progression.
    """

    # Define the segment order for progression
    SEGMENT_ORDER = [
        JourneySegment.INSPIRATION,
        JourneySegment.HOME_TO_AIRPORT,
        JourneySegment.AIRPORT_TO_FLIGHT,
        JourneySegment.FLIGHT_TO_HOTEL,
        JourneySegment.HOTEL_TO_ACTIVITIES,
        JourneySegment.RETURN,
    ]

    def __init__(self):
        """Initialize the state machine with default criteria."""
        self.criteria: Dict[JourneySegment, SegmentCriteria] = {}
        self._setup_default_criteria()

    def _setup_default_criteria(self) -> None:
        """Set up default activation and completion criteria for each segment."""

        # Segment 1: Inspiration
        self.criteria[JourneySegment.INSPIRATION] = SegmentCriteria(
            segment_type=JourneySegment.INSPIRATION,
            activation_conditions=[
                # First segment - always activatable
                lambda j: True
            ],
            completion_conditions=[
                # Complete when journey has flight booking confirmed
                lambda j: self._has_booking_confirmed(j, "flight"),
            ]
        )

        # Segment 2: Home to Airport
        self.criteria[JourneySegment.HOME_TO_AIRPORT] = SegmentCriteria(
            segment_type=JourneySegment.HOME_TO_AIRPORT,
            activation_conditions=[
                # A confirmed booking is enough to leave inspiration.
                lambda j: self._has_booking_confirmed(j, "flight"),
            ],
            completion_conditions=[
                # Complete when user arrives at airport
                lambda j: self._is_at_location(j, "airport"),
            ]
        )

        # Segment 3: Airport to Flight
        self.criteria[JourneySegment.AIRPORT_TO_FLIGHT] = SegmentCriteria(
            segment_type=JourneySegment.AIRPORT_TO_FLIGHT,
            activation_conditions=[
                lambda j: self._is_segment_complete(j, JourneySegment.HOME_TO_AIRPORT),
            ],
            completion_conditions=[
                # Complete when boarding is done
                lambda j: self._has_boarded_flight(j),
            ]
        )

        # Segment 4: Flight to Hotel
        self.criteria[JourneySegment.FLIGHT_TO_HOTEL] = SegmentCriteria(
            segment_type=JourneySegment.FLIGHT_TO_HOTEL,
            activation_conditions=[
                lambda j: self._is_segment_complete(j, JourneySegment.AIRPORT_TO_FLIGHT),
            ],
            completion_conditions=[
                # Complete when user arrives at hotel
                lambda j: self._is_at_location(j, "hotel"),
            ]
        )

        # Segment 5: Hotel to Activities
        self.criteria[JourneySegment.HOTEL_TO_ACTIVITIES] = SegmentCriteria(
            segment_type=JourneySegment.HOTEL_TO_ACTIVITIES,
            activation_conditions=[
                lambda j: self._is_segment_complete(j, JourneySegment.FLIGHT_TO_HOTEL),
            ],
            completion_conditions=[
                # Complete when it's time for return journey
                lambda j: self._is_return_day(j),
            ]
        )

        # Segment 6: Return
        self.criteria[JourneySegment.RETURN] = SegmentCriteria(
            segment_type=JourneySegment.RETURN,
            activation_conditions=[
                lambda j: self._is_segment_complete(j, JourneySegment.HOTEL_TO_ACTIVITIES),
            ],
            completion_conditions=[
                # Complete when user arrives home
                lambda j: self._is_at_location(j, "home"),
            ]
        )

    def check_activation_criteria(
        self,
        journey: Journey,
        segment_type: JourneySegment
    ) -> bool:
        """
        Check if a segment can be activated.

        Args:
            journey: The journey to check
            segment_type: The segment to check activation for

        Returns:
            True if the segment can be activated
        """
        criteria = self.criteria.get(segment_type)
        if not criteria:
            return False
        return criteria.can_activate(journey)

    def check_completion_criteria(
        self,
        journey: Journey,
        segment_type: JourneySegment
    ) -> bool:
        """
        Check if a segment's completion criteria are met.

        Args:
            journey: The journey to check
            segment_type: The segment to check completion for

        Returns:
            True if the segment's completion criteria are met
        """
        criteria = self.criteria.get(segment_type)
        if not criteria:
            return False
        return criteria.is_complete(journey)

    def get_next_segment(self, current_segment: JourneySegment) -> Optional[JourneySegment]:
        """
        Get the next segment in the journey order.

        Args:
            current_segment: The current segment

        Returns:
            The next segment or None if at the end
        """
        try:
            current_index = self.SEGMENT_ORDER.index(current_segment)
            if current_index < len(self.SEGMENT_ORDER) - 1:
                return self.SEGMENT_ORDER[current_index + 1]
        except ValueError:
            pass
        return None

    def should_transition(self, journey: Journey) -> Optional[JourneySegment]:
        """
        Check if the journey should transition to a new segment.

        Args:
            journey: The journey to check

        Returns:
            The segment to transition to, or None if no transition needed
        """
        current_segment = journey.current_segment

        # Check if current segment is complete
        if not self.check_completion_criteria(journey, current_segment):
            return None

        # Get next segment
        next_segment = self.get_next_segment(current_segment)
        if not next_segment:
            return None

        # Check if next segment can be activated
        if self.check_activation_criteria(journey, next_segment):
            return next_segment

        return None

    def transition_to_next(self, journey: Journey) -> Optional[JourneySegment]:
        """
        Transition the journey to the next segment if criteria are met.

        Args:
            journey: The journey to transition

        Returns:
            The new segment if transitioned, None otherwise
        """
        next_segment = self.should_transition(journey)
        if next_segment:
            # Get segment states
            current = journey.get_segment(journey.current_segment)
            next_state = journey.get_segment(next_segment)

            if current and next_state:
                current.complete()
                next_state.activate()
                journey.current_segment = next_segment

                return next_segment

        return None

    # Helper methods for criteria checking
    def _is_segment_complete(self, journey: Journey, segment_type: JourneySegment) -> bool:
        """Check if a specific segment is complete."""
        segment = journey.get_segment(segment_type)
        return segment is not None and segment.status == SegmentStatus.COMPLETED

    def _has_booking_confirmed(self, journey: Journey, booking_type: str) -> bool:
        """Check if a booking is confirmed based on flight_status context."""
        context = journey.context
        if booking_type == "flight" and context.flight_status:
            fs = context.flight_status
            # A booking is confirmed if we have a flight number or booking reference
            return bool(fs.flight_number) or bool(fs.booking_reference)
        return False

    def _is_at_location(self, journey: Journey, location_type: str) -> bool:
        """Check if user is at a specific location type (placeholder)."""
        # TODO: Implement actual location check using geofencing
        # This would compare current location to known locations
        return False

    def _has_boarded_flight(self, journey: Journey) -> bool:
        """Check if user has boarded the flight (placeholder)."""
        # TODO: Implement actual boarding check
        return False

    def _is_return_day(self, journey: Journey) -> bool:
        """Check if it's the return day (placeholder)."""
        # TODO: Implement actual date check against booking
        return False


def create_custom_criteria(
    segment_type: JourneySegment,
    activation_conditions: List[Callable[[Journey], bool]],
    completion_conditions: List[Callable[[Journey], bool]]
) -> SegmentCriteria:
    """
    Factory function to create custom segment criteria.

    Args:
        segment_type: The segment this criteria applies to
        activation_conditions: List of functions that must all return True to activate
        completion_conditions: List of functions that must all return True to complete

    Returns:
        A new SegmentCriteria instance
    """
    return SegmentCriteria(
        segment_type=segment_type,
        activation_conditions=activation_conditions,
        completion_conditions=completion_conditions,
    )
