# agent/amadeus/amadeus_hotels/amadeus_hotels_supervisor.py
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

from agent.amadeus.amadeus_hotels.amadeus_hotels_nodes import (
    amadeus_hotels_booking_agent,
    amadeus_hotels_recommendation_agent,
)

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

# -------- State --------
class HotelsState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Hotels_Recommendation", "Hotels_Booking", "direct"]]
    forward_from_agent: Optional[Literal["Hotels_Recommendation", "Hotels_Booking"]]

MessagesState = {"messages": add_messages}

# -------- Valid Targets --------
VALID_HOTEL_TARGETS = {"Hotels_Recommendation", "Hotels_Booking", "direct"}

HOTEL_TARGET_MAPPING = {
    "Amadeus_Hotels": "Hotels_Recommendation",
    "Amadeus_Flights": "direct",
    "Amadeus_Cars": "direct",
    "Amadeus_Workflow": "Hotels_Recommendation",
    "hotel_recommendation": "Hotels_Recommendation",
    "hotel_booking": "Hotels_Booking",
    "recommendation": "Hotels_Recommendation",
    "booking": "Hotels_Booking",
    "search": "Hotels_Recommendation",
    "book": "Hotels_Booking",
}


def _map_hotel_target(target: str) -> str:
    """Map a target to a valid hotel worker node."""
    if not target:
        return "direct"
    if target in VALID_HOTEL_TARGETS:
        return target
    if target in HOTEL_TARGET_MAPPING:
        return HOTEL_TARGET_MAPPING[target]
    # Try lowercase
    target_lower = target.lower()
    for key, val in HOTEL_TARGET_MAPPING.items():
        if key.lower() == target_lower:
            return val
    # Infer from content
    if any(kw in target_lower for kw in ["book", "reserv", "order", "confirm"]):
        return "Hotels_Booking"
    if any(kw in target_lower for kw in ["search", "find", "recommend", "list"]):
        return "Hotels_Recommendation"
    return "Hotels_Recommendation"  # Default fallback


# -------- Prompt + Schema --------
HOTELS_INSTRUCTIONS = """
You are the Amadeus Hotel Services Supervisor orchestrating this roster of specialists: {members}.
Steer accommodation requests, align recommendation and booking workflows, and uphold Amadeus standards.

Operating Principles:
1. Capture stay context early: destination, dates, guests, room mix, budget, loyalty, must-have amenities, payment constraints.
2. Send discovery/comparison/availability to Hotels_Recommendation; request curated shortlists with rate rules and differentiators.
3. Use Hotels_Booking only after the traveler approves a specific offer, pricing/availability is fresh, and payloads include guest profiles + contacts.
4. Handoffs must include offer identifiers, approvals, special requests, and cancellation expectations.
5. If context is missing or coverage is thin, pause delegation, clarify, and respond transparently (no fabricated data).
6. Ensure that confirmed hotel bookings are always persisted to the user's journey context (via Hotels_Booking) immediately after a successful reservation.

CRITICAL - Response Cache Usage:
6. **BEFORE making ANY Amadeus API call** (hotel search, availability, booking), your specialists MUST check if cached response data exists using the `check_cached_api_response` tool.
7. If cached data is found (cached=True), instruct specialists to USE THE CACHED DATA instead of calling the API again. This saves time and API costs.
8. Only call Amadeus APIs when cached data is NOT available (cached=False) or when fresh data is explicitly required.
9. All API responses are automatically cached for 1 hour and scoped by conversation_id, so repeated similar requests can reuse previous results.

Voice: polished, concise, grounded in authentic Amadeus insight; surface blockers early and propose practical next steps. Always prioritize cached data when available to provide instant responses.
"""

SCHEMA_HINT = """
You must return ONLY a JSON object as plain text (do NOT call any tool, do NOT use markdown).

CRITICAL: Your "target" field MUST be EXACTLY one of these values:
- "Hotels_Recommendation" (for search, availability, recommendations)
- "Hotels_Booking" (for booking, reservation)
- "direct" (for simple questions you can answer directly)

Do NOT use "Amadeus_Hotels", "Amadeus_Workflow", or any other values.

JSON schema:
{{
  "target": "Hotels_Recommendation" | "Hotels_Booking" | "direct",
  "rationale": "string explaining your routing decision",
  "direct_reply": "string (required if target is 'direct')",
  "forward_from_agent": "optional - one of the specialist names if forwarding their response",
  "missing_info_question": "optional - question to ask if info is missing"
}}

Rules:
- Ask for missing info if needed ("missing_info_question") and still pick the most likely "target".
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
    sys = SystemMessage(content=HOTELS_INSTRUCTIONS.format(
        members="Hotels_Recommendation, Hotels_Booking"
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
def hotels_supervisor_node(state: HotelsState) -> HotelsState | Command[HotelsState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    raw_target = cast(str, decision.get("target", "direct"))

    # Map target to valid hotel worker node
    target = _map_hotel_target(raw_target)
    if target not in VALID_HOTEL_TARGETS:
        target = "Hotels_Recommendation"  # Safe fallback

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    state["route"] = cast(HotelsState["route"], target)
    return Command(goto=target, update=state)

def hotels_return(state: HotelsState) -> HotelsState:
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
graph_builder = StateGraph(HotelsState)

graph_builder.add_node("amadeus_hotels_supervisor", hotels_supervisor_node)
graph_builder.add_node("Hotels_Recommendation", amadeus_hotels_recommendation_agent)
graph_builder.add_node("Hotels_Booking", amadeus_hotels_booking_agent)
graph_builder.add_node("amadeus_hotels_return", hotels_return)

graph_builder.set_entry_point("amadeus_hotels_supervisor")


def route_supervisor(state: HotelsState) -> str:
    return state.get("route") or "direct"


graph_builder.add_conditional_edges(
    "amadeus_hotels_supervisor",
    route_supervisor,
    {
        "Hotels_Recommendation": "Hotels_Recommendation",
        "Hotels_Booking": "Hotels_Booking",
        "direct": END,
    },
)

graph_builder.add_edge("Hotels_Recommendation", "amadeus_hotels_return")
graph_builder.add_edge("Hotels_Booking", "amadeus_hotels_return")
graph_builder.add_edge("amadeus_hotels_return", END)

graph = graph_builder.compile(name="amadeus_hotels_Workflow")
