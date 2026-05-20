# agent/update_journey/update_journey_workflow.py — LangGraph-native supervisor
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

from agent.update_journey.update_journey_node import update_journey_agent

from dotenv import load_dotenv
load_dotenv()
import os

model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)

# ---------- State ----------
class UpdateJourneyState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Update_Journey_Agent", "direct"]]
    forward_from_agent: Optional[Literal["Update_Journey_Agent"]]

MessagesState = {"messages": add_messages}

# ---------- Prompt & JSON Schema ----------
UJ_PROMPT = """
You are the Umoja Journey Supervisor — the primary coordinator for all journey-related requests.
You handle requests from travelers who want to VIEW, MODIFY, or CREATE journeys.

Scope of this workflow:
- Creating brand-new journeys (new trip from scratch, new destination, new dates)
- Viewing journey details (status, destination, dates, budget, segments, saved/booked flights, saved/booked hotels, saved/booked cars)
- Updating travel preferences (destination, departure city, dates, budget, number of travelers)
- Changing journey lifecycle status (planning → in_progress → completed / cancelled)
- Transitioning the journey through its phases (inspiration → home_to_airport → etc.)
- Managing saved flights (clear or replace)
- Setting a journey as active when the user has multiple journeys
- Archiving or cancelling a journey

Out of scope (route back to the orchestrator instead):
- Booking new flights, hotels, or cars → Amadeus_Workflow

Execution principles:
1. If the request involves any journey operation (create, view, modify, cancel, archive), including reading saved/booked flights, hotels, or cars from an existing journey, route to Update_Journey_Agent.
2. If you can answer directly (e.g. a simple clarification question), do so.
3. Keep responses professional and travel-concierge in tone.
"""

SCHEMA_HINT = """
Return one JSON object ONLY:

type Decision = {
  "target": "Update_Journey_Agent" | "direct",
  "rationale": string,
  "direct_reply"?: string,
  "forward_from_agent"?: "Update_Journey_Agent",
  "missing_info_question"?: string
}

Rules:
- If the request involves reading or modifying a journey, set "target": "Update_Journey_Agent".
- If answering directly, set "target":"direct" and include "direct_reply".
- If the agent already produced the exact user-visible text, set "forward_from_agent":"Update_Journey_Agent".
- If required info is missing (e.g. journey_id), set "missing_info_question" and still choose the most likely target.
- Output JSON ONLY (no markdown, no prose).
"""

MAX_CHARS = 10_000_000

VALID_TARGETS = {"Update_Journey_Agent", "direct"}


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
        kept.append(m)
        used += len(c)
    kept.reverse()
    if sys_first:
        kept = [sys_first] + kept
    return kept


def _decide(messages: List[BaseMessage]) -> dict:
    sys = SystemMessage(content=UJ_PROMPT.format(members="Update_Journey_Agent"))
    schema = SystemMessage(content=SCHEMA_HINT)
    trimmed = _trim_messages(messages)
    out = llm.invoke([sys, schema] + trimmed)
    text = getattr(out, "content", "").strip()
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("Decision must be an object")
        target = data.get("target", "direct")
        if target not in VALID_TARGETS:
            data["target"] = "Update_Journey_Agent" if "journey" in target.lower() else "direct"
        return data
    except Exception:
        return {
            "target": "direct",
            "rationale": "LLM returned non-JSON; responding directly.",
            "direct_reply": text or "Sorry, I couldn't parse the decision.",
        }


# ---------- Nodes ----------
def update_journey_supervisor_node(
    state: UpdateJourneyState,
) -> UpdateJourneyState | Command[UpdateJourneyState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    target = cast(str, decision.get("target", "direct"))

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    if target not in VALID_TARGETS:
        target = "Update_Journey_Agent"

    state["route"] = cast(UpdateJourneyState["route"], target)
    return Command(goto=target, update=state)


def update_journey_return(state: UpdateJourneyState) -> UpdateJourneyState:
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")

    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        return state

    route = state.get("route", "unknown")
    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]
    return state


# ---------- Graph wiring ----------
graph_builder = StateGraph(UpdateJourneyState)

graph_builder.add_node("update_journey_supervisor", update_journey_supervisor_node)
graph_builder.add_node("Update_Journey_Agent", update_journey_agent)
graph_builder.add_node("update_journey_return", update_journey_return)

graph_builder.set_entry_point("update_journey_supervisor")


def route_supervisor(state: UpdateJourneyState) -> str:
    route = state.get("route") or "direct"
    if route not in VALID_TARGETS:
        return "direct"
    return route


graph_builder.add_conditional_edges(
    "update_journey_supervisor",
    route_supervisor,
    {
        "Update_Journey_Agent": "Update_Journey_Agent",
        "direct": END,
    },
)

graph_builder.add_edge("Update_Journey_Agent", "update_journey_return")
graph_builder.add_edge("update_journey_return", END)

graph = graph_builder.compile(name="Update_Journey_Workflow")
