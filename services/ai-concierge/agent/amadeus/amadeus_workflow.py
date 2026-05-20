# agent/amadeus/amadeus_supervisor.py — Auto-trigger existing hotel recommendation node
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

from agent.performance import timer, optimize_messages
from agent.amadeus.amadeus_flight.amadeus_flight_supervisor import graph as amadeus_flight_workflow
from agent.amadeus.amadeus_hotels.amadeus_hotels_supervisor import graph as amadeus_hotels_workflow
from agent.amadeus.amadeus_cars.amadeus_cars_supervisor import graph as amadeus_cars_workflow

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

# -------- State --------
class AmadeusState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Amadeus_Flights", "Amadeus_Hotels", "Amadeus_Cars", "direct"]]
    forward_from_agent: Optional[Literal["Amadeus_Flights", "Amadeus_Hotels", "Amadeus_Cars"]]
    # NEW: Track booking completion and extract details
    flight_booking_completed: Optional[bool]
    flight_booking_details: Optional[dict]
    # Multi-task support
    route_queue: Optional[List[str]]
    tasks_identified: Optional[List[str]]
    task_context: Optional[dict]

MessagesState = {"messages": add_messages}

# -------- Prompt + Schema --------
AMADEUS_INSTRUCTIONS = """
You are the Amadeus Global Services Supervisor orchestrating this federation of domain supervisors: {members}.
Guide travelers through flight, hotel, and ground mobility journeys while ensuring every specialist receives the context required to excel.

ENHANCED CAPABILITIES:
- Smart Tool Selection: Use cached monitoring data when fresh (< 10 min old)
- Result Validation: Suggest alternatives when searches return no results
- Error Handling: Provide user-friendly explanations for API failures
- Comparison Mode: Compare multiple options side-by-side with pros/cons
- Risk Analysis: Calculate delay risk and suggest backup options

MULTI-SERVICE DETECTION PATTERNS:
1. FLIGHT + HOTEL: "fly to X and book hotel" → ["Amadeus_Flights", "Amadeus_Hotels"]
2. FLIGHT + CAR: "fly to X and rent car" → ["Amadeus_Flights", "Amadeus_Cars"]
3. FLIGHT + CAR + HOTEL: "fly + car + hotel to X" → ["Amadeus_Flights", "Amadeus_Cars", "Amadeus_Hotels"]
4. HOTEL + CAR: "hotel and car in Paris" → ["Amadeus_Hotels", "Amadeus_Cars"] (no flight needed)
5. SINGLE SERVICE: "find flights to Paris" → "target": "Amadeus_Flights" (STRING not array)
6. SEAT SELECTION/RESERVATION/SAVING: Always route to "Amadeus_Flights" (handled by Flight_Booking_By_Amadeus or Flight_Recommendation_By_Amadeus)

CRITICAL DEPENDENCY RULE:
- IF user mentions FLIGHTS → ALWAYS put Amadeus_Flights FIRST in targets array
- Why: Cars/hotels need destination and dates from flight results
- Example: ["Amadeus_Flights", "Amadeus_Cars", "Amadeus_Hotels"] ← CORRECT order
- Example: ["Amadeus_Hotels", "Amadeus_Flights"] ← WRONG order

CONTEXT FLOW (Automatic):
Flight completes → Extracts: destination, arrival_date, departure_date, travelers
  ↓ (system handles this)
Car search uses: pickup_location=destination, pickup_date=arrival_date
Hotel search uses: location=destination, checkin=arrival_date, checkout=departure_date, guests=travelers

JOURNEY_ID FOR BOOKING (CRITICAL):
When the task is to BOOK or RESERVE a flight, the booking agent will automatically save the confirmed booking
to the traveler's journey using the journey_id. To make this work:
- Always check if a journey_id is present in the conversation context (system messages or prior messages).
- If journey_id is present: pass it along to Amadeus_Flights — the booking agent will use it automatically.
- If journey_id is NOT present: note it in your task_instructions so the booking agent is aware it cannot
  save to a journey. The orchestrator should have already resolved this before reaching here; if not, proceed
  with the booking and inform the traveler the flight was not linked to a journey.
- For SEARCH-only requests (no booking intent): journey_id is not required.

Operating Principles:
1. ANALYZE: Does request mention flights, cars, AND/OR hotels?
2. COUNT: How many services? (1, 2, or 3)
3. DECOMPOSE: If 2+, create targets array with services in dependency order
4. SINGLE: If 1 service, use "target" string (not array)
5. CONTEXT: Clarify any missing details (dates, locations, travelers, budgets)
6. JOURNEY_ID: For booking tasks, extract journey_id from context and include in task_instructions
7. AUTOMATIC CHAINING: Flight details flow to cars/hotels automatically (you don't need to ask user again)
8. APPROVAL: Before booking, confirm traveler approval and validate pricing
9. TRANSPARENCY: If Amadeus lacks coverage, state limitations clearly, suggest alternatives
10. NO PAYMENT: Never request payment methods; bookings are reserved without payment details

Voice: Confident, concise, concierge-level professionalism.

EXAMPLES:
User: "Book flight NYC to Paris on Jan 25, need rental car at CDG"
→ {{"targets": ["Amadeus_Flights", "Amadeus_Cars"], "tasks_identified": ["search flights", "rent car"], "rationale": "2 services: flights first (cars need arrival info)"}}

User: "Find hotels in London near Big Ben"
→ {{"target": "Amadeus_Hotels", "rationale": "Single service: hotel search"}}

User: "Complete travel package to Tokyo: flight, car, hotel"
→ {{"targets": ["Amadeus_Flights", "Amadeus_Cars", "Amadeus_Hotels"], "tasks_identified": ["search flights", "rent car", "book hotel"], "rationale": "3 services: flights first, then cars/hotels"}}

User: "I want to reserve a seat on my flight"
→ {{"target": "Amadeus_Flights", "rationale": "Single service: seat reservation handled by Flight_Booking_By_Amadeus"}}

User: "Save these flights to my journey"
→ {{"target": "Amadeus_Flights", "rationale": "Single service: saving flights is handled by Amadeus_Flights"}}

User: "Book this flight" (journey_id in context)
→ {{"target": "Amadeus_Flights", "task_instructions": "journey_id is in context — booking agent must call amadeus_save_booked_flight_to_journey after confirming the order", "rationale": "Single service: flight booking with journey linking"}}
"""

SCHEMA_HINT = """
You must return ONLY a JSON object as plain text (do NOT call any tool, do NOT use markdown code blocks).

CRITICAL: The "target" field MUST be EXACTLY one of these values:
- "Amadeus_Flights" (for flight search, booking, seat selection)
- "Amadeus_Hotels" (for hotel search, booking)
- "Amadeus_Cars" (for car rental search, booking)
- "direct" (for simple questions you can answer directly)

JSON schema:
{{
  "target": "Amadeus_Flights" | "Amadeus_Hotels" | "Amadeus_Cars" | "direct",
  "targets": ["Amadeus_Flights", "Amadeus_Hotels", "Amadeus_Cars"],
  "rationale": "string explaining your routing decision",
  "direct_reply": "string (required if target is 'direct')",
  "forward_from_agent": "optional - one of the three domain names if forwarding their response",
  "missing_info_question": "optional - question to ask if info is missing",
  "tasks_identified": ["list", "of", "tasks"],
  "flight_booking_completed": true/false,
  "flight_booking_details": {{"destination": "...", "arrival_date": "...", "departure_date": "...", "travelers": 1}}
}}

MULTI-TASK RULES:
- Single service: Use "target" (string). Example: "target": "Amadeus_Flights"
- Multiple services: Use "targets" (array). Example: "targets": ["Amadeus_Flights", "Amadeus_Cars", "Amadeus_Hotels"]
- For multiple services, ALSO provide "tasks_identified": ["search flights", "rent car", "book hotel"]
- Services execute SEQUENTIALLY in array order. Always put Amadeus_Flights FIRST (cars/hotels need flight info).
- **CRITICAL: When you detect a successful flight booking (keywords: "confirmed", "booked", "reservation number", "PNR"), set "flight_booking_completed": true and extract destination, dates, and traveler count into "flight_booking_details".**
- Parse the conversation history to extract: destination city, arrival date (flight arrival), departure date (return flight), number of travelers.
- Ask for missing info if needed (set "missing_info_question") and still choose the most likely "target".
- If answering directly, set target "direct" and include "direct_reply".
- If a sub-supervisor already produced the exact user-visible text, set "forward_from_agent".
- Output JSON ONLY as plain text (no markdown code blocks, no tool calls).
- IMPORTANT: Do NOT try to call a "json" tool. Just respond with the JSON as plain text.
"""

MAX_TOKENS = 4000  # Token limit for context (safer than char limit)

def _trim_messages(messages: List[BaseMessage], max_tokens: int = MAX_TOKENS) -> List[BaseMessage]:
    """Optimize message history using intelligent trimming"""
    if not messages:
        return messages

    # Use performance-optimized message trimming
    with timer("amadeus_message_optimization"):
        optimized = optimize_messages(
            messages,
            max_tokens=max_tokens,
            keep_system=True,
            keep_recent_human=3,
        )

    return optimized

def _decide(messages: List[BaseMessage]) -> dict:
    """Make routing decision with performance monitoring"""
    sys = SystemMessage(content=AMADEUS_INSTRUCTIONS.format(
        members="Amadeus_Flights, Amadeus_Hotels, Amadeus_Cars"
    ))
    schema = SystemMessage(content=SCHEMA_HINT)

    # Optimize messages before LLM call
    with timer("amadeus_message_trimming"):
        trimmed = _trim_messages(messages)

    # Invoke LLM with timing
    with timer("amadeus_llm_decision"):
        out = llm.invoke([sys, schema] + trimmed)

    text = getattr(out, "content", "").strip()

    # Parse with timing
    with timer("amadeus_json_parsing"):
        try:
            data = json.loads(text)
            if not isinstance(data, dict):
                raise ValueError("Decision must be an object")
            return data
        except Exception:
            return {
                "target": "direct",
                "rationale": "LLM returned non-JSON; responding directly.",
                "direct_reply": text or "Sorry, I couldn't parse the decision."
            }

# Valid targets for this supervisor
VALID_AMADEUS_TARGETS = {"Amadeus_Flights", "Amadeus_Hotels", "Amadeus_Cars", "direct"}

# Map common incorrect targets to valid ones
AMADEUS_TARGET_MAPPING = {
    "Amadeus_Workflow": None,  # Skip self-references
    "Orchestrator_Workflow": None,  # Skip parent references
    "Umoja_Workflow": None,  # Skip, should infer from task
    "Flight_Recommendation_By_Amadeus": "Amadeus_Flights",
    "Flight_Booking_By_Amadeus": "Amadeus_Flights",
    "Flight_Status_By_Amadeus": "Amadeus_Flights",
    "Seating_Agent": "Amadeus_Flights",  # Seat operations go to flights
    "Hotels_Recommendation": "Amadeus_Hotels",
    "Hotels_Booking": "Amadeus_Hotels",
    "Cars_Recommendation": "Amadeus_Cars",
    "Cars_Booking": "Amadeus_Cars",
}

def _map_target(target: str, task_hint: str = "") -> str:
    """Map a target to a valid Amadeus target"""
    if target in VALID_AMADEUS_TARGETS:
        return target
    if target in AMADEUS_TARGET_MAPPING:
        mapped = AMADEUS_TARGET_MAPPING[target]
        if mapped:
            return mapped
    # Try to infer from task hint
    task_lower = task_hint.lower()
    if "flight" in task_lower or "seat" in task_lower or "save" in task_lower:
        return "Amadeus_Flights"
    elif "hotel" in task_lower:
        return "Amadeus_Hotels"
    elif "car" in task_lower or "rent" in task_lower:
        return "Amadeus_Cars"
    # Default fallback
    return "Amadeus_Flights"

# -------- Nodes --------
def amadeus_supervisor_node(state: AmadeusState) -> AmadeusState | Command[AmadeusState]:
    messages = state.get("messages", [])

    # Check if we're resuming from a queue (multi-task continuation)
    route_queue = state.get("route_queue", [])
    if route_queue:
        # Pop next task from queue
        raw_target = route_queue.pop(0)

        # Map the target to a valid one
        tasks = state.get("tasks_identified", [])
        task_idx = len(tasks) - len([raw_target] + route_queue) - 1
        task_hint = tasks[task_idx] if 0 <= task_idx < len(tasks) else ""
        target = _map_target(raw_target, task_hint)

        # Also map remaining queue items
        mapped_queue = []
        for i, t in enumerate(route_queue):
            q_task_idx = task_idx + 1 + i
            q_task_hint = tasks[q_task_idx] if 0 <= q_task_idx < len(tasks) else ""
            mapped_queue.append(_map_target(t, q_task_hint))

        if mapped_queue:
            state["route_queue"] = mapped_queue
        else:
            state.pop("route_queue", None)

        # Continue with queued task without re-deciding
        state["route"] = cast(AmadeusState["route"], target)

        # Add context hint for this task if available
        if 0 <= task_idx < len(tasks):
            task_hint_msg = f"[AMADEUS TASK {task_idx + 1}/{len(tasks)}]: {tasks[task_idx]}"
            # Prepend task context as a system message
            task_msg = SystemMessage(content=task_hint_msg)
            if state.get("task_context"):
                task_msg.content += f"\nContext from previous tasks: {json.dumps(state['task_context'])}"
            state["messages"] = messages + [task_msg]

        return Command(goto=target, update=state)

    # New decision needed
    decision = _decide(messages)

    # Support either a single `target` or a sequence of targets via `targets`.
    # `targets` may be a JSON array, comma-separated string, or a single value.
    raw_targets = decision.get("targets") or decision.get("target")
    if isinstance(raw_targets, list):
        raw_target_list = [str(t) for t in raw_targets]
    elif isinstance(raw_targets, str) and "," in raw_targets:
        raw_target_list = [t.strip() for t in raw_targets.split(",") if t.strip()]
    else:
        raw_target_list = [raw_targets] if raw_targets is not None else ["direct"]

    # Map targets to valid ones using tasks_identified for context
    tasks_identified = decision.get("tasks_identified", [])
    cleaned_targets = []
    for i, t in enumerate(raw_target_list):
        task_hint = tasks_identified[i] if i < len(tasks_identified) else ""
        mapped = _map_target(str(t), task_hint)
        cleaned_targets.append(mapped)

    # Deduplicate while preserving order
    seen = set()
    unique_targets = []
    for t in cleaned_targets:
        if t not in seen:
            seen.add(t)
            unique_targets.append(t)
    targets = unique_targets if unique_targets else ["direct"]

    target = cast(str, targets[0] if targets else "direct")

    # Store identified tasks for multi-task scenarios
    if "tasks_identified" in decision:
        state["tasks_identified"] = decision["tasks_identified"]

    # Initialize task context for multi-task
    if len(targets) > 1:
        state.setdefault("task_context", {})

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    # Capture flight booking completion
    if decision.get("flight_booking_completed"):
        state["flight_booking_completed"] = True
        if "flight_booking_details" in decision:
            state["flight_booking_details"] = decision["flight_booking_details"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    # Belt-and-suspenders: ensure goto is never parent workflow name (Amadeus_Workflow)
    if target not in VALID_AMADEUS_TARGETS:
        target = _map_target(str(target))

    # If multiple targets were requested, store the remainder as a route queue
    if len(targets) > 1:
        state["route_queue"] = targets[1:]
        # Add task hint for first task
        tasks = state.get("tasks_identified", [])
        if tasks:
            task_hint = f"[AMADEUS TASK 1/{len(targets)}]: {tasks[0]}"
            state["messages"] = messages + [SystemMessage(content=task_hint)]

    state["route"] = cast(AmadeusState["route"], target)
    return Command(goto=target, update=state)

def amadeus_return(state: AmadeusState) -> AmadeusState | Command[AmadeusState]:
    """
    After any domain completes:
    1. Extract context from this task's results
    2. Store in task_context for next task
    3. If more tasks pending, route back to supervisor
    4. If all tasks done, return normally
    """
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")
    route = state.get("route", "unknown")

    flight_completed = state.get("flight_booking_completed", False)
    flight_details = state.get("flight_booking_details", {})
    has_more_tasks = bool(state.get("route_queue"))

    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)

    # Extract context from this task for next task
    if last_ai and (has_more_tasks or flight_completed):
        try:
            # Try to parse JSON response
            content = str(last_ai.content)
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                task_context = state.get("task_context") or {}

                # Store API responses for next task
                if "api_response" in parsed and parsed["api_response"]:
                    task_context[f"{route}_data"] = parsed["api_response"]

                # Extract flight details specifically
                if route == "Amadeus_Flights" or "flight" in route.lower():
                    if "flight_booking_details" in parsed:
                        task_context["flight_details"] = parsed["flight_booking_details"]
                    # Also check for flight info in api_response
                    elif "api_response" in parsed and isinstance(parsed["api_response"], dict):
                        api_resp = parsed["api_response"]
                        # Extract key travel details
                        if "destination" in api_resp or "arrival" in api_resp:
                            task_context["flight_details"] = {
                                "destination": api_resp.get("destination") or api_resp.get("destination_city"),
                                "arrival_date": api_resp.get("arrival_date") or api_resp.get("checkin"),
                                "departure_date": api_resp.get("departure_date") or api_resp.get("checkout"),
                                "travelers": api_resp.get("travelers") or api_resp.get("passengers", 1),
                            }

                state["task_context"] = task_context
        except (json.JSONDecodeError, TypeError, AttributeError):
            pass

    # Handle verbatim forwarding
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None

        # After forwarding, check if we need to trigger hotels (old auto-trigger logic)
        if route == "Amadeus_Flights":
            # Analyze the worker's response to determine booking success
            analysis = _analyze_flight_booking_result(state.get("messages", []))
            if analysis.get("success"):
                # set booking details and append a summary message for the supervisor
                details = {
                    "destination": analysis.get("destination") or analysis.get("destination_city"),
                    "arrival_date": analysis.get("arrival_date"),
                    "departure_date": analysis.get("departure_date"),
                    "travelers": analysis.get("travelers") or 1,
                    "destination_city": analysis.get("destination_city") or analysis.get("destination"),
                }
                state["flight_booking_completed"] = True
                state["flight_booking_details"] = details
                # Store in task_context too
                task_context = state.get("task_context") or {}
                task_context["flight_details"] = details
                state["task_context"] = task_context
                # add an AI message so the supervisor LLM sees the confirmation
                state["messages"] = state.get("messages", []) + [AIMessage(content=(analysis.get("summary") or "Flight booking confirmed."))]
                # set a flag so the graph-mode conditional edge can route back to the supervisor
                state["forward_to_supervisor"] = True
                return state
            # if not success, just return ordinary forwarded state

        # If more tasks pending, route back to supervisor
        if has_more_tasks:
            state["forward_to_supervisor"] = True

        return state

    # Regular wrap-up
    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]

    # If more tasks pending, route back to supervisor
    if has_more_tasks:
        state["forward_to_supervisor"] = True
        return state

    # Auto-trigger hotels after flight booking (old logic - may not be needed with multi-task)
    if flight_completed and route == "Amadeus_Flights":
        # If the booking was already marked completed, prepare to send state
        # back to supervisor via graph-mode conditional edge. Append a short
        # confirmation message for context and set the forwarding flag.
        summary = (
            f"Detected completed flight booking to {flight_details.get('destination_city', flight_details.get('destination','destination'))} "
            f"arriving {flight_details.get('arrival_date','(unknown)')} for {flight_details.get('travelers',1)} traveler(s)."
        )
        state["messages"] = state.get("messages", []) + [AIMessage(content=summary)]
        state["forward_to_supervisor"] = True
        return state

    return state



def _analyze_flight_booking_result(messages: List[BaseMessage]) -> dict:
    """Use the LLM to determine if the flight worker successfully reserved the booking.

    Returns a dict with keys: success (bool), destination, destination_city, arrival_date,
    departure_date, travelers (int), summary (string).
    """
    # build a concise system + schema prompt
    sys = SystemMessage(content=(
        "You are an analyst that examines agent messages to determine whether a flight booking was successfully reserved. "
        "Return a JSON object ONLY with: success (bool), destination (string|null), destination_city (string|null), "
        "arrival_date (string|null), departure_date (string|null), travelers (number|null), summary (string).")
    )
    schema = SystemMessage(content=(
        "If the worker indicates a confirmed booking (keywords like 'confirmed', 'reservation', 'PNR', 'booking reference', 'ticketed'), set success=true and extract any available fields. "
        "If not, set success=false and provide a brief summary. Return valid JSON only."
    ))

    trimmed = _trim_messages(messages)
    try:
        out = llm.invoke([sys, schema] + trimmed)
        text = getattr(out, "content", "").strip()
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {"success": False, "summary": "Could not determine booking status from the worker response."}

def _auto_trigger_hotels(state: AmadeusState, flight_details: dict) -> Command[AmadeusState]:
    """
    Automatically invoke the hotel recommendation workflow with flight context
    """
    msgs = state.get("messages", [])
    
    # Extract flight details
    destination = flight_details.get("destination_city", flight_details.get("destination", "your destination"))
    checkin = flight_details.get("arrival_date", "")
    checkout = flight_details.get("departure_date", "")
    travelers = flight_details.get("travelers", 1)
    
    # Create a friendly transition message
    transition_msg = (
        f"Perfect! Your flight is confirmed. "
        f"Now let me find great hotel options in {destination} "
    )
    if checkin and checkout:
        transition_msg += f"for your stay from {checkin} to {checkout}."
    else:
        transition_msg += "for your trip."
    
    # Append transition message
    state["messages"] = msgs + [AIMessage(content=transition_msg)]
    
    # Create a hotel search request that the hotel workflow will process
    # This simulates a user asking for hotel recommendations
    hotel_request = HumanMessage(content=(
        f"Search hotels in {destination} "
        f"for check-in {checkin} and check-out {checkout} "
        f"for {travelers} guest(s)."
    ))
    
    state["messages"] = state["messages"] + [hotel_request]
    
    # Reset the flight booking flag
    state["flight_booking_completed"] = False
    state["route"] = "Amadeus_Hotels"
    
    # Route to hotels workflow - it will use its existing recommendation node
    return Command(goto="Amadeus_Hotels", update=state)

# -------- Graph wiring --------
graph_builder = StateGraph(AmadeusState)
graph_builder.add_node("amadeus_supervisor", amadeus_supervisor_node)
graph_builder.add_node("Amadeus_Flights", amadeus_flight_workflow)
graph_builder.add_node("Amadeus_Hotels", amadeus_hotels_workflow)
graph_builder.add_node("Amadeus_Cars", amadeus_cars_workflow)

graph_builder.set_entry_point("amadeus_supervisor")


def route_supervisor(state: AmadeusState) -> str:
    route = state.get("route") or "direct"
    # Validate route is valid for this subgraph (parent may pass "Amadeus_Workflow")
    if route not in VALID_AMADEUS_TARGETS:
        return _map_target(str(route)) if route else "direct"
    return route


graph_builder.add_conditional_edges(
    "amadeus_supervisor",
    route_supervisor,
    {
        "Amadeus_Flights": "Amadeus_Flights",
        "Amadeus_Hotels": "Amadeus_Hotels",
        "Amadeus_Cars": "Amadeus_Cars",
        "direct": END,
    },
)

for worker in ("Amadeus_Flights", "Amadeus_Hotels", "Amadeus_Cars"):
    graph_builder.add_edge(worker, "amadeus_return")

graph_builder.add_edge("amadeus_return", END)

# Conditional routing from amadeus_return: when `forward_to_supervisor` is set,
# route_queue has pending tasks, or a flight booking is completed for a flights route,
# route back to the `amadeus_supervisor` node.
def _decide_return_route(state: AmadeusState) -> str:
    # If explicitly flagged to return to supervisor
    if state.get("forward_to_supervisor"):
        state.pop("forward_to_supervisor", None)  # Clear flag
        return "amadeus_supervisor"
    # If more tasks in queue
    if state.get("route_queue"):
        return "amadeus_supervisor"
    # Old auto-trigger logic
    if state.get("flight_booking_completed") and state.get("route") == "Amadeus_Flights":
        return "amadeus_supervisor"
    return "end"

graph_builder.add_conditional_edges(
    "amadeus_return",
    _decide_return_route,
    {
        "amadeus_supervisor": "amadeus_supervisor",
        "end": END,
    },
)

# If a supervisor provided a `route_queue`, continue executing the next worker
# in sequence directly from `amadeus_return`. This allows the supervisor to
# split a complex request into multiple worker runs (e.g., Flights -> Hotels).
def _maybe_continue_queue(state: AmadeusState) -> AmadeusState | Command[AmadeusState]:
    queue = state.get("route_queue") or []
    if queue:
        raw_next = queue.pop(0)
        # update queue in state (empty removed)
        if queue:
            state["route_queue"] = queue
        else:
            state.pop("route_queue", None)

        # Map the next route to a valid target
        next_route = _map_target(str(raw_next))
        if next_route not in VALID_AMADEUS_TARGETS:
            next_route = "Amadeus_Flights"  # Safe fallback

        state["route"] = next_route
        return Command(goto=next_route, update=state)
    return state

# Wrap the amadeus_return node's original function to optionally continue
# the route queue. The graph will still call `amadeus_return`, and then we
# intercept to continue the queue if present.
orig_amadeus_return = amadeus_return
def amadeus_return_wrapper(state: AmadeusState) -> AmadeusState | Command[AmadeusState]:
    result = orig_amadeus_return(state)
    # if the original returned a Command, run it (graph will handle), else check queue
    if isinstance(result, Command):
        return result
    return _maybe_continue_queue(result)

# replace node implementation in the compiled builder
graph_builder.add_node("amadeus_return", amadeus_return_wrapper)

graph = graph_builder.compile(name="Amadeus_Workflow")