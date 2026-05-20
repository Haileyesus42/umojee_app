from __future__ import annotations

import json
import os
from typing import List, Literal, Optional, TypedDict, cast

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.types import Command

from agent.duffel.duffel_flight.duffel_flight_nodes import (
    duffel_flight_booking_agent,
    duffel_flight_get_status_agent,
    duffel_flight_recommendation_agent,
)

load_dotenv()

model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
llm = ChatGroq(model=model)


class FlightState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[
        Literal["Flight_Recommendation_By_Duffel", "Flight_Booking_By_Duffel", "Flight_Status_By_Duffel", "direct"]
    ]
    forward_from_agent: Optional[
        Literal["Flight_Recommendation_By_Duffel", "Flight_Booking_By_Duffel", "Flight_Status_By_Duffel"]
    ]


MessagesState = {"messages": add_messages}


VALID_FLIGHT_TARGETS = {
    "Flight_Recommendation_By_Duffel",
    "Flight_Booking_By_Duffel",
    "Flight_Status_By_Duffel",
    "direct",
}


FLIGHT_INSTRUCTIONS = """
You are the Duffel Flight Services Supervisor.

Route:
- Search, compare, shortlist, and reprice requests to Flight_Recommendation_By_Duffel
- Booking and reservation requests to Flight_Booking_By_Duffel
- Flight status and live operations questions to Flight_Status_By_Duffel
"""


SCHEMA_HINT = """
Return JSON only:
{
  "target": "Flight_Recommendation_By_Duffel" | "Flight_Booking_By_Duffel" | "Flight_Status_By_Duffel" | "direct",
  "rationale": "string",
  "direct_reply": "string optional",
  "missing_info_question": "string optional",
  "forward_from_agent": "string optional"
}
"""


def _trim_messages(messages: List[BaseMessage], limit: int = 50000) -> List[BaseMessage]:
    if not messages:
        return messages
    sys_first = next((m for m in messages if isinstance(m, SystemMessage)), None)
    tail = [m for m in messages if m is not sys_first][::-1]
    kept: List[BaseMessage] = []
    used = 0
    for message in tail:
        content = str(getattr(message, "content", ""))
        if used + len(content) > limit:
            break
        kept.append(message)
        used += len(content)
    kept.reverse()
    if sys_first:
        kept = [sys_first] + kept
    return kept


def _decide(messages: List[BaseMessage]) -> dict:
    out = llm.invoke([SystemMessage(content=FLIGHT_INSTRUCTIONS), SystemMessage(content=SCHEMA_HINT)] + _trim_messages(messages))
    text = getattr(out, "content", "").strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {
        "target": "direct",
        "rationale": "LLM returned non-JSON.",
        "direct_reply": text or "I couldn't route the Duffel flight request.",
    }


def flight_supervisor_node(state: FlightState) -> FlightState | Command[FlightState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    target = cast(str, decision.get("target") or "direct")
    if target not in VALID_FLIGHT_TARGETS:
        target = "Flight_Recommendation_By_Duffel"

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    state["route"] = cast(FlightState["route"], target)
    return Command(goto=target, update=state)


def flight_return(state: FlightState) -> FlightState:
    msgs = state.get("messages", [])
    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)
    if state.get("forward_from_agent") and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        return state

    state["messages"] = msgs + [AIMessage(content=f"Handled by {state.get('route', 'Duffel flights')}.")]
    return state


graph_builder = StateGraph(FlightState)
graph_builder.add_node("duffel_flight_supervisor", flight_supervisor_node)
graph_builder.add_node("Flight_Recommendation_By_Duffel", duffel_flight_recommendation_agent)
graph_builder.add_node("Flight_Booking_By_Duffel", duffel_flight_booking_agent)
graph_builder.add_node("Flight_Status_By_Duffel", duffel_flight_get_status_agent)
graph_builder.add_node("duffel_flight_return", flight_return)
graph_builder.set_entry_point("duffel_flight_supervisor")


def route_supervisor(state: FlightState) -> str:
    return state.get("route") or "direct"


graph_builder.add_conditional_edges(
    "duffel_flight_supervisor",
    route_supervisor,
    {
        "Flight_Recommendation_By_Duffel": "Flight_Recommendation_By_Duffel",
        "Flight_Booking_By_Duffel": "Flight_Booking_By_Duffel",
        "Flight_Status_By_Duffel": "Flight_Status_By_Duffel",
        "direct": END,
    },
)

for worker in ("Flight_Recommendation_By_Duffel", "Flight_Booking_By_Duffel", "Flight_Status_By_Duffel"):
    graph_builder.add_edge(worker, "duffel_flight_return")

graph_builder.add_edge("duffel_flight_return", END)

graph = graph_builder.compile(name="duffel_flight_Workflow")
