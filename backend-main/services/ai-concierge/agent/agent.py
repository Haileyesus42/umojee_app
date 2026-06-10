# agent/umoja/umoja_supervisor.py — latest LangGraph-native supervisor (no langgraph_supervisor)
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

# Your workers (functions or compiled subgraphs)
from agent.utils.nodes import (
    booking_agent,
    luggage_agent,
    seating_agent,
    recommendation_agent,
    checkin_agent,
)
from agent.utils.state import State  # if your workers rely on this, keep it imported
from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed
# llm = ChatGroq(model="openai/gpt-oss-120b")  # adjust to your allowed Groq model

# ---------- Orchestrator State ----------
class UmojaState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[
        Literal[
            "Booking_Agent",
            "Luggage_Agent",
            "Seating_Agent",
            "Recommendation_Agent",
            "Checkin_Agent",
            "direct",
        ]
    ]
    # If set, we'll forward the last worker AI message verbatim
    forward_from_agent: Optional[
        Literal[
            "Booking_Agent",
            "Luggage_Agent",
            "Seating_Agent",
            "Recommendation_Agent",
            "Checkin_Agent",
        ]
    ]

MessagesState = {"messages": add_messages}

# ---------- Prompt & JSON Schema ----------
SYSTEM_PROMPT = """
You are the Umoja Operations Supervisor coordinating the specialist workers: {members}.
At every turn you must understand the user’s goal, decide on the best worker, and keep
the interaction concise, helpful, and accurate.

Core duties:
1) Inspect the conversation history to capture context, constraints, and missing details.
2) Select exactly one worker whose skills match the request:
   • Booking_Agent → flight search, itinerary updates, weather/coordinate lookups.
   • Luggage_Agent → baggage allowances and updates that need booking IDs and counts.
   • Seating_Agent → seat availability questions and seat change actions.
   • Recommendation_Agent → nearby airports, tourist spots, hotel suggestions.
   • Checkin_Agent → personalized airport check-in timing guidance.
3) Ask the user for any required information before delegating so workers have complete inputs.
4) Provide a short brief with each hand-off describing the user’s intent and required outcome.
5) If no worker fits, explain the limitation to the user without delegating.

Avoid repeated or conflicting hand-offs, keep tone professional and friendly, and ground
responses in confirmed facts or tool outputs.
"""

SCHEMA_HINT = """
Return one JSON object ONLY:

type Decision = {
  "target": "Booking_Agent" | "Luggage_Agent" | "Seating_Agent" | "Recommendation_Agent" | "Checkin_Agent" | "direct",
  "rationale": string,
  "direct_reply"?: string,
  "forward_from_agent"?: "Booking_Agent" | "Luggage_Agent" | "Seating_Agent" | "Recommendation_Agent" | "Checkin_Agent",
  "missing_info_question"?: string
}

Rules:
- Ask for missing info if needed (set "missing_info_question") and still choose the most likely "target".
- If answering directly, set "target":"direct" and include "direct_reply".
- If a worker already produced the exact user-visible text, set "forward_from_agent".
- Output JSON ONLY (no markdown/prose).
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
    sys = SystemMessage(content=SYSTEM_PROMPT.format(
        members="Booking_Agent, Luggage_Agent, Seating_Agent, Recommendation_Agent, Checkin_Agent"
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

# ---------- Nodes ----------
def umoja_supervisor_node(state: UmojaState) -> UmojaState | Command[UmojaState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    target = cast(str, decision.get("target", "direct"))

    # Ask for missing info (append as assistant) but still route
    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    # If set, we’ll forward the worker’s last message verbatim after it runs
    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    state["route"] = cast(UmojaState["route"], target)
    return Command(goto=target, update=state)

def umoja_return(state: UmojaState) -> UmojaState:
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")
    route = state.get("route", "unknown")

    # forward verbatim when requested
    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        return state

    # default wrap-up
    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]
    return state

# ---------- Graph wiring ----------
graph_builder = StateGraph(UmojaState)

graph_builder.add_node("umoja_supervisor", umoja_supervisor_node)

# Map readable node names to your workers (functions or compiled graphs)
graph_builder.add_node("Booking_Agent", booking_agent)
graph_builder.add_node("Luggage_Agent", luggage_agent)
graph_builder.add_node("Seating_Agent", seating_agent)
graph_builder.add_node("Recommendation_Agent", recommendation_agent)
graph_builder.add_node("Checkin_Agent", checkin_agent)

graph_builder.add_node("umoja_return", umoja_return)

graph_builder.set_entry_point("umoja_supervisor")


def route_supervisor(state: UmojaState) -> str:
    return state.get("route") or "direct"


graph_builder.add_conditional_edges(
    "umoja_supervisor",
    route_supervisor,
    {
        "Booking_Agent": "Booking_Agent",
        "Luggage_Agent": "Luggage_Agent",
        "Seating_Agent": "Seating_Agent",
        "Recommendation_Agent": "Recommendation_Agent",
        "Checkin_Agent": "Checkin_Agent",
        "direct": END,
    },
)

for worker in (
    "Booking_Agent",
    "Luggage_Agent",
    "Seating_Agent",
    "Recommendation_Agent",
    "Checkin_Agent",
):
    graph_builder.add_edge(worker, "umoja_return")

graph_builder.add_edge("umoja_return", END)

graph = graph_builder.compile(name="Umoja_Workflow")
