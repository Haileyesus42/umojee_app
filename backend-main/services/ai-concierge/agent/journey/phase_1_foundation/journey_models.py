"""
Phase 1: Journey Data Models

This module defines the core data models for journey management.
These are MongoDB document schemas that will be used throughout the system.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field
import uuid


def _now_utc() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


class JourneySegment(str, Enum):
    """Enum for the 6 journey segments."""
    INSPIRATION = "inspiration"
    HOME_TO_AIRPORT = "home_to_airport"
    AIRPORT_TO_FLIGHT = "airport_to_flight"
    FLIGHT_TO_HOTEL = "flight_to_hotel"
    HOTEL_TO_ACTIVITIES = "hotel_to_activities"
    RETURN = "return"


class JourneyStatus(str, Enum):
    """Overall journey status."""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RiskLevel(str, Enum):
    """Risk level indicators."""
    ON_TRACK = "on_track"
    WATCH = "watch"
    ACTION_NEEDED = "action_needed"


class SegmentStatus(str, Enum):
    """Status of individual segments."""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class LocationContext(BaseModel):
    """Location information for context tracking."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
    detected_at: Optional[datetime] = None


class WeatherContext(BaseModel):
    """Weather information for context tracking."""
    condition: Optional[str] = None  # sunny, rainy, cloudy, etc.
    temperature_celsius: Optional[float] = None
    humidity: Optional[float] = None
    forecast: Optional[List[Dict[str, Any]]] = None


class TrafficContext(BaseModel):
    """Traffic information for context tracking."""
    conditions: Optional[str] = None  # light, moderate, heavy
    eta_impact_minutes: Optional[int] = None
    last_updated: Optional[datetime] = None


class FlightStatusContext(BaseModel):
    """Flight status for context tracking."""
    flight_number: Optional[str] = None
    status: Optional[str] = None  # on_time, delayed, cancelled, booked
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    gate: Optional[str] = None
    delay_minutes: Optional[int] = None
    # Enriched booking fields (populated from webhook)
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    airline: Optional[str] = None
    booking_reference: Optional[str] = None
    provider: Optional[str] = None
    provider_order_id: Optional[str] = None
    amadeus_order_id: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None


class EnergyLevel(str, Enum):
    """User's energy level tracking."""
    FRESH = "fresh"
    MODERATE = "moderate"
    TIRED = "tired"


class BudgetComfort(str, Enum):
    """Budget comfort framing."""
    COMFORTABLE = "comfortable"
    STRETCH = "stretch"
    PREMIUM = "premium"


class JourneyContext(BaseModel):
    """
    Multi-factor context object that tracks all relevant journey factors.
    This is the core context that gets updated continuously.
    """
    model_config = ConfigDict(validate_assignment=True)

    location: Optional[LocationContext] = None
    current_time: Optional[datetime] = None
    timezone: Optional[str] = None
    weather: Optional[WeatherContext] = None
    traffic: Optional[TrafficContext] = None
    flight_status: Optional[FlightStatusContext] = None
    airport_code: Optional[str] = None
    energy_level: EnergyLevel = EnergyLevel.FRESH
    budget_comfort: BudgetComfort = BudgetComfort.COMFORTABLE

    # fields populated at journey creation by the UI
    planned_destination: Optional[str] = None
    budget: Optional[Dict[str, Any]] = None
    departure_city: Optional[str] = None
    departure_airport_code: Optional[str] = None   # IATA code e.g. "JFK"
    destination_airport_code: Optional[str] = None  # IATA code e.g. "FCO"
    travelers_count: Optional[int] = None
    planned_departure_date: Optional[str] = None  # ISO date string e.g. "2026-03-15"
    duration_days: Optional[int] = None

    # Waypoints for location-based triggers (TRIGGER_RULES_SEGMENTS_PHASES.md)
    departure_airport_lat: Optional[float] = None
    departure_airport_lon: Optional[float] = None
    hotel_lat: Optional[float] = None
    hotel_lon: Optional[float] = None
    home_lat: Optional[float] = None
    home_lon: Optional[float] = None
    return_airport_lat: Optional[float] = None
    return_airport_lon: Optional[float] = None

    # Idempotency: track sent notifications to avoid duplicates (TRIGGER_RULES §6)
    sent_notifications: Optional[Dict[str, str]] = None  # event_type -> ISO timestamp


class Milestone(BaseModel):
    """A milestone within a segment."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    completed: bool = False
    completed_at: Optional[datetime] = None


class SegmentState(BaseModel):
    """
    State for an individual journey segment.
    Each segment has its own context and milestones.
    """
    segment_type: JourneySegment
    status: SegmentStatus = SegmentStatus.PENDING
    context: Optional[Dict[str, Any]] = None  # Segment-specific context
    risk_level: RiskLevel = RiskLevel.ON_TRACK
    milestones: List[Milestone] = Field(default_factory=list)
    activated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def activate(self) -> None:
        """Activate this segment."""
        self.status = SegmentStatus.ACTIVE
        self.activated_at = _now_utc()

    def complete(self) -> None:
        """Mark this segment as complete."""
        self.status = SegmentStatus.COMPLETED
        self.completed_at = _now_utc()

    def add_milestone(self, name: str, description: Optional[str] = None) -> Milestone:
        """Add a new milestone to this segment."""
        milestone = Milestone(name=name, description=description)
        self.milestones.append(milestone)
        return milestone

    def complete_milestone(self, milestone_id: str) -> bool:
        """Mark a milestone as complete."""
        for milestone in self.milestones:
            if milestone.id == milestone_id:
                milestone.completed = True
                milestone.completed_at = _now_utc()
                return True
        return False


class TimelineEvent(BaseModel):
    """An event in the journey timeline."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    segment: JourneySegment
    event_type: str
    scheduled_time: datetime
    description: str
    location: Optional[str] = None
    completed: bool = False


class JourneyTimeline(BaseModel):
    """
    Calculated journey timeline with all scheduled events.
    This gets recalculated when context changes.
    """
    events: List[TimelineEvent] = Field(default_factory=list)
    departure_from_home: Optional[datetime] = None
    arrival_at_airport: Optional[datetime] = None
    flight_departure: Optional[datetime] = None
    flight_arrival: Optional[datetime] = None
    hotel_check_in: Optional[datetime] = None
    hotel_check_out: Optional[datetime] = None
    return_flight_departure: Optional[datetime] = None
    arrival_home: Optional[datetime] = None
    last_calculated: Optional[datetime] = None


class MessageType(str, Enum):
    """Types of journey messages."""
    CHAT = "chat"
    RECOMMENDATION = "recommendation"
    ALERT = "alert"
    SYSTEM = "system"


class UIBlockType(str, Enum):
    """Types of UI blocks for rich messages."""
    TEXT = "text"
    WEATHER = "weather"
    TRAFFIC = "traffic"
    MAP = "map"
    ACTION = "action"
    COUNTDOWN = "countdown"


class UIBlock(BaseModel):
    """A rich UI component block."""
    type: UIBlockType
    data: Dict[str, Any]


class MessageAction(BaseModel):
    """An interactive action attached to a message."""
    label: str
    action_type: str  # e.g., "url", "callback", "navigation"
    payload: Dict[str, Any] = Field(default_factory=dict)


class JourneyMessage(BaseModel):
    """
    Unified journey message model for chat, recommendations, and alerts.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType = MessageType.CHAT
    priority: int = 3  # 1 (Low) to 5 (Critical)
    title: Optional[str] = None
    content: str  # Markdown fallback
    blocks: List[UIBlock] = Field(default_factory=list)
    actions: List[MessageAction] = Field(default_factory=list)
    context_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=_now_utc)
    expires_at: Optional[datetime] = None


class Recommendation(BaseModel):
    """
    Structured recommendation generated by an LLM-powered segment orchestrator.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # e.g., "flight", "traffic", "weather", "places", "activity", "logistics"
    title: str
    content: str
    action_url: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=_now_utc)


class Journey(BaseModel):
    """
    Main journey document that stores the complete journey state.
    This is the top-level document stored in MongoDB.
    """
    journey_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    conversation_id: Optional[str] = None
    status: JourneyStatus = JourneyStatus.PLANNING
    current_segment: JourneySegment = JourneySegment.INSPIRATION
    segments: List[SegmentState] = Field(default_factory=list)
    context: JourneyContext = Field(default_factory=JourneyContext)
    timeline: JourneyTimeline = Field(default_factory=JourneyTimeline)
    recommendations: List[Recommendation] = Field(default_factory=list)
    messages: List[JourneyMessage] = Field(default_factory=list)
    # arbitrary metadata dictionary for extensibility (segment history, flags, etc.)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Store flight recommendations saved by the user (candidates, not yet booked)
    saved_flights: List[Dict[str, Any]] = Field(default_factory=list)
    # Store hotel recommendations saved by the user (candidates, not yet booked)
    saved_hotels: List[Dict[str, Any]] = Field(default_factory=list)
    # Store confirmed booked flights (populated by booking webhook; supports multiple bookings)
    booked_flights: List[Dict[str, Any]] = Field(default_factory=list)
    # Store confirmed booked hotels
    booked_hotels: List[Dict[str, Any]] = Field(default_factory=list)
    # Store car recommendations saved by the user
    saved_cars: List[Dict[str, Any]] = Field(default_factory=list)
    # Store confirmed booked cars
    booked_cars: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, **data):
        super().__init__(**data)
        # Initialize segments if not provided
        if not self.segments:
            self._initialize_segments()

    def _initialize_segments(self) -> None:
        """Initialize all segment states."""
        for segment in JourneySegment:
            self.segments.append(SegmentState(segment_type=segment))

    def get_segment(self, segment_type: JourneySegment) -> Optional[SegmentState]:
        """Get a specific segment state."""
        for segment in self.segments:
            if segment.segment_type == segment_type:
                return segment
        return None

    def get_active_segment(self) -> Optional[SegmentState]:
        """Get the currently active segment."""
        for segment in self.segments:
            if segment.status == SegmentStatus.ACTIVE:
                return segment
        return None

    def to_mongo_dict(self) -> Dict[str, Any]:
        """Convert to MongoDB document format."""
        # include metadata in mongo document
        return {
            "_id": self.journey_id,
            "journey_id": self.journey_id,
            "user_id": self.user_id,
            "conversation_id": self.conversation_id,
            "status": self.status.value,
            "current_segment": self.current_segment.value,
            "segments": [s.model_dump() for s in self.segments],
            "context": self.context.model_dump(),
            "timeline": self.timeline.model_dump(),
            "recommendations": [r.model_dump() for r in self.recommendations],
            "messages": [m.model_dump() for m in self.messages],
            "saved_flights": self.saved_flights,
            "saved_hotels": self.saved_hotels,
            "booked_flights": self.booked_flights,
            "booked_hotels": self.booked_hotels,
            "saved_cars": self.saved_cars,
            "booked_cars": self.booked_cars,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_mongo_dict(cls, doc: Dict[str, Any]) -> "Journey":
        """Create Journey from MongoDB document."""
        if doc is None:
            return None
        # ensure journey_id field is set correctly and metadata exists
        doc["journey_id"] = doc.pop("_id", doc.get("journey_id"))
        if "metadata" not in doc or doc.get("metadata") is None:
            doc["metadata"] = {}
        return cls(**doc)
