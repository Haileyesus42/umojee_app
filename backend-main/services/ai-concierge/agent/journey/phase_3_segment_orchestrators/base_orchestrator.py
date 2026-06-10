"""
Phase 3: Base Segment Orchestrator

This module provides the base class for all segment orchestrators.
Each segment orchestrator handles the logic for a specific part of the journey.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Callable, Annotated
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from enum import Enum
import logging

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, AIMessage

# Internal imports keep relative structure to avoid circular dependencies
from ..phase_4_risk_notification.risk_engine import RiskEngine
from ..phase_4_risk_notification.notification_scheduler import NotificationScheduler
from ..phase_5_timeline_intelligence.timeline_calculator import TimelineCalculator
from ..phase_5_timeline_intelligence.intelligence import JourneyIntelligence
from ..phase_5_timeline_intelligence.adaptation_engine import AdaptationEngine
from ..phase_1_foundation.journey_models import (
    Recommendation, 
    JourneyMessage, 
    MessageType, 
    UIBlock, 
    UIBlockType, 
    MessageAction
)
from ..template_manager import get_template_manager
from langchain_groq import ChatGroq
import os
import json

logger = logging.getLogger(__name__)


class NodeStatus(str, Enum):
    """Status of a node execution."""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    SKIPPED = "skipped"


@dataclass
class NodeResult:
    """Result from a node execution."""
    node_name: str
    status: NodeStatus
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    next_node: Optional[str] = None
    should_continue: bool = True


@dataclass
class OrchestratorResult:
    """Result from segment orchestrator execution."""
    segment_name: str
    success: bool
    nodes_executed: List[str] = field(default_factory=list)
    final_state: Dict[str, Any] = field(default_factory=dict)
    response_message: Optional[str] = None
    should_transition: bool = False
    next_segment: Optional[str] = None
    error: Optional[str] = None
    recommendations: List[Recommendation] = field(default_factory=list)
    messages: List[Any] = field(default_factory=list)  # Using Any to avoid circular import if needed, or JourneyMessage


class BaseSegmentOrchestrator(ABC):
    """
    Base class for segment orchestrators.

    Each segment orchestrator implements a series of nodes that execute
    in sequence to handle the segment's responsibilities.
    """

    def __init__(self, segment_name: str):
        """
        Initialize the orchestrator.

        Args:
            segment_name: Name of the segment this orchestrates
        """
        self.segment_name = segment_name
        self._nodes: Dict[str, Callable] = {}
        self._node_order: List[str] = []
        self._state: Dict[str, Any] = {}

        # Initialize Production Engines
        self.risk_engine = RiskEngine()
        self.notification_scheduler = NotificationScheduler()
        self.timeline_calculator = TimelineCalculator()
        self.intelligence = JourneyIntelligence()
        self.adaptation_engine = AdaptationEngine()

        # Initialize LLM for smart recommendations
        model_name = os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-safeguard-20b")
        self.llm = ChatGroq(model=model_name)

        # Initialize Template Manager
        self.template_manager = get_template_manager()

        # Register nodes
        self._register_nodes()

    @abstractmethod
    def _register_nodes(self) -> None:
        """
        Register all nodes for this segment.
        Subclasses must implement this to define their nodes.
        """
        pass

    def register_node(self, name: str, handler: Callable) -> None:
        """
        Register a node with the orchestrator.

        Args:
            name: Node name
            handler: Async function to handle this node
        """
        self._nodes[name] = handler
        self._node_order.append(name)

    async def execute(
        self,
        journey_context: Dict[str, Any],
        user_message: Optional[str] = None
    ) -> OrchestratorResult:
        """
        Execute the segment orchestration.

        Args:
            journey_context: Current journey context
            user_message: Optional user message to process

        Returns:
            OrchestratorResult with execution outcome
        """
        logger.info(f"Executing segment orchestrator: {self.segment_name}")

        # Initialize state
        self._state = {
            "journey_context": journey_context,
            "user_message": user_message,
            "nodes_completed": [],
            "response": None,
            "metadata_updates": {}, # Track updates to journey metadata
        }

        nodes_executed = []
        current_node = self._node_order[0] if self._node_order else None

        try:
            while current_node:
                # Execute node
                result = await self._execute_node(current_node)
                nodes_executed.append(current_node)

                if result.status == NodeStatus.FAILED:
                    return OrchestratorResult(
                        segment_name=self.segment_name,
                        success=False,
                        nodes_executed=nodes_executed,
                        final_state=self._state,
                        error=result.error
                    )

                if not result.should_continue:
                    break

                # Determine next node
                if result.next_node:
                    current_node = result.next_node
                else:
                    # Get next node in order
                    current_idx = self._node_order.index(current_node)
                    if current_idx < len(self._node_order) - 1:
                        current_node = self._node_order[current_idx + 1]
                    else:
                        current_node = None

            # Persist metadata updates if any
            metadata_updates = self._state.get("metadata_updates", {})
            if metadata_updates:
                from ..journey_orchestrator import _state_manager_ref
                journey_id = journey_context.get("journey_id")
                if journey_id and _state_manager_ref:
                    try:
                        journey = _state_manager_ref.get_journey(journey_id)
                        if journey:
                            journey.metadata.update(metadata_updates)
                            _state_manager_ref._persist_journey(journey)
                            logger.info(f"Persisted {len(metadata_updates)} metadata updates for journey {journey_id}")
                    except Exception as e:
                        logger.warning(f"Failed to persist metadata updates: {e}")

            # Check if segment should transition
            should_transition = self._check_completion()

            return OrchestratorResult(
                segment_name=self.segment_name,
                success=True,
                nodes_executed=nodes_executed,
                final_state=self._state,
                response_message=self._state.get("response"),
                should_transition=should_transition,
                next_segment=self._get_next_segment() if should_transition else None
            )

        except Exception as e:
            logger.error(f"Orchestrator error in {self.segment_name}: {e}")
            return OrchestratorResult(
                segment_name=self.segment_name,
                success=False,
                nodes_executed=nodes_executed,
                final_state=self._state,
                error=str(e)
            )

    async def _execute_node(self, node_name: str) -> NodeResult:
        """
        Execute a specific node.

        Args:
            node_name: Name of the node to execute

        Returns:
            NodeResult with execution outcome
        """
        handler = self._nodes.get(node_name)
        if not handler:
            return NodeResult(
                node_name=node_name,
                status=NodeStatus.FAILED,
                error=f"Node not found: {node_name}"
            )

        try:
            result = await handler(self._state)
            self._state["nodes_completed"].append(node_name)
            
            # Collect metadata updates from node results
            if result.data and "metadata_updates" in result.data:
                self._state["metadata_updates"].update(result.data["metadata_updates"])
                
            return result
        except Exception as e:
            logger.error(f"Node {node_name} failed: {e}")
            return NodeResult(
                node_name=node_name,
                status=NodeStatus.FAILED,
                error=str(e)
            )

    @abstractmethod
    def _check_completion(self) -> bool:
        """
        Check if this segment should transition to the next.
        Subclasses must implement this.
        """
        pass

    @abstractmethod
    def _get_next_segment(self) -> str:
        """
        Get the name of the next segment.
        Subclasses must implement this.
        """
        pass

    async def generate_smart_recommendation(
        self,
        recommendation_type: str,
        title: str,
        content_prompt: str,
        context_data: Optional[Dict[str, Any]] = None
    ) -> Recommendation:
        """
        Generate a smart recommendation using the LLM.
        """
        try:
            # Prepare context for the prompt
            context_str = json.dumps(context_data or {}, indent=2)
            
            prompt = f"""
            You are a smart travel assistant. Generate a {recommendation_type} recommendation for the user.
            
            Context:
            {context_str}
            
            Instruction:
            {content_prompt}
            
            Response format:
            Provide a concise, helpful recommendation message.
            """
            
            response = await self.llm.ainvoke(prompt)
            content = response.content
            
            return Recommendation(
                type=recommendation_type,
                title=title,
                content=content,
                context_data=context_data
            )
        except Exception as e:
            logger.error(f"Error generating smart recommendation: {e}")
            return Recommendation(
                type=recommendation_type,
                title=title,
                content=f"Recommended for your journey: {title}",
                context_data=context_data
            )

    async def render_journey_message(
        self,
        template_name: str,
        context_data: Dict[str, Any],
        message_type: MessageType = MessageType.RECOMMENDATION,
        priority: int = 3,
        title: Optional[str] = None,
        blocks: Optional[List[UIBlock]] = None,
        actions: Optional[List[MessageAction]] = None
    ) -> JourneyMessage:
        """
        Render a structured JourneyMessage using the TemplateManager.
        """
        content = self.template_manager.render(template_name, context_data)
        
        return JourneyMessage(
            type=message_type,
            priority=priority,
            title=title,
            content=content,
            blocks=blocks or [],
            actions=actions or [],
            context_data=context_data
        )

    def _format_time(self, dt: Any, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Format a datetime object into a user-friendly local time string.
        Uses context timezone/offset if available, otherwise defaults to +03:00.
        """
        if not dt:
            return "N/A"
            
        if not isinstance(dt, datetime):
            try:
                # Handle cases where dt might be a string or other object
                return str(dt)
            except Exception:
                return "N/A"

        # Apply offset from context if available
        # Default to +03:00 based on current source of truth
        offset_hours = 3
        
        if context:
            # Check for timezone or offset in context
            tz_info = context.get("timezone") or context.get("offset")
            if isinstance(tz_info, (int, float)):
                offset_hours = tz_info
            elif isinstance(tz_info, str):
                # Simple parsing for things like "+03:00" or "UTC+3"
                import re
                match = re.search(r'([+-])(\d+)', tz_info)
                if match:
                    sign = 1 if match.group(1) == "+" else -1
                    offset_hours = sign * int(match.group(2))

        local_tz = timezone(timedelta(hours=offset_hours))
        
        # Convert UTC to local if not already localized
        if dt.tzinfo is None:
            # Assume UTC if no tzinfo
            dt = dt.replace(tzinfo=timezone.utc)
            
        local_dt = dt.astimezone(local_tz)
        return local_dt.strftime("%b %d, %H:%M")

    def get_state(self) -> Dict[str, Any]:
        """Get the current orchestrator state."""
        return self._state.copy()

    def update_state(self, updates: Dict[str, Any]) -> None:
        """Update the orchestrator state."""
        self._state.update(updates)

    def build_graph(self):
        """
        Build a compiled LangGraph from the registered nodes.

        This creates a graph where each registered node becomes a LangGraph node,
        making the orchestrator's internal structure visible in LangSmith.

        Returns:
            Compiled LangGraph
        """
        # Define state type for this segment's graph
        from typing import TypedDict

        class SegmentState(TypedDict):
            """State for segment orchestrator graph."""
            messages: Annotated[list[BaseMessage], add_messages]
            journey_context: Optional[Dict[str, Any]]
            segment_data: Optional[Dict[str, Any]]

        # Create graph builder
        graph_builder = StateGraph(SegmentState)

        # Add each registered node to the graph
        for node_name in self._node_order:
            # Wrap the async node handler to work with LangGraph state
            def create_node_wrapper(name: str, handler: Callable):
                async def node_wrapper(state: SegmentState) -> SegmentState:
                    """Wrapper to execute orchestrator node in LangGraph."""
                    # Get accumulated segment data from previous nodes
                    segment_data = state.get("segment_data", {})

                    # Convert LangGraph state to orchestrator state
                    # Merge segment_data into the orchestrator state so nodes can access previous results
                    orchestrator_state = {
                        "journey_context": state.get("journey_context", {}),
                        "segment_data": segment_data,
                        "user_message": state.get("messages", [])[-1].content if state.get("messages") else "",
                        **segment_data  # Unpack segment_data so nodes can access keys directly
                    }

                    # Execute the node
                    result = await handler(orchestrator_state)

                    # Build response message
                    response_msg = f"[{name}] Status: {result.status.value}"
                    if result.data:
                        response_msg += f" | Data: {result.data}"

                    # Update accumulated segment data with results from this node
                    updated_segment_data = {**segment_data}  # Copy existing data
                    if result.data:
                        updated_segment_data.update(result.data)

                    # Track should_continue so conditional edges can route accordingly
                    updated_segment_data["_should_continue"] = result.should_continue

                    return {
                        "messages": [AIMessage(content=response_msg)],
                        "segment_data": updated_segment_data
                    }

                return node_wrapper

            graph_builder.add_node(
                node_name,
                create_node_wrapper(node_name, self._nodes[node_name])
            )

        # Set entry point to first node
        if self._node_order:
            graph_builder.set_entry_point(self._node_order[0])

            # Add conditional edges: continue to next node or END based on should_continue
            for i in range(len(self._node_order) - 1):
                current = self._node_order[i]
                next_node = self._node_order[i + 1]

                def create_router(nxt: str):
                    def router(state: SegmentState) -> str:
                        segment_data = state.get("segment_data", {})
                        if not segment_data.get("_should_continue", True):
                            return END
                        return nxt
                    return router

                graph_builder.add_conditional_edges(
                    current,
                    create_router(next_node),
                    [next_node, END]
                )

            # Last node always goes to END
            graph_builder.add_edge(self._node_order[-1], END)

        # Compile the graph with a descriptive name
        return graph_builder.compile(name=f"{self.segment_name.title()}_Orchestrator")
