"""
Phase 1: Journey State Manager

This module provides the state management layer for journeys.
It handles journey initialization, segment transitions, and context updates.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timezone
import logging

from .journey_models import (
    Journey,
    JourneySegment,
    JourneyStatus,
    JourneyContext,
    JourneyTimeline,
    SegmentState,
    SegmentStatus,
    RiskLevel,
    TimelineEvent,
)

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


class JourneyStateManager:
    """
    Manages journey state lifecycle including creation, updates, and transitions.

    This class provides the interface between the journey orchestrator and
    the persistence layer.
    """

    def __init__(self, mongo_repo=None):
        """
        Initialize the state manager.

        Args:
            mongo_repo: MongoDB repository for persistence (optional for testing)
        """
        self.mongo_repo = mongo_repo
        self._journeys: Dict[str, Journey] = {}  # In-memory cache
        
        # Callback registries for modular integration
        self.on_segment_transition_callbacks: List[Callable[[str, JourneySegment, JourneySegment], Any]] = []
        self.on_context_update_callbacks: List[Callable[[str, JourneyContext], Any]] = []

    def initialize_journey(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        initial_context: Optional[JourneyContext] = None
    ) -> Journey:
        """
        Create and initialize a new journey.

        Args:
            user_id: The user who owns this journey
            conversation_id: Optional conversation ID for message tracking
            initial_context: Optional initial context data

        Returns:
            The newly created Journey object
        """
        journey = Journey(
            user_id=user_id,
            conversation_id=conversation_id,
            context=initial_context or JourneyContext(),
        )

        # Activate the first segment (inspiration)
        inspiration_segment = journey.get_segment(JourneySegment.INSPIRATION)
        if inspiration_segment:
            inspiration_segment.activate()

        # Store in cache
        self._journeys[journey.journey_id] = journey

        # Persist if mongo_repo is available
        if self.mongo_repo:
            self._persist_journey(journey)

        # Trigger callbacks for initial segment activation
        for callback in self.on_segment_transition_callbacks:
            try:
                callback(journey.journey_id, None, JourneySegment.INSPIRATION)
            except Exception as e:
                logger.error(f"Error in journey init callback: {e}")

        return journey

    def set_active_for_user(self, journey_id: str, user_id: str) -> bool:
        """
        Mark a journey as the user's active journey so subsequent requests get journey_id in context.
        Delegates to mongo_repo if available.
        """
        if self.mongo_repo and hasattr(self.mongo_repo, "set_active_journey"):
            try:
                result = self.mongo_repo.set_active_journey(journey_id, user_id)
                return result is not None
            except Exception as e:
                logger.error(f"set_active_for_user failed: {e}")
        return False

    def get_journey(self, journey_id: str) -> Optional[Journey]:
        """
        Retrieve a journey by ID.

        Args:
            journey_id: The journey ID to retrieve

        Returns:
            The Journey object or None if not found
        """
        # Check cache first
        if journey_id in self._journeys:
            return self._journeys[journey_id]

        # Try to load from database
        if self.mongo_repo:
            journey = self._load_journey(journey_id)
            if journey:
                self._journeys[journey_id] = journey
            return journey

        return None

    def update_segment_status(
        self,
        journey_id: str,
        segment_type: JourneySegment,
        status: SegmentStatus,
        risk_level: Optional[RiskLevel] = None
    ) -> Optional[SegmentState]:
        """
        Update the status of a specific segment.

        Args:
            journey_id: The journey ID
            segment_type: The segment to update
            status: The new status
            risk_level: Optional risk level update

        Returns:
            The updated SegmentState or None if not found
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return None

        segment = journey.get_segment(segment_type)
        if not segment:
            return None

        segment.status = status
        if risk_level is not None:
            segment.risk_level = risk_level

        if status == SegmentStatus.ACTIVE:
            segment.activated_at = _now_utc()
        elif status == SegmentStatus.COMPLETED:
            segment.completed_at = _now_utc()

        journey.updated_at = _now_utc()
        self._persist_journey(journey)

        return segment

    def rollback_segment(
        self,
        journey_id: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Rollback to previous segment (undo incorrect transition).
        
        Use case: User says "Actually I'm not at the airport yet"
        
        Args:
            journey_id: Journey identifier
            reason: Optional reason for rollback (for logging)
        
        Returns:
            True if rollback successful
        """
        journey = self.get_journey(journey_id)
        if not journey:
            logger.error(f"Cannot rollback: journey {journey_id} not found")
            return False
        
        # Get segment history from journey metadata
        # history stored in metadata; guard against missing
        if not hasattr(journey, "metadata") or journey.metadata is None:
            logger.warning(f"Cannot rollback: no metadata for {journey_id}")
            return False
        history = journey.metadata.get("segment_history", [])
        if len(history) < 2:
            logger.warning(f"Cannot rollback: no previous segment for {journey_id}")
            return False
        
        # Get previous segment (second to last in history)
        previous_entry = history[-2]
        previous_segment_value = previous_entry.get("segment")
        
        try:
            from_segment = journey.current_segment
            to_segment = JourneySegment(previous_segment_value)
            
            # Revert segment states
            current_seg = journey.get_segment(from_segment)
            previous_seg = journey.get_segment(to_segment)
            
            if current_seg:
                current_seg.status = SegmentStatus.PENDING
                current_seg.activated_at = None
            
            if previous_seg:
                previous_seg.status = SegmentStatus.ACTIVE
                previous_seg.completed_at = None
            
            journey.current_segment = to_segment
            journey.updated_at = _now_utc()
            
            # Add rollback entry to history
            history.append({
                "segment": to_segment.value,
                "transitioned_at": datetime.now(timezone.utc).isoformat(),
                "action": "rollback",
                "from": from_segment.value,
                "reason": reason or "User correction",
            })
            journey.metadata["segment_history"] = history
            
            self._persist_journey(journey)
            
            logger.info(f"Rolled back journey {journey_id}: {from_segment.value} → {to_segment.value} (reason: {reason})")
            return True
        
        except Exception as e:
            logger.error(f"Rollback failed for {journey_id}: {e}")
            return False

    def transition_segment(
        self,
        journey_id: str,
        from_segment: JourneySegment,
        to_segment: JourneySegment
    ) -> bool:
        """
        Transition from one segment to another.

        This completes the current segment and activates the next one.

        Args:
            journey_id: The journey ID
            from_segment: The segment to complete
            to_segment: The segment to activate

        Returns:
            True if transition successful, False otherwise
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return False

        # Get both segments
        current = journey.get_segment(from_segment)
        next_seg = journey.get_segment(to_segment)

        if not current or not next_seg:
            return False

        # Complete current segment
        current.complete()

        # Activate next segment
        next_seg.activate()

        # Update journey's current segment
        journey.current_segment = to_segment
        journey.updated_at = _now_utc()

        # Update journey status if needed
        if journey.status == JourneyStatus.PLANNING:
            journey.status = JourneyStatus.IN_PROGRESS
        
        # Track segment history for rollback support
        # ensure metadata dict exists (old journeys may not have it)
        if not hasattr(journey, "metadata") or journey.metadata is None:
            journey.metadata = {}
        history = journey.metadata.get("segment_history", [])
        history.append({
            "segment": to_segment.value,
            "transitioned_at": datetime.now(timezone.utc).isoformat(),
            "action": "transition",
            "from": from_segment.value,
        })
        journey.metadata["segment_history"] = history

        self._persist_journey(journey)

        # Trigger callbacks
        for callback in self.on_segment_transition_callbacks:
            try:
                callback(journey_id, from_segment, to_segment)
            except Exception as e:
                logger.error(f"Error in segment transition callback: {e}")

        return True

    def auto_transition_if_needed(
        self,
        journey_id: str,
    ) -> Optional[JourneySegment]:
        """
        Evaluate the current journey against segment criteria and transition once if eligible.

        Returns:
            The segment transitioned to, or None when no automatic transition applies.
        """
        journey = self.get_journey(journey_id)
        if not journey:
            logger.info("Auto-transition skipped for %s: journey not found", journey_id)
            return None

        try:
            from .segments import SegmentStateMachine

            machine = SegmentStateMachine()
            from_segment = journey.current_segment
            flight_status = getattr(journey.context, "flight_status", None)
            booked_flights = getattr(journey, "booked_flights", None) or []

            logger.info(
                "Auto-transition check for %s: current_segment=%s flight_status=%s booked_flights=%s",
                journey_id,
                from_segment.value if hasattr(from_segment, "value") else from_segment,
                (
                    flight_status.model_dump()
                    if hasattr(flight_status, "model_dump")
                    else flight_status
                ),
                len(booked_flights) if isinstance(booked_flights, list) else booked_flights,
            )

            to_segment = machine.should_transition(journey)
            logger.info(
                "Auto-transition decision for %s: next_segment=%s",
                journey_id,
                to_segment.value if hasattr(to_segment, "value") else to_segment,
            )
            if not to_segment:
                return None

            transitioned = self.transition_segment(journey_id, from_segment, to_segment)
            logger.info(
                "Auto-transition result for %s: transitioned=%s from=%s to=%s",
                journey_id,
                transitioned,
                from_segment.value if hasattr(from_segment, "value") else from_segment,
                to_segment.value if hasattr(to_segment, "value") else to_segment,
            )
            return to_segment if transitioned else None
        except Exception as e:
            logger.error(f"Error auto-transitioning journey {journey_id}: {e}")
            return None

    def update_context(
        self,
        journey_id: str,
        context_updates: Dict[str, Any]
    ) -> Optional[JourneyContext]:
        """
        Update the journey context with new information.

        Args:
            journey_id: The journey ID
            context_updates: Dictionary of context fields to update

        Returns:
            The updated JourneyContext or None if not found
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return None

        # Update context fields
        for key, value in context_updates.items():
            if hasattr(journey.context, key):
                setattr(journey.context, key, value)

        journey.updated_at = _now_utc()
        self._persist_journey(journey)

        # Trigger callbacks
        for callback in self.on_context_update_callbacks:
            try:
                callback(journey_id, journey.context)
            except Exception as e:
                logger.error(f"Error in context update callback: {e}")

        return journey.context

    def update_journey(
        self,
        journey_id: str,
        journey_updates: Dict[str, Any]
    ) -> Optional[Journey]:
        """
        Update arbitrary root-level fields on the journey object (e.g. saved_flights, metadata).

        Args:
            journey_id: The journey ID
            journey_updates: Dictionary of fields to update on the root Journey model

        Returns:
            The updated Journey or None if not found
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return None

        # Update root fields
        for key, value in journey_updates.items():
            if hasattr(journey, key):
                setattr(journey, key, value)

        journey.updated_at = _now_utc()
        self._persist_journey(journey)
        return journey

    def calculate_timeline(self, journey_id: str) -> Optional[JourneyTimeline]:
        """
        Calculate/recalculate the journey timeline.

        This should be called whenever context changes that affect timing.

        Args:
            journey_id: The journey ID

        Returns:
            The updated JourneyTimeline or None if not found
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return None

        # TODO: Implement actual timeline calculation logic
        # This is a placeholder that will be expanded in Phase 5
        journey.timeline.last_calculated = _now_utc()

        journey.updated_at = _now_utc()
        self._persist_journey(journey)

        return journey.timeline

    def get_active_segment(self, journey_id: str) -> Optional[SegmentState]:
        """
        Get the currently active segment for a journey.

        Args:
            journey_id: The journey ID

        Returns:
            The active SegmentState or None
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return None

        return journey.get_active_segment()

    def complete_journey(self, journey_id: str) -> bool:
        """
        Mark a journey as completed.

        Args:
            journey_id: The journey ID

        Returns:
            True if successful, False otherwise
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return False

        journey.status = JourneyStatus.COMPLETED
        journey.updated_at = _now_utc()

        # Complete the return segment if not already done
        return_segment = journey.get_segment(JourneySegment.RETURN)
        if return_segment and return_segment.status == SegmentStatus.ACTIVE:
            return_segment.complete()

        self._persist_journey(journey)

        return True

    def cancel_journey(self, journey_id: str) -> bool:
        """
        Cancel a journey.

        Args:
            journey_id: The journey ID

        Returns:
            True if successful, False otherwise
        """
        journey = self.get_journey(journey_id)
        if not journey:
            return False

        journey.status = JourneyStatus.CANCELLED
        journey.updated_at = _now_utc()

        self._persist_journey(journey)

        return True

    def _persist_journey(self, journey: Journey) -> None:
        """Persist journey to MongoDB if available."""
        if self.mongo_repo:
            try:
                # Convert journey to MongoDB document format
                doc = journey.to_mongo_dict()

                # Check if journey already exists
                existing = self.mongo_repo.get_journey(journey.journey_id)

                if existing:
                    # Update existing journey
                    self.mongo_repo.update_journey(journey.journey_id, doc)
                else:
                    # Create new journey
                    self.mongo_repo.create_journey(doc)
            except Exception as e:
                # Log error but don't fail the operation
                logger.error(f"Error persisting journey {journey.journey_id}: {e}")

    def _load_journey(self, journey_id: str) -> Optional[Journey]:
        """Load journey from MongoDB if available."""
        if self.mongo_repo:
            try:
                doc = self.mongo_repo.get_journey(journey_id)
                if doc:
                    return Journey.from_mongo_dict(doc)
            except Exception as e:
                # Log error but don't fail the operation
                logger.error(f"Error loading journey {journey_id}: {e}")
        return None
    
    def get_active_journeys(self) -> List[Journey]:
        """
        Get all active (in-progress) journeys.
        
        Returns:
            List of active Journey objects
        """
        active = []
        
        # Check in-memory cache
        for journey in self._journeys.values():
            if journey.status == JourneyStatus.IN_PROGRESS:
                active.append(journey)
        
        # Also check MongoDB for active journeys not in cache
        if self.mongo_repo and hasattr(self.mongo_repo, 'get_active_journeys'):
            try:
                docs = self.mongo_repo.get_active_journeys()
                for doc in docs:
                    journey_id = doc.get("journey_id")
                    if journey_id and journey_id not in self._journeys:
                        journey = Journey.from_mongo_dict(doc)
                        self._journeys[journey_id] = journey
                        active.append(journey)
            except Exception as e:
                logger.error(f"Error loading active journeys from MongoDB: {e}")
        
        return active
