"""
Phase 6: Journey Orchestrator

This module provides the top-level orchestration for the entire journey.
It coordinates between background monitoring, specific segment orchestrators,
and the user interface.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .phase_1_foundation import (
    Journey, 
    JourneySegment, 
    JourneyStatus, 
    SegmentStatus,
    JourneyStateManager,
    Recommendation
)
from .phase_2_context_monitoring import ContextMonitor, MonitoringType
from .phase_3_segment_orchestrators import (
    InspirationOrchestrator,
    HomeToAirportOrchestrator,
    AirportToFlightOrchestrator,
    FlightToHotelOrchestrator,
    HotelToActivitiesOrchestrator,
    ReturnJourneyOrchestrator,
    OrchestratorResult
)
from .message_dispatcher import MessageDispatcher
from server.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level singleton registry.
# Set by main.py lifespan via set_journey_singletons() before any requests.
# Used by _create_journey_node (inside LangGraph) to access the app's real
# JourneyStateManager (with MongoDB) and ContextMonitor (with WebSocket).
# ---------------------------------------------------------------------------
_state_manager_ref: Optional[JourneyStateManager] = None
_context_monitor_ref: Optional[ContextMonitor] = None


def set_journey_singletons(state_manager: JourneyStateManager, context_monitor: ContextMonitor):
    """Inject the app's singleton managers so LangGraph nodes can use them."""
    global _state_manager_ref, _context_monitor_ref
    _state_manager_ref = state_manager
    _context_monitor_ref = context_monitor
    logger.info("Journey singletons registered (state_manager + context_monitor)")


from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

class JourneyOrchestratorState(TypedDict):
    """State for the journey orchestrator graph."""
    messages: Annotated[list[BaseMessage], add_messages]
    journey_context: Optional[Dict[str, Any]]
    segment_data: Optional[Dict[str, Any]]


class JourneyOrchestrator:
    # ... existing methods ...
    def __init__(
        self,
        state_manager: Optional[JourneyStateManager] = None,
        context_monitor: Optional[ContextMonitor] = None,
        websocket_manager: Optional[Any] = None
    ):
        """Initialize the journey orchestrator."""
        self.state_manager = state_manager or JourneyStateManager()
        self.context_monitor = context_monitor or ContextMonitor()
        self.ws_manager = websocket_manager or ws_manager
        
        # Initialize segment orchestrators
        self.orchestrators = {
            JourneySegment.INSPIRATION: InspirationOrchestrator(),
            JourneySegment.HOME_TO_AIRPORT: HomeToAirportOrchestrator(),
            JourneySegment.AIRPORT_TO_FLIGHT: AirportToFlightOrchestrator(),
            JourneySegment.FLIGHT_TO_HOTEL: FlightToHotelOrchestrator(),
            JourneySegment.HOTEL_TO_ACTIVITIES: HotelToActivitiesOrchestrator(),
            JourneySegment.RETURN: ReturnJourneyOrchestrator(),
        }

        # Initialize Message Dispatcher
        self.message_dispatcher = MessageDispatcher(
            state_manager=self.state_manager,
            websocket_manager=self.ws_manager
        )

    async def initialize_journey(self, user_id: str, intent: str) -> Dict[str, Any]:
        """Start a new journey based on user intent."""
        journey = self.state_manager.initialize_journey(user_id)
        logger.info(f"Initialized new journey {journey.journey_id} for user {user_id}")
        
        # Start monitoring with defaults
        await self.context_monitor.start_monitoring(
            journey.journey_id, 
            monitoring_types=[MonitoringType.LOCATION]
        )
        
        return {"journey_id": journey.journey_id, "status": journey.status}

    async def resume_active_journeys(self) -> None:
        """Detect and resume monitoring for all active journeys."""
        logger.info("Resuming active journey monitoring loops...")

    async def handle_user_message(
        self, 
        journey_id: str, 
        message: str
    ) -> OrchestratorResult:
        """Process a user message in the context of an active journey."""
        journey = self.state_manager.get_journey(journey_id)
        if not journey:
            raise ValueError(f"Journey {journey_id} not found")
        
        segment = journey.current_segment
        orchestrator = self.orchestrators.get(segment)
        
        if not orchestrator:
            return OrchestratorResult(
                segment_name=segment.value,
                success=False,
                error=f"No orchestrator implemented for segment {segment}"
            )

        # Inject latest monitoring and journey fields into journey_context
        ctx = journey.context
        journey_context = dict(ctx.model_dump() if hasattr(ctx, "model_dump") else ctx.dict())
        journey_context["journey_id"] = journey_id
        journey_context["user_id"] = journey.user_id
        journey_context["saved_flights"] = journey.saved_flights
        journey_context["booked_flights"] = journey.booked_flights
        journey_context["metadata"] = journey.metadata
        if self.context_monitor:
            try:
                latest = self.context_monitor.get_latest_context(journey_id)
                if latest:
                    monitoring: Dict[str, Any] = {}
                    for mtype, update in latest.items():
                        if update and getattr(update, "success", True):
                            monitoring[mtype.value] = getattr(update, "data", None)
                    if monitoring:
                        journey_context["monitoring"] = monitoring
                        logger.debug(
                            f"Injected monitoring for journey {journey_id}: {list(monitoring.keys())}"
                        )
                await self.context_monitor.sync_monitoring_to_segment(journey_id, segment)
            except Exception as e:
                logger.warning(f"Monitoring injection in handle_user_message failed: {e}")

        # Execute the segment orchestration
        result = await orchestrator.execute(
            journey_context=journey_context,
            user_message=message
        )
        
        # Handle transitions if recommended
        if result.should_transition and result.next_segment:
            logger.info(f"Transitioning journey {journey_id} from {segment} to {result.next_segment}")
            target_segment = JourneySegment(result.next_segment)
            self.state_manager.transition_segment(journey_id, segment, target_segment)
            
        # Dispatch messages from result
        messages = getattr(result, "messages", [])
        if messages:
            await self.message_dispatcher.dispatch_many(journey_id, messages)

        return result

    async def handle_context_update(self, journey_id: str, update_type: str, data: Dict[str, Any]) -> None:
        """Process a context update from background monitoring."""
        logger.info(f"Processing context update for {journey_id}: {update_type}")
        
        # 1. Update context in state manager
        self.state_manager.update_context(journey_id, {update_type: data})
        
        # 2. Trigger current segment orchestrator for smart recommendations
        journey = self.state_manager.get_journey(journey_id)
        if not journey:
            return

        segment = journey.current_segment
        orchestrator = self.orchestrators.get(segment)
        if not orchestrator:
            return

        try:
            # Build journey_context for orchestrator
            ctx = journey.context
            journey_context = dict(ctx.model_dump() if hasattr(ctx, "model_dump") else ctx.dict())
            journey_context["journey_id"] = journey_id
            journey_context["user_id"] = journey.user_id
            journey_context["saved_flights"] = journey.saved_flights
            journey_context["booked_flights"] = journey.booked_flights
            journey_context["metadata"] = journey.metadata
            
            # Inject latest monitoring (including the one just received)
            latest = self.context_monitor.get_latest_context(journey_id)
            if latest:
                monitoring: Dict[str, Any] = {}
                for mtype, update in latest.items():
                    if update and update.success:
                        monitoring[mtype.value] = update.data
                journey_context["monitoring"] = monitoring

            # Execute the orchestrator (passing user_message=None triggers monitoring paths)
            result = await orchestrator.execute(
                journey_context=journey_context,
                user_message=None
            )

            if result.should_transition and result.next_segment:
                logger.info(
                    f"Context update transitioning journey {journey_id} from {segment} to {result.next_segment}"
                )
                target_segment = JourneySegment(result.next_segment)
                self.state_manager.transition_segment(journey_id, segment, target_segment)
                journey = self.state_manager.get_journey(journey_id) or journey

            # 3. Broadcast new recommendations if they exist
            if result.success and self.ws_manager:
                # Use recommendations from result if present (added to OrchestratorResult)
                recs = getattr(result, "recommendations", [])
                if not recs and "recommendations" in result.final_state:
                    recs = result.final_state["recommendations"]
                
                if recs:
                    existing_keys = {
                        (
                            getattr(existing, "type", None),
                            getattr(existing, "title", None),
                            getattr(existing, "content", None),
                        )
                        for existing in (journey.recommendations or [])
                    }
                    deduped_recs = []
                    for rec in recs:
                        rec_obj = rec if isinstance(rec, Recommendation) else Recommendation(**rec)
                        rec_key = (rec_obj.type, rec_obj.title, rec_obj.content)
                        if rec_key in existing_keys:
                            continue
                        existing_keys.add(rec_key)
                        deduped_recs.append(rec_obj)

                    recs = deduped_recs

                if recs:
                    # 3a. Persist to journey state
                    for r in recs:
                        journey.recommendations.append(r if isinstance(r, Recommendation) else Recommendation(**r))
                    self.state_manager._persist_journey(journey)
                    
                    # 3b. Broadcast to active WebSockets for this journey
                    await self.ws_manager.broadcast_to_journey(journey_id, {
                        "type": "recommendations",
                        "journey_id": journey_id,
                        "recommendations": [r.dict() if hasattr(r, "dict") else r for r in recs]
                    })
                    logger.info(f"Broadcasted and persisted {len(recs)} smart recommendations for journey {journey_id}")
                
                # 4. Dispatch JourneyMessages (new unified system)
                messages = getattr(result, "messages", [])
                if messages:
                    await self.message_dispatcher.dispatch_many(journey_id, messages)
        except Exception as e:
            logger.error(f"Failed to process smart recommendation for context update: {e}")

    async def stop_orchestration(self, journey_id: str) -> None:
        """Stop background processes for a journey."""
        await self.context_monitor.stop_monitoring(journey_id)
        logger.info(f"Stopped orchestration for journey {journey_id}")

def create_journey_orchestrator() -> JourneyOrchestrator:
    """Factory function."""
    return JourneyOrchestrator()

# --- LangGraph Integration ---

# Import the compiled segment graphs
from .phase_3_segment_orchestrators.segments.inspiration import create_inspiration_graph
from .phase_3_segment_orchestrators.segments.home_to_airport import create_home_to_airport_graph
from .phase_3_segment_orchestrators.segments.airport_to_flight import create_airport_to_flight_graph
from .phase_3_segment_orchestrators.segments.flight_to_hotel import create_flight_to_hotel_graph
from .phase_3_segment_orchestrators.segments.hotel_to_activities import create_hotel_to_activities_graph
from .phase_3_segment_orchestrators.segments.return_journey import create_return_journey_graph

def _extract_user_context(messages: list) -> Dict[str, Any]:
    """Extract user data from the SystemMessage injected by routes.py."""
    from langchain_core.messages import SystemMessage as SM
    import json as _json

    user_context: Dict[str, Any] = {}
    for msg in messages:
        if not isinstance(msg, SM):
            continue
        content = getattr(msg, "content", "")
        if "User Context:" not in content:
            continue
        for line in content.splitlines():
            line = line.strip()
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key == "user_data_full":
                try:
                    user_context["user_data"] = _json.loads(value)
                except Exception:
                    pass
            elif key in ("user_id", "username", "email", "firstName", "lastName",
                         "phone", "location_lat", "location_lon", "location_city", "journey_id", "conversation_id"):
                user_context[key] = value
        break  # only parse the first User Context message
    return user_context


async def segment_router_node(state: JourneyOrchestratorState) -> Dict[str, Any]:
    """Determines which segment orchestrator to run and injects user + monitoring context."""
    messages = state.get("messages", [])

    # Extract user data from the SystemMessage and build journey_context
    user_context = _extract_user_context(messages)
    journey_context = state.get("journey_context") or {}
    journey_context.update(user_context)

    # Use user preferences if available
    user_data = user_context.get("user_data", {})
    prefs = user_data.get("preferences", {})
    if prefs:
        journey_context["user_preferences"] = prefs

    location = {}
    if user_context.get("location_lat") and user_context.get("location_lon"):
        location["lat"] = user_context["location_lat"]
        location["lon"] = user_context["location_lon"]
    if user_context.get("location_city"):
        location["city"] = user_context["location_city"]
    if location:
        journey_context["user_location"] = location

    # --- Phase 2 monitoring integration ---
    # Inject latest monitoring data so downstream segment nodes can use cached
    # real-time data (traffic, weather, flight status, etc.) instead of making
    # redundant one-off API calls.
    #
    # Strategy:
    #   1. Fast path — read from in-memory dict (populated by background pollers)
    #   2. Fallback  — vector search on ai_messages (persisted + embedded by
    #      ContextMonitor._embed_to_messages) for durability across restarts
    journey_id = journey_context.get("journey_id")
    if journey_id and _state_manager_ref:
        journey = _state_manager_ref.get_journey(journey_id)
        if journey:
            journey_context["saved_flights"] = journey.saved_flights
            journey_context["metadata"] = journey.metadata

        monitoring: Dict[str, Any] = {}

        # --- 1. In-memory fast path ---
        if _context_monitor_ref:
            try:
                latest = _context_monitor_ref.get_latest_context(journey_id)
                if latest:
                    for mtype, update in latest.items():
                        if update and update.success:
                            monitoring[mtype.value] = update.data
            except Exception as e:
                logger.warning(f"In-memory monitoring read failed: {e}")

        # --- 2. Vector search fallback (persistent, embedded in ai_messages) ---
        if not monitoring and _state_manager_ref:
            try:
                journey = _state_manager_ref.get_journey(journey_id)
                conv_id = getattr(journey, "conversation_id", None) if journey else None
                if conv_id:
                    from server.helpers import monitoring_vector_search
                    hits = monitoring_vector_search(conv_id)
                    # De-duplicate by monitoring_type, keeping the most recent
                    seen_types: Dict[str, Any] = {}
                    for hit in hits:
                        mtype = hit.get("monitoring_type")
                        mdata = hit.get("monitoring_data")
                        if mtype and mdata and mtype not in seen_types:
                            seen_types[mtype] = mdata
                    if seen_types:
                        monitoring = seen_types
                        logger.info(
                            f"Retrieved monitoring via vector search for journey "
                            f"{journey_id}: {list(monitoring.keys())}"
                        )
            except ImportError:
                pass  # server.helpers not available (e.g., standalone test)
            except Exception as e:
                logger.warning(f"Vector search monitoring fallback failed: {e}")

        if monitoring:
            journey_context["monitoring"] = monitoring
            logger.debug(
                f"Injected monitoring data for journey {journey_id}: "
                f"{list(monitoring.keys())}"
            )

        # Sync monitoring types to the current segment (adjusts which
        # background pollers are active based on where the user is).
        if _context_monitor_ref and _state_manager_ref:
            try:
                journey = _state_manager_ref.get_journey(journey_id)
                if journey:
                    await _context_monitor_ref.sync_monitoring_to_segment(
                        journey_id, journey.current_segment
                    )
            except Exception as e:
                logger.warning(f"Monitoring sync failed: {e}")

    return {
        "journey_context": journey_context,
        "segment_data": state.get("segment_data") or {},
    }


def route_segments(state: JourneyOrchestratorState) -> str:
    """Conditional logic to route between segment nodes.
    Uses journey.current_segment when journey_id is in context and state_manager is available.
    """
    journey_context = state.get("journey_context") or {}
    journey_id = journey_context.get("journey_id")
    if journey_id and _state_manager_ref:
        try:
            journey = _state_manager_ref.get_journey(journey_id)
            if journey and journey.current_segment is not None:
                return journey.current_segment.value
        except Exception as e:
            logger.warning(f"route_segments: could not get journey {journey_id}: {e}")
    return "inspiration"

# Create the multi-node graph
workflow = StateGraph(JourneyOrchestratorState)

# Add nodes - using compiled subgraphs
workflow.add_node("segment_router", segment_router_node)
workflow.add_node("inspiration_orchestrator", create_inspiration_graph())
workflow.add_node("home_to_airport_orchestrator", create_home_to_airport_graph())
workflow.add_node("airport_to_flight_orchestrator", create_airport_to_flight_graph())
workflow.add_node("flight_to_hotel_orchestrator", create_flight_to_hotel_graph())
workflow.add_node("hotel_to_activities_orchestrator", create_hotel_to_activities_graph())
workflow.add_node("return_journey_orchestrator", create_return_journey_graph())

# Set entry point
workflow.set_entry_point("segment_router")

# Add conditional edges from router to all segments
workflow.add_conditional_edges(
    "segment_router",
    route_segments,
    {
        "inspiration": "inspiration_orchestrator",
        "home_to_airport": "home_to_airport_orchestrator",
        "airport_to_flight": "airport_to_flight_orchestrator",
        "flight_to_hotel": "flight_to_hotel_orchestrator",
        "hotel_to_activities": "hotel_to_activities_orchestrator",
        "return": "return_journey_orchestrator",
    }
)

# After any segment, go to end (simplification for visualization)
for segment in [
    "inspiration_orchestrator", "home_to_airport_orchestrator", 
    "airport_to_flight_orchestrator", "flight_to_hotel_orchestrator",
    "hotel_to_activities_orchestrator", "return_journey_orchestrator"
]:
    workflow.add_edge(segment, END)

# Compile as 'graph' for use in router
graph = workflow.compile(name="Journey_Workflow")
