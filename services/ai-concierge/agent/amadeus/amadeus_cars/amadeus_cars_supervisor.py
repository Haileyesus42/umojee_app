# agent/amadeus/amadeus_cars/amadeus_cars_supervisor.py
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

from agent.amadeus.amadeus_cars.amadeus_cars_nodes import (
    amadeus_cars_booking_agent,
    amadeus_cars_recommendation_agent,
)

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

# -------- State --------
class CarsState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Cars_Recommendation", "Cars_Booking", "direct"]]
    forward_from_agent: Optional[Literal["Cars_Recommendation", "Cars_Booking"]]

MessagesState = {"messages": add_messages}

# -------- Valid Targets --------
VALID_CAR_TARGETS = {"Cars_Recommendation", "Cars_Booking", "direct"}

CAR_TARGET_MAPPING = {
    "Amadeus_Cars": "Cars_Recommendation",
    "Amadeus_Flights": "direct",
    "Amadeus_Hotels": "direct",
    "Amadeus_Workflow": "Cars_Recommendation",
    "car_recommendation": "Cars_Recommendation",
    "car_booking": "Cars_Booking",
    "recommendation": "Cars_Recommendation",
    "booking": "Cars_Booking",
    "search": "Cars_Recommendation",
    "book": "Cars_Booking",
    "rent": "Cars_Recommendation",
    "rental": "Cars_Recommendation",
}


def _map_car_target(target: str) -> str:
    """Map a target to a valid car worker node."""
    if not target:
        return "direct"
    if target in VALID_CAR_TARGETS:
        return target
    if target in CAR_TARGET_MAPPING:
        return CAR_TARGET_MAPPING[target]
    # Try lowercase
    target_lower = target.lower()
    for key, val in CAR_TARGET_MAPPING.items():
        if key.lower() == target_lower:
            return val
    # Infer from content
    if any(kw in target_lower for kw in ["book", "reserv", "order", "confirm"]):
        return "Cars_Booking"
    if any(kw in target_lower for kw in ["search", "find", "recommend", "list", "rent"]):
        return "Cars_Recommendation"
    return "Cars_Recommendation"  # Default fallback


# -------- Prompt + Schema --------
CARS_INSTRUCTIONS = """
You are the Amadeus Ground Mobility Supervisor orchestrating this roster of specialists: {members}.
Coordinate vehicle discovery and fulfillment while safeguarding Amadeus policies and delivering concierge-grade guidance.

Operating Principles:
1. Nail down the rental blueprint — pickup/drop-off locations & times, driver age, passengers, vehicle class, equipment, loyalty/corp codes, payment expectations.
2. Send exploratory/comparison work to Cars_Recommendation; request summaries with supplier, class, total price, key inclusions, restrictions.
3. Use Cars_Booking only after the traveler approves a specific offer and you've revalidated availability if timing changed.
4. Handoffs must include offer identifiers, approvals, insurance choices, payment instructions, and constraints (after-hours pickup, one-way surcharges).
5. If inputs are incomplete or inventory is unavailable, pause delegation, seek clarification, and outline safe alternatives (no invented confirmations).
6. Ensure that car recommendations (via Cars_Recommendation) and confirmed bookings (via Cars_Booking) are always persisted to the user's journey context immediately after generation or successful reservation.

CRITICAL - Response Cache Usage:
6. **BEFORE making ANY Amadeus API call** (car search, availability, booking), your specialists MUST check if cached response data exists using the `check_cached_api_response` tool.
7. If cached data is found (cached=True), instruct specialists to USE THE CACHED DATA instead of calling the API again. This saves time and API costs.
8. Only call Amadeus APIs when cached data is NOT available (cached=False) or when fresh data is explicitly required.
9. All API responses are automatically cached for 1 hour and scoped by conversation_id, so repeated similar requests can reuse previous results.

Voice: confident, succinct, concierge-level professionalism; flag blockers quickly and track outstanding traveler decisions. Always prioritize cached data when available to provide instant responses.
"""

SCHEMA_HINT = """
You must return ONLY a JSON object as plain text (do NOT call any tool, do NOT use markdown).

CRITICAL: Your "target" field MUST be EXACTLY one of these values:
- "Cars_Recommendation" (for search, availability, recommendations)
- "Cars_Booking" (for booking, reservation)
- "direct" (for simple questions you can answer directly)

Do NOT use "Amadeus_Cars", "Amadeus_Workflow", or any other values.

JSON schema:
{{
  "target": "Cars_Recommendation" | "Cars_Booking" | "direct",
  "rationale": "string explaining your routing decision",
  "direct_reply": "string (required if target is 'direct')",
  "forward_from_agent": "optional - one of the specialist names if forwarding their response",
  "missing_info_question": "optional - question to ask if info is missing"
}}

Rules:
- Ask for missing info if needed (set "missing_info_question") and still choose the most likely "target".
- If answering directly, set "target":"direct" and include "direct_reply".
- If a sub-agent already produced the exact user-visible text, set "forward_from_agent".
- Output JSON ONLY as plain text (no markdown code blocks, no tool calls).
- IMPORTANT: Do NOT try to call a "json" tool. Just respond with the JSON as plain text.
"""

MAX_CHARS = 10_000_000

def _trim_messages(messages: List[BaseMessage], limit: int = MAX_CHARS) -> List[BaseMessage]:
    if not messages:
        return messages
    sys_first = next((m for m in messages if isinstance(m, SystemMessage)), None)
    tail = [m for m in messages if m is not sys_first][::-1]
    kept, used = [], 0
    for m in tail:
        c = str(getattr(m, "content", ""))
        if used + len(c) > limit:
            break
        kept.append(m); used += len(c)
    kept.reverse()
    if sys_first:
        kept = [sys_first] + kept
    return kept

def _decide(messages: List[BaseMessage]) -> dict:
    sys = SystemMessage(content=CARS_INSTRUCTIONS.format(
        members="Cars_Recommendation, Cars_Booking"
    ))
    schema = SystemMessage(content=SCHEMA_HINT)
    trimmed = _trim_messages(messages)
    out = llm.invoke([sys, schema] + trimmed)
    text = getattr(out, "content", "").strip()
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("Decision must be an object")
        return data
    except Exception:
        return {
            "target": "direct",
            "rationale": "LLM returned non-JSON; responding directly.",
            "direct_reply": text or "Sorry, I couldn’t parse the decision."
        }

# -------- Nodes --------
def cars_supervisor_node(state: CarsState) -> CarsState | Command[CarsState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    raw_target = cast(str, decision.get("target", "direct"))

    # Map target to valid car worker node
    target = _map_car_target(raw_target)
    if target not in VALID_CAR_TARGETS:
        target = "Cars_Recommendation"  # Safe fallback

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    state["route"] = cast(CarsState["route"], target)
    return Command(goto=target, update=state)

def cars_return(state: CarsState) -> CarsState:
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")
    route = state.get("route", "unknown")

    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        return state

    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]
    return state

# -------- Graph wiring --------
graph_builder = StateGraph(CarsState)

graph_builder.add_node("amadeus_cars_supervisor", cars_supervisor_node)
graph_builder.add_node("Cars_Recommendation", amadeus_cars_recommendation_agent)
graph_builder.add_node("Cars_Booking", amadeus_cars_booking_agent)
graph_builder.add_node("amadeus_cars_return", cars_return)

graph_builder.set_entry_point("amadeus_cars_supervisor")


def route_supervisor(state: CarsState) -> str:
    return state.get("route") or "direct"


graph_builder.add_conditional_edges(
    "amadeus_cars_supervisor",
    route_supervisor,
    {
        "Cars_Recommendation": "Cars_Recommendation",
        "Cars_Booking": "Cars_Booking",
        "direct": END,
    },
)

graph_builder.add_edge("Cars_Recommendation", "amadeus_cars_return")
graph_builder.add_edge("Cars_Booking", "amadeus_cars_return")
graph_builder.add_edge("amadeus_cars_return", END)

graph = graph_builder.compile(name="amadeus_cars_Workflow")
