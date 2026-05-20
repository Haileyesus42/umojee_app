# agent/amadeus/amadeus_flight/amadeus_flight_supervisor.py
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

from agent.amadeus.amadeus_flight.amadeus_flight_nodes import (
    amadeus_flight_booking_agent,
    amadeus_flight_recommendation_agent,
    amadeus_flight_get_status_agent,
)
from agent.amadeus.amadeus_flight.amadeus_flight_tools import flight_get_flight_image_url

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
print(f"Using GROQ model: {model}")
llm = ChatGroq(model=model)  # adjust default as needed

# ----------------- State -----------------
class FlightState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Flight_Recommendation_By_Amadeus", "Flight_Booking_By_Amadeus", "Flight_Status_By_Amadeus", "direct"]]
    # If set, we will forward the last worker AI message verbatim
    forward_from_agent: Optional[Literal["Flight_Recommendation_By_Amadeus", "Flight_Booking_By_Amadeus", "Flight_Status_By_Amadeus"]]
    # Optional image enrichment request (parsed from supervisor JSON)
    image_enhancement: Optional[dict]  # {"carrier_code": "...", "flight_number": "..."}

MessagesState = {"messages": add_messages}

# ----------------- Valid Targets -----------------
VALID_FLIGHT_TARGETS = {
    "Flight_Recommendation_By_Amadeus",
    "Flight_Booking_By_Amadeus",
    "Flight_Status_By_Amadeus",
    "direct",
}

# Map any domain-level or invalid targets to valid flight worker nodes
FLIGHT_TARGET_MAPPING = {
    # Domain-level mappings
    "Amadeus_Flights": "Flight_Recommendation_By_Amadeus",
    "Amadeus_Hotels": "direct",
    "Amadeus_Cars": "direct",
    "Amadeus_Workflow": "Flight_Recommendation_By_Amadeus",
    "Orchestrator_Workflow": "direct",
    "Umoja_Workflow": "direct",
    # Common variations
    "flight_recommendation": "Flight_Recommendation_By_Amadeus",
    "flight_booking": "Flight_Booking_By_Amadeus",
    "flight_status": "Flight_Status_By_Amadeus",
    "recommendation": "Flight_Recommendation_By_Amadeus",
    "booking": "Flight_Booking_By_Amadeus",
    "status": "Flight_Status_By_Amadeus",
    "search": "Flight_Recommendation_By_Amadeus",
    "book": "Flight_Booking_By_Amadeus",
    "seat": "Flight_Booking_By_Amadeus",
    "seating": "Flight_Booking_By_Amadeus",
}


def _map_flight_target(target: str, task_hint: str = "") -> str:
    """Map a target to a valid flight worker node."""
    if not target:
        return "direct"

    # Already valid
    if target in VALID_FLIGHT_TARGETS:
        return target

    # Check mapping
    if target in FLIGHT_TARGET_MAPPING:
        return FLIGHT_TARGET_MAPPING[target]

    # Try lowercase match
    target_lower = target.lower()
    for key, val in FLIGHT_TARGET_MAPPING.items():
        if key.lower() == target_lower:
            return val

    # Infer from task hint or target content
    hint_lower = (task_hint + " " + target).lower()
    if any(kw in hint_lower for kw in ["book", "reserv", "seat", "order", "confirm"]):
        return "Flight_Booking_By_Amadeus"
    if any(kw in hint_lower for kw in ["status", "delay", "cancel", "gate", "terminal"]):
        return "Flight_Status_By_Amadeus"
    if any(kw in hint_lower for kw in ["search", "find", "recommend", "offer", "price"]):
        return "Flight_Recommendation_By_Amadeus"

    # Default fallback for flight-related tasks
    return "Flight_Recommendation_By_Amadeus"


# ----------------- Prompt & JSON schema -----------------
FLIGHT_INSTRUCTIONS = """
You are the Amadeus Flight Services Supervisor orchestrating this roster of specialists: {members}.
Direct every flight inquiry, ensure critical trip details are captured, and coordinate seamless handoffs across recommendation, fulfillment, and live status monitoring.

Operating Principles:
1. Diagnose traveler objectives (origins, destinations, dates, passenger mix, cabin goals, budget, loyalty markers) before delegating.
2. Route discovery, comparison, or repricing tasks to Flight_Recommendation_By_Amadeus; request concise option summaries with trade-offs.
3. Channel booking, seat selection/reservation, or any servicing actions that mutate reservations to Flight_Booking_By_Amadeus; confirm the traveler has approved a specific offer, repricing is current, and payloads include traveler data plus contacts. For booking, you MUST pass BOTH `user_id` and `conversation_id` from the conversation state to the booking agent/tool; do not ask the traveler for these-retrieve them from context, and halt with a clear request for internal context if either is missing.
4. Dispatch flight status inquiries, day-of-travel updates, or disruption checks to Flight_Status_By_Amadeus; provide carrier code, numeric flight number, travel date, and any known airport details.
5. Before delivering a final traveler-facing message, enhance the response with a flight image URL when appropriate.
6. For every handoff, deliver a crisp mission brief capturing known inputs, open questions, approvals, and constraints. Pull missing context from the traveler instead of allowing specialists to guess, and echo Amadeus limitations transparently.

CRITICAL - Response Cache Usage:
7. **BEFORE making ANY Amadeus API call** (search, pricing, booking, status), your specialists MUST check if cached response data exists using the `check_cached_api_response` tool.
8. If cached data is found (cached=True), instruct specialists to USE THE CACHED DATA instead of calling the API again. This saves time and API costs.
9. Only call Amadeus APIs when cached data is NOT available (cached=False) or when fresh data is explicitly required.
10. All API responses are automatically cached for 1 hour and scoped by conversation_id, so repeated similar requests can reuse previous results.

JOURNEY LINKING & HOTEL SUGGESTIONS (CRITICAL):
11. When routing to Flight_Booking_By_Amadeus, the agent will automatically call `amadeus_save_booked_flight_to_journey`
    after a successful booking to link the confirmed flight to the traveler's journey.
12. **POST-BOOKING HOTELS**: Immediately following a successful flight booking, the booking agent will also fetch hotel suggestions for the arrival destination, present 2 options to the traveler, and call `amadeus_save_hotels_to_journey` to persist them.
13. For this to work, you MUST extract the journey_id from the conversation context (system messages, task_instructions,
    or prior messages) and include it explicitly in your mission brief to Flight_Booking_By_Amadeus.
14. If a journey_id is found, add it to the brief: "journey_id: <id> — use this with amadeus_save_booked_flight_to_journey AND amadeus_save_hotels_to_journey after booking succeeds."
15. If NO journey_id is found anywhere in context, include: "journey_id: not available — skip journey/hotel saving tools and inform the traveler the details were not linked to a journey."
16. Never ask the traveler for their journey_id — it must come from context only.

Voice and Conduct:
- Maintain an authoritative yet concierge-level tone.
- When a booking is successful, expect a `booking_with_hotels` response format from the agent containing both the confirmation and hotel options.
- Keep updates succinct, flag open questions early, and never fabricate inventory, confirmation artifacts, or operational status.
- Stay ready to incorporate new flight capabilities as they become available.
- Never ask the traveler for payment methods or pre-authorizations; bookings are reserved without collecting payment details.
- Always prioritize cached data when available to provide instant responses.
"""

SCHEMA_HINT = """
You must return ONLY a JSON object as plain text (do NOT call any tool, do NOT use markdown).

CRITICAL: Your "target" field MUST be EXACTLY one of these values:
- "Flight_Recommendation_By_Amadeus" (for search, pricing, offers, recommendations)
- "Flight_Booking_By_Amadeus" (for booking, reservation, seat selection)
- "Flight_Status_By_Amadeus" (for flight status, delays, gate info)
- "direct" (for simple questions you can answer directly)

Do NOT use "Amadeus_Flights", "Amadeus_Workflow", or any other values.

JSON schema:
{{
  "target": "Flight_Recommendation_By_Amadeus" | "Flight_Booking_By_Amadeus" | "Flight_Status_By_Amadeus" | "direct",
  "rationale": "string explaining your routing decision",
  "direct_reply": "string (required if target is 'direct')",
  "forward_from_agent": "optional - one of the three specialist names if forwarding their response",
  "missing_info_question": "optional - question to ask if info is missing"
}}

Rules:
- Ask for missing info if needed (set "missing_info_question") and still choose the most likely "target".
- If answering directly, set "target":"direct" and include "direct_reply".
- If a sub-agent already produced the exact user-visible text, set "forward_from_agent" to forward it verbatim.
- Output JSON ONLY as plain text (no markdown code blocks, no tool calls).
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
    sys = SystemMessage(content=FLIGHT_INSTRUCTIONS.format(
        members="Flight_Recommendation_By_Amadeus, Flight_Booking_By_Amadeus, Flight_Status_By_Amadeus"
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

# ----------------- Nodes -----------------
def flight_supervisor_node(state: FlightState) -> FlightState | Command[FlightState]:
    messages = state.get("messages", [])
    decision = _decide(messages)

    # Extract task hint from rationale for better mapping
    task_hint = decision.get("rationale", "")

    # Support either a single `target` or a sequence via `targets`.
    raw_targets = decision.get("targets") or decision.get("target")
    if isinstance(raw_targets, list):
        targets = [str(t) for t in raw_targets]
    elif isinstance(raw_targets, str) and "," in raw_targets:
        targets = [t.strip() for t in raw_targets.split(",") if t.strip()]
    else:
        targets = [raw_targets] if raw_targets is not None else ["direct"]

    # Map all targets to valid flight worker nodes using the comprehensive mapping function
    mapped_targets = []
    for t in targets:
        if t is None:
            continue
        t_str = str(t).strip()
        mapped = _map_flight_target(t_str, task_hint)
        mapped_targets.append(mapped)

    targets = mapped_targets
    target = targets[0] if targets else "direct"

    # Final validation - ensure target is valid
    if target not in VALID_FLIGHT_TARGETS:
        target = "Flight_Recommendation_By_Amadeus"  # Safe fallback

    # Ask for missing info (append as assistant) but still route
    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    # Optional verbatim-forward & image enrichment hints
    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]
    if "image_enhancement" in decision:
        state["image_enhancement"] = decision["image_enhancement"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    # Belt-and-suspenders: ensure goto is never a parent workflow name (Amadeus_Flights, etc.)
    if target not in VALID_FLIGHT_TARGETS:
        target = "Flight_Recommendation_By_Amadeus"

    # If multiple targets provided, store the remainder as a queue
    if len(targets) > 1:
        state["route_queue"] = targets[1:]

    state["route"] = cast(FlightState["route"], target)
    return Command(goto=target, update=state)

def flight_return(state: FlightState) -> FlightState:
    """
    After any sub-agent completes:
    1) If forward flag set, forward worker's last AI message verbatim.
    2) Else, optionally call flight_get_flight_image_url if image_enhancement was requested,
       and append a short wrap-up.
    """
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")
    enrich = state.get("image_enhancement")
    route = state.get("route", "unknown")

    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)

    # 1) Verbatim forwarding
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        # keep image hint for a future turn only if you want; here we clear it
        state["image_enhancement"] = None
        return state

    # 2) Optional image enrichment
    if enrich and isinstance(enrich, dict):
        try:
            # If your tool is a LangChain Tool, prefer .invoke with a dict
            img = flight_get_flight_image_url.invoke({
                "carrier_code": enrich.get("carrier_code", ""),
                "flight_number": enrich.get("flight_number", ""),
            })
            if img:
                state["messages"] = msgs + [
                    AIMessage(content=f"Here’s a flight image: {img}")
                ]
            else:
                state["messages"] = msgs + [
                    AIMessage(content=f"Routed to {route}. (No image available.)")
                ]
        except Exception as e:
            state["messages"] = msgs + [
                AIMessage(content=f"Routed to {route}. (Image lookup failed: {e})")
            ]
        finally:
            state["image_enhancement"] = None
        return state

    # Default wrap-up
    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]
    return state

# ----------------- Graph wiring -----------------
graph_builder = StateGraph(FlightState)

graph_builder.add_node("amadeus_flight_supervisor", flight_supervisor_node)
graph_builder.add_node("Flight_Recommendation_By_Amadeus", amadeus_flight_recommendation_agent)
graph_builder.add_node("Flight_Booking_By_Amadeus", amadeus_flight_booking_agent)
graph_builder.add_node("Flight_Status_By_Amadeus", amadeus_flight_get_status_agent)

graph_builder.set_entry_point("amadeus_flight_supervisor")


def route_supervisor(state: FlightState) -> str:
    route = state.get("route") or "direct"
    # Validate route is valid for this subgraph (parent may pass "Amadeus_Flights")
    if route not in VALID_FLIGHT_TARGETS:
        return _map_flight_target(str(route)) if route else "direct"
    return route


graph_builder.add_conditional_edges(
    "amadeus_flight_supervisor",
    route_supervisor,
    {
        "Flight_Recommendation_By_Amadeus": "Flight_Recommendation_By_Amadeus",
        "Flight_Booking_By_Amadeus": "Flight_Booking_By_Amadeus",
        "Flight_Status_By_Amadeus": "Flight_Status_By_Amadeus",
        "direct": END,
    },
)

for worker in ("Flight_Recommendation_By_Amadeus", "Flight_Booking_By_Amadeus", "Flight_Status_By_Amadeus"):
    graph_builder.add_edge(worker, "amadeus_flight_return")

graph_builder.add_edge("amadeus_flight_return", END)

# Conditional routing: return to supervisor when a queued route exists
def _decide_flight_return_route(state: FlightState) -> str:
    if state.get("route_queue"):
        return "amadeus_flight_supervisor"
    return "end"

graph_builder.add_conditional_edges(
    "amadeus_flight_return",
    _decide_flight_return_route,
    {
        "amadeus_flight_supervisor": "amadeus_flight_supervisor",
        "end": END,
    },
)

# Continue queued routes directly from the return node by popping route_queue
def _maybe_continue_flight_queue(state: FlightState) -> FlightState | Command[FlightState]:
    queue = state.get("route_queue") or []
    if queue:
        next_route = queue.pop(0)
        if queue:
            state["route_queue"] = queue
        else:
            state.pop("route_queue", None)

        # Map the next route to a valid target
        next_route = _map_flight_target(str(next_route))
        if next_route not in VALID_FLIGHT_TARGETS:
            next_route = "Flight_Recommendation_By_Amadeus"

        state["route"] = next_route
        return Command(goto=next_route, update=state)
    return state

# Wrap the original return logic to optionally continue the queue
orig_return = flight_return
def amadeus_flight_return_wrapper(state: FlightState) -> FlightState | Command[FlightState]:
    result = orig_return(state)
    if isinstance(result, Command):
        return result
    return _maybe_continue_flight_queue(result)

# Re-register the wrapped return node so the builder uses it
graph_builder.add_node("amadeus_flight_return", amadeus_flight_return_wrapper)

graph = graph_builder.compile(name="amadeus_flight_Workflow")
