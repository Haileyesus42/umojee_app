"""
Phase 5: Timeline Calculator

This module calculates and manages journey timelines.
It handles multi-factor time calculations with cascading updates.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Protocol, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field, asdict
from enum import Enum
import logging

# Phase 1 imports
from ..phase_1_foundation import JourneyTimeline as Phase1Timeline, Milestone, JourneySegment

logger = logging.getLogger(__name__)


class TimelinePersistence(Protocol):
    """Protocol for timeline persistence implementations."""
    
    async def save_timeline(self, timeline: 'JourneyTimeline') -> bool:
        """Save a journey timeline."""
        ...
    
    async def load_timeline(self, journey_id: str) -> Optional['JourneyTimeline']:
        """Load a journey timeline."""
        ...
    
    async def update_timeline(self, timeline: 'JourneyTimeline') -> bool:
        """Update an existing timeline."""
        ...


class EventType(str, Enum):
    """Types of timeline events."""
    DEPARTURE = "departure"
    ARRIVAL = "arrival"
    CHECKIN = "checkin"
    SECURITY = "security"
    BOARDING = "boarding"
    FLIGHT = "flight"
    IMMIGRATION = "immigration"
    BAGGAGE = "baggage"
    TRANSFER = "transfer"
    HOTEL_CHECKIN = "hotel_checkin"
    HOTEL_CHECKOUT = "hotel_checkout"
    ACTIVITY = "activity"
    REMINDER = "reminder"


@dataclass
class TimelineEvent:
    """An event in the journey timeline."""
    event_id: str = ""
    event_type: EventType = EventType.DEPARTURE
    name: str = ""
    scheduled_time: Optional[datetime] = None
    estimated_duration_minutes: int = 0
    location: Optional[str] = None
    segment: Optional[str] = None
    is_fixed: bool = False  # Fixed events cannot be moved
    buffer_minutes: int = 0
    dependencies: List[str] = field(default_factory=list)  # Event IDs this depends on
    dependency_type: Optional[str] = None  # "blocking" vs "soft"
    completed: bool = False
    notes: Optional[str] = None
    
    def can_start(self, completed_events: List[str]) -> bool:
        """
        Check if all dependencies are met to start this event.
        
        Args:
            completed_events: List of event IDs that are completed
            
        Returns:
            True if event can start
        """
        if not self.dependencies:
            return True
        
        if self.dependency_type == "soft":
            # Soft dependencies are recommendations, not blockers
            return True
        
        # Blocking dependencies must all be completed
        return all(dep in completed_events for dep in self.dependencies)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage."""
        data = asdict(self)
        if data.get('scheduled_time') and isinstance(data['scheduled_time'], datetime):
            data['scheduled_time'] = data['scheduled_time'].isoformat()
        if isinstance(data.get('event_type'), EventType):
            data['event_type'] = data['event_type'].value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TimelineEvent':
        """Deserialize from dictionary."""
        if 'scheduled_time' in data and isinstance(data['scheduled_time'], str):
            data['scheduled_time'] = datetime.fromisoformat(data['scheduled_time'])
        if 'event_type' in data and isinstance(data['event_type'], str):
            data['event_type'] = EventType(data['event_type'])
        return cls(**data)


@dataclass
class ConditionalBranch:
    """
    Conditional plan: if condition is met by resolve_by, use then_event_ids; else use else_event_ids.
    E.g. "If you clear security before 8:00, do lounge; otherwise go straight to gate."
    """
    condition_id: str = ""
    condition_description: str = ""
    resolve_by: Optional[datetime] = None
    then_event_ids: List[str] = field(default_factory=list)
    else_event_ids: List[str] = field(default_factory=list)
    resolved: Optional[bool] = None  # True = then branch, False = else branch
    resolved_at: Optional[datetime] = None


@dataclass
class JourneyTimeline:
    """Complete journey timeline."""
    journey_id: str = ""
    events: List[TimelineEvent] = field(default_factory=list)
    total_duration_hours: float = 0
    departure_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    last_calculated: Optional[datetime] = None
    confidence: float = 0.8
    conditional_branches: List[ConditionalBranch] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage."""
        return {
            'journey_id': self.journey_id,
            'events': [event.to_dict() for event in self.events],
            'total_duration_hours': self.total_duration_hours,
            'departure_date': self.departure_date.isoformat() if self.departure_date else None,
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'last_calculated': self.last_calculated.isoformat() if self.last_calculated else None,
            'confidence': self.confidence,
            'conditional_branches': [
                {
                    'condition_id': b.condition_id,
                    'condition_description': b.condition_description,
                    'resolve_by': b.resolve_by.isoformat() if b.resolve_by else None,
                    'then_event_ids': b.then_event_ids,
                    'else_event_ids': b.else_event_ids,
                    'resolved': b.resolved,
                    'resolved_at': b.resolved_at.isoformat() if b.resolved_at else None,
                }
                for b in self.conditional_branches
            ],
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JourneyTimeline':
        """Deserialize from dictionary."""
        if 'departure_date' in data and data['departure_date']:
            data['departure_date'] = datetime.fromisoformat(data['departure_date'])
        if 'return_date' in data and data['return_date']:
            data['return_date'] = datetime.fromisoformat(data['return_date'])
        if 'last_calculated' in data and data['last_calculated']:
            data['last_calculated'] = datetime.fromisoformat(data['last_calculated'])
        if 'events' in data:
            data['events'] = [TimelineEvent.from_dict(e) for e in data['events']]
        if 'conditional_branches' in data:
            branches = []
            for b in data['conditional_branches']:
                resolve_by = datetime.fromisoformat(b['resolve_by']) if b.get('resolve_by') else None
                resolved_at = datetime.fromisoformat(b['resolved_at']) if b.get('resolved_at') else None
                branches.append(ConditionalBranch(
                    condition_id=b.get('condition_id', ''),
                    condition_description=b.get('condition_description', ''),
                    resolve_by=resolve_by,
                    then_event_ids=b.get('then_event_ids', []),
                    else_event_ids=b.get('else_event_ids', []),
                    resolved=b.get('resolved'),
                    resolved_at=resolved_at,
                ))
            data['conditional_branches'] = branches
        return cls(**data)
    
    def to_gantt_chart_data(self) -> List[Dict[str, Any]]:
        """Format timeline for Gantt chart visualization."""
        gantt_data = []
        for event in self.events:
            if event.scheduled_time:
                gantt_data.append({
                    'id': event.event_id,
                    'name': event.name,
                    'start': event.scheduled_time.isoformat(),
                    'end': (event.scheduled_time + timedelta(minutes=event.estimated_duration_minutes)).isoformat(),
                    'duration': event.estimated_duration_minutes,
                    'type': event.event_type.value if isinstance(event.event_type, EventType) else event.event_type,
                    'location': event.location,
                    'segment': event.segment,
                    'is_fixed': event.is_fixed,
                    'completed': event.completed,
                    'dependencies': event.dependencies
                })
        return gantt_data
    
    def to_calendar_events(self) -> List[Dict[str, Any]]:
        """Export to calendar format (compatible with iCal, Google Calendar)."""
        calendar_events = []
        for event in self.events:
            if event.scheduled_time:
                calendar_events.append({
                    'uid': event.event_id,
                    'summary': event.name,
                    'dtstart': event.scheduled_time.isoformat(),
                    'dtend': (event.scheduled_time + timedelta(minutes=event.estimated_duration_minutes)).isoformat(),
                    'location': event.location or '',
                    'description': f"Journey: {self.journey_id}\nSegment: {event.segment or 'N/A'}\nNotes: {event.notes or 'N/A'}",
                    'status': 'CONFIRMED' if event.completed else 'TENTATIVE'
                })
        return calendar_events

    def resolve_condition(
        self,
        condition_id: str,
        then_branch: bool,
        resolved_at: Optional[datetime] = None,
    ) -> Tuple[List[str], List[str]]:
        """
        Resolve a conditional branch (e.g. "cleared security before 8:00").
        Timeline updates; returns (event_ids_to_activate, event_ids_to_deactivate).

        Args:
            condition_id: ID of the conditional branch
            then_branch: True = condition met (use then_event_ids), False = use else_event_ids
            resolved_at: When the condition was resolved (default: now)

        Returns:
            (event_ids to show/activate, event_ids to hide/deactivate)
        """
        now = datetime.now(timezone.utc) if resolved_at is None else resolved_at
        activate: List[str] = []
        deactivate: List[str] = []
        for branch in self.conditional_branches:
            if branch.condition_id != condition_id:
                continue
            branch.resolved = then_branch
            branch.resolved_at = now
            if then_branch:
                activate = list(branch.then_event_ids)
                deactivate = list(branch.else_event_ids)
            else:
                activate = list(branch.else_event_ids)
                deactivate = list(branch.then_event_ids)
            break
        return activate, deactivate


class TimelineCalculator:
    """
    Calculates journey timelines with multi-factor considerations.

    This calculator handles:
    - Multi-factor departure time calculation
    - Arrival time estimation with delays
    - Walking/transfer time calculations
    - Activity duration estimation
    - Cascading updates when context changes
    - Dynamic buffers based on context (user profile, airport, time of day)
    """

    # Default buffers (in minutes)
    DEFAULT_BUFFERS = {
        "international_checkin": 180,
        "domestic_checkin": 90,
        "security": 30,
        "boarding": 30,
        "immigration": 45,
        "baggage_claim": 30,
        "hotel_checkin": 15,
        "activity_buffer": 15,
    }

    # Default durations (in minutes)
    DEFAULT_DURATIONS = {
        "security_process": 20,
        "immigration_process": 30,
        "baggage_claim": 25,
        "hotel_checkin_process": 15,
    }
    
    # Airport-specific buffer multipliers (some airports need more time)
    AIRPORT_MULTIPLIERS = {
        "JFK": 1.2,  # New York - busy
        "LAX": 1.3,  # Los Angeles - very busy
        "LHR": 1.25, # London Heathrow - busy
        "ORD": 1.2,  # Chicago O'Hare - busy
        "ATL": 1.15, # Atlanta - very busy
        # Add more as needed
    }
    
    # Time of day multipliers (morning rush is slower)
    TIME_OF_DAY_MULTIPLIERS = {
        "early_morning": 0.9,   # 5-7 AM - quieter
        "morning_rush": 1.3,    # 7-10 AM - very busy
        "midday": 1.0,          # 10 AM - 2 PM - normal
        "afternoon": 1.1,       # 2-5 PM - slightly busy
        "evening_rush": 1.2,    # 5-8 PM - busy
        "evening": 0.95,        # 8-11 PM - quieter
        "night": 0.8,           # 11 PM - 5 AM - very quiet
    }

    def __init__(
        self, 
        custom_buffers: Optional[Dict[str, int]] = None,
        persistence: Optional[TimelinePersistence] = None
    ):
        """
        Initialize the timeline calculator.

        Args:
            custom_buffers: Optional custom buffer times
            persistence: Optional persistence layer for storing timelines
        """
        self.buffers = {**self.DEFAULT_BUFFERS, **(custom_buffers or {})}
        self._persistence = persistence

    def add_conditional_branch(
        self,
        timeline: JourneyTimeline,
        condition_id: str,
        condition_description: str,
        resolve_by: datetime,
        then_event_ids: List[str],
        else_event_ids: List[str],
    ) -> None:
        """
        Add a conditional plan to the timeline.
        E.g. "If you clear security before 8:00, do lounge (then_event_ids); otherwise go straight to gate (else_event_ids)."

        Args:
            timeline: The journey timeline to update
            condition_id: Unique ID for this condition
            condition_description: Human-readable description (e.g. "Clear security before 8:00")
            resolve_by: Time by which the condition must be resolved
            then_event_ids: Event IDs to activate if condition is met
            else_event_ids: Event IDs to activate if condition is not met
        """
        branch = ConditionalBranch(
            condition_id=condition_id,
            condition_description=condition_description,
            resolve_by=resolve_by,
            then_event_ids=then_event_ids,
            else_event_ids=else_event_ids,
        )
        timeline.conditional_branches.append(branch)
        logger.info(f"Added conditional branch {condition_id}: {condition_description}")
    
    def calculate_dynamic_buffer(
        self,
        buffer_type: str,
        airport_code: Optional[str] = None,
        time: Optional[datetime] = None,
        user_risk_tolerance: str = "normal"
    ) -> int:
        """
        Calculate dynamic buffer based on context.
        
        Args:
            buffer_type: Type of buffer (e.g., "security", "checkin")
            airport_code: Airport code for airport-specific adjustments
            time: Time of day for rush hour adjustments
            user_risk_tolerance: User's risk tolerance ("nervous", "normal", "relaxed")
            
        Returns:
            Calculated buffer in minutes
        """
        base_buffer = self.buffers.get(buffer_type, 30)
        
        # Apply airport multiplier
        multiplier = 1.0
        if airport_code and airport_code in self.AIRPORT_MULTIPLIERS:
            multiplier *= self.AIRPORT_MULTIPLIERS[airport_code]
        
        # Apply time of day multiplier
        if time:
            hour = time.hour
            if 5 <= hour < 7:
                time_category = "early_morning"
            elif 7 <= hour < 10:
                time_category = "morning_rush"
            elif 10 <= hour < 14:
                time_category = "midday"
            elif 14 <= hour < 17:
                time_category = "afternoon"
            elif 17 <= hour < 20:
                time_category = "evening_rush"
            elif 20 <= hour < 23:
                time_category = "evening"
            else:
                time_category = "night"
            
            multiplier *= self.TIME_OF_DAY_MULTIPLIERS[time_category]
        
        # Apply user risk tolerance
        risk_multipliers = {
            "nervous": 1.3,    # Extra cautious travelers
            "normal": 1.0,     # Standard buffer
            "relaxed": 0.85,   # Comfortable cutting it close
            "adventurous": 0.7 # Minimal buffers
        }
        multiplier *= risk_multipliers.get(user_risk_tolerance, 1.0)
        
        return int(base_buffer * multiplier)

    def calculate_departure_time(
        self,
        flight_time: datetime,
        travel_duration_minutes: int,
        is_international: bool = True,
        has_checked_bags: bool = True,
        traffic_buffer_minutes: int = 0,
        security_wait_estimate: int = 20
    ) -> Dict[str, Any]:
        """
        Calculate when to leave home for a flight.

        Multi-factor calculation including:
        - Flight departure time
        - Airport check-in requirements
        - Security wait times
        - Travel time to airport
        - Traffic conditions
        - Luggage considerations

        Args:
            flight_time: Scheduled flight departure
            travel_duration_minutes: Travel time to airport
            is_international: International flight flag
            has_checked_bags: Whether checking bags
            traffic_buffer_minutes: Extra time for traffic
            security_wait_estimate: Estimated security wait

        Returns:
            Dictionary with calculated times and breakdown
        """
        # Build time components
        components = {}

        # Check-in buffer
        if is_international:
            components["checkin_buffer"] = self.buffers["international_checkin"]
        else:
            components["checkin_buffer"] = self.buffers["domestic_checkin"]

        # Security
        components["security_process"] = security_wait_estimate

        # Boarding
        components["boarding_buffer"] = self.buffers["boarding"]

        # Travel time
        components["travel_time"] = travel_duration_minutes + traffic_buffer_minutes

        # Additional time for checked bags
        if has_checked_bags:
            components["bag_drop"] = 15

        # Calculate total buffer
        total_buffer_minutes = sum(components.values())

        # Calculate times
        recommended_departure = flight_time - timedelta(minutes=total_buffer_minutes)
        latest_safe_departure = flight_time - timedelta(minutes=total_buffer_minutes - 30)
        ideal_airport_arrival = flight_time - timedelta(
            minutes=total_buffer_minutes - travel_duration_minutes - traffic_buffer_minutes
        )

        return {
            "recommended_departure": recommended_departure,
            "latest_safe_departure": latest_safe_departure,
            "ideal_airport_arrival": ideal_airport_arrival,
            "total_buffer_minutes": total_buffer_minutes,
            "components": components,
            "confidence": 0.85
        }

    def calculate_arrival_eta(
        self,
        landing_time: datetime,
        is_international: bool = True,
        has_checked_bags: bool = True,
        transfer_time_minutes: int = 30,
        traffic_estimate_minutes: int = 0
    ) -> Dict[str, Any]:
        """
        Calculate arrival time at destination (e.g., hotel).

        Considers:
        - Immigration/customs (international)
        - Baggage claim
        - Transfer time (taxi, shuttle, etc.)
        - Traffic conditions

        Args:
            landing_time: Scheduled landing time
            is_international: International arrival
            has_checked_bags: Whether claiming checked bags
            transfer_time_minutes: Time to destination
            traffic_estimate_minutes: Traffic delay estimate

        Returns:
            Dictionary with estimated times
        """
        components = {}

        # Taxi to gate and deplaning
        components["deplaning"] = 15

        # Immigration (international only)
        if is_international:
            components["immigration"] = self.buffers["immigration"]

        # Baggage claim
        if has_checked_bags:
            components["baggage_claim"] = self.buffers["baggage_claim"]

        # Transfer to destination
        components["transfer"] = transfer_time_minutes + traffic_estimate_minutes

        total_time = sum(components.values())

        estimated_arrival = landing_time + timedelta(minutes=total_time)

        return {
            "estimated_arrival": estimated_arrival,
            "total_time_minutes": total_time,
            "components": components,
            "confidence": 0.75  # Lower confidence due to variable factors
        }

    def calculate_time_to_gate(
        self,
        current_location: str,
        gate: str,
        airport_code: str,
        crowd_level: str = "moderate"
    ) -> Dict[str, Any]:
        """
        Calculate time to reach gate from current location.

        Args:
            current_location: Current location in airport
            gate: Destination gate
            airport_code: Airport code
            crowd_level: Current crowd level

        Returns:
            Dictionary with time estimate
        """
        # Base walking speed: 4 km/h = ~67 meters/minute
        # Airport average distance between security and gate: ~500m

        base_time = 8  # Base minutes

        # Adjust for crowd level
        crowd_multipliers = {
            "light": 0.8,
            "moderate": 1.0,
            "heavy": 1.3,
            "very_heavy": 1.5
        }
        multiplier = crowd_multipliers.get(crowd_level, 1.0)

        estimated_time = int(base_time * multiplier)

        return {
            "estimated_minutes": estimated_time,
            "crowd_level": crowd_level,
            "recommendation": self._get_gate_recommendation(estimated_time),
            "confidence": 0.7
        }

    def _get_gate_recommendation(self, minutes: int) -> str:
        """Generate recommendation based on time to gate."""
        if minutes <= 5:
            return "Gate is nearby - comfortable pace"
        elif minutes <= 10:
            return "Allow time for the walk"
        else:
            return "Start heading to gate soon"

    def calculate_activity_duration(
        self,
        activity_type: str,
        base_duration_hours: float,
        user_pace: str = "moderate"
    ) -> Dict[str, Any]:
        """
        Calculate realistic activity duration.

        Args:
            activity_type: Type of activity
            base_duration_hours: Base duration estimate
            user_pace: User's pace preference

        Returns:
            Dictionary with duration estimates
        """
        pace_multipliers = {
            "quick": 0.8,
            "moderate": 1.0,
            "relaxed": 1.3,
            "leisurely": 1.5
        }
        multiplier = pace_multipliers.get(user_pace, 1.0)

        estimated_hours = base_duration_hours * multiplier

        # Add buffer for transitions
        buffer_minutes = self.buffers["activity_buffer"]

        return {
            "estimated_duration_hours": estimated_hours,
            "estimated_duration_minutes": int(estimated_hours * 60),
            "buffer_minutes": buffer_minutes,
            "total_block_minutes": int(estimated_hours * 60) + buffer_minutes,
            "pace": user_pace
        }

    def recalculate_on_delay(
        self,
        timeline: JourneyTimeline,
        delayed_event_id: str,
        delay_minutes: int
    ) -> JourneyTimeline:
        """
        Recalculate timeline when an event is delayed.

        Cascades the delay to dependent events.

        Args:
            timeline: Current timeline
            delayed_event_id: ID of delayed event
            delay_minutes: Minutes of delay

        Returns:
            Updated timeline
        """
        # Find the delayed event
        delayed_event = None
        delayed_idx = -1
        for idx, event in enumerate(timeline.events):
            if event.event_id == delayed_event_id:
                delayed_event = event
                delayed_idx = idx
                break

        if not delayed_event:
            logger.warning(f"Event {delayed_event_id} not found in timeline")
            return timeline

        # Update the delayed event
        if delayed_event.scheduled_time:
            delayed_event.scheduled_time += timedelta(minutes=delay_minutes)

        # Cascade to dependent events
        affected_events = []
        for event in timeline.events[delayed_idx + 1:]:
            if not event.is_fixed:
                # Check if this event depends on the delayed one
                if delayed_event_id in event.dependencies or not event.dependencies:
                    if event.scheduled_time:
                        event.scheduled_time += timedelta(minutes=delay_minutes)
                    affected_events.append(event.event_id)

        timeline.last_calculated = datetime.now(timezone.utc)

        logger.info(
            f"Recalculated timeline: {delayed_event_id} delayed by {delay_minutes}min, "
            f"affecting {len(affected_events)} events"
        )

        return timeline

    async def save_timeline(self, timeline: JourneyTimeline) -> bool:
        """
        Save timeline to persistent storage.
        
        Args:
            timeline: Timeline to save
            
        Returns:
            True if saved successfully
        """
        if not self._persistence:
            logger.warning("No persistence layer configured")
            return False
        
        try:
            return await self._persistence.save_timeline(timeline)
        except Exception as e:
            logger.error(f"Failed to save timeline {timeline.journey_id}: {e}")
            return False
    
    async def load_timeline(self, journey_id: str) -> Optional[JourneyTimeline]:
        """
        Load timeline from persistent storage.
        
        Args:
            journey_id: Journey ID
            
        Returns:
            Timeline if found, None otherwise
        """
        if not self._persistence:
            logger.warning("No persistence layer configured")
            return None
        
        try:
            return await self._persistence.load_timeline(journey_id)
        except Exception as e:
            logger.error(f"Failed to load timeline {journey_id}: {e}")
            return None

    def build_journey_timeline(
        self,
        flight_departure: datetime,
        flight_arrival: datetime,
        hotel_checkin: datetime,
        hotel_checkout: datetime,
        return_flight_departure: datetime,
        return_flight_arrival: datetime,
        is_international: bool = True,
        travel_to_airport_minutes: int = 45,
        airport_code: Optional[str] = None,
        user_risk_tolerance: str = "normal"
    ) -> JourneyTimeline:
        """
        Build a complete journey timeline.
        """
        events = []
        event_counter = 0

        def add_event(event_type, name, time, duration=0, location=None, segment=None, is_fixed=False, deps=None):
            nonlocal event_counter
            event_counter += 1
            events.append(TimelineEvent(
                event_id=f"evt_{event_counter}",
                event_type=event_type,
                name=name,
                scheduled_time=time,
                estimated_duration_minutes=duration,
                location=location,
                segment=segment,
                is_fixed=is_fixed,
                dependencies=deps or []
            ))
            return f"evt_{event_counter}"

        # Calculate departure time
        departure_calc = self.calculate_departure_time(
            flight_departure,
            travel_to_airport_minutes,
            is_international
        )

        # Outbound journey events
        dep_id = add_event(
            EventType.DEPARTURE,
            "Leave for airport",
            departure_calc["recommended_departure"],
            travel_to_airport_minutes,
            segment="home_to_airport"
        )

        airport_arrival = departure_calc["ideal_airport_arrival"]
        arr_id = add_event(
            EventType.ARRIVAL,
            "Arrive at airport",
            airport_arrival,
            segment="airport_to_flight",
            deps=[dep_id]
        )

        checkin_id = add_event(
            EventType.CHECKIN,
            "Check-in",
            airport_arrival,
            20,
            segment="airport_to_flight",
            deps=[arr_id]
        )

        security_id = add_event(
            EventType.SECURITY,
            "Security",
            airport_arrival + timedelta(minutes=25),
            30,
            segment="airport_to_flight",
            deps=[checkin_id]
        )

        boarding_id = add_event(
            EventType.BOARDING,
            "Boarding",
            flight_departure - timedelta(minutes=30),
            30,
            segment="airport_to_flight",
            is_fixed=True
        )

        flight_id = add_event(
            EventType.FLIGHT,
            "Flight",
            flight_departure,
            int((flight_arrival - flight_departure).total_seconds() / 60),
            segment="airport_to_flight",
            is_fixed=True
        )

        # Arrival events
        arrival_calc = self.calculate_arrival_eta(
            flight_arrival,
            is_international
        )

        if is_international:
            add_event(
                EventType.IMMIGRATION,
                "Immigration",
                flight_arrival + timedelta(minutes=20),
                45,
                segment="flight_to_hotel"
            )

        add_event(
            EventType.BAGGAGE,
            "Baggage claim",
            flight_arrival + timedelta(minutes=65 if is_international else 20),
            25,
            segment="flight_to_hotel"
        )

        add_event(
            EventType.TRANSFER,
            "Transfer to hotel",
            arrival_calc["estimated_arrival"] - timedelta(minutes=30),
            30,
            segment="flight_to_hotel"
        )

        add_event(
            EventType.HOTEL_CHECKIN,
            "Hotel check-in",
            hotel_checkin,
            15,
            segment="flight_to_hotel"
        )

        # Return journey events
        add_event(
            EventType.HOTEL_CHECKOUT,
            "Hotel check-out",
            hotel_checkout,
            15,
            segment="return"
        )

        return_dep_calc = self.calculate_departure_time(
            return_flight_departure,
            travel_to_airport_minutes,
            is_international
        )

        add_event(
            EventType.DEPARTURE,
            "Leave hotel for airport",
            return_dep_calc["recommended_departure"],
            travel_to_airport_minutes,
            segment="return"
        )

        add_event(
            EventType.FLIGHT,
            "Return flight",
            return_flight_departure,
            int((return_flight_arrival - return_flight_departure).total_seconds() / 60),
            segment="return",
            is_fixed=True
        )

        add_event(
            EventType.ARRIVAL,
            "Arrive home",
            return_flight_arrival + timedelta(minutes=60),
            segment="return"
        )

        # Calculate total duration
        total_hours = (return_flight_arrival - flight_departure).total_seconds() / 3600

        return JourneyTimeline(
            events=events,
            total_duration_hours=total_hours,
            departure_date=flight_departure,
            return_date=return_flight_arrival,
            last_calculated=datetime.now(timezone.utc),
            confidence=0.8
        )

    def convert_to_phase1_timeline(self, internal_timeline: JourneyTimeline) -> Phase1Timeline:
        """
        Convert the internal Timeline dataclass to the Phase 1 Foundation model.
        """
        milestones = []
        for event in internal_timeline.events:
            milestones.append(Milestone(
                name=event.name,
                expected_time=event.scheduled_time,
                completed=event.completed
            ))
            
        return Phase1Timeline(
            milestones=milestones,
            last_updated=internal_timeline.last_calculated or datetime.now(timezone.utc)
        )
