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

from agent.duffel.duffel_cars.duffel_cars_supervisor import graph as duffel_cars_workflow
from agent.duffel.duffel_flight.duffel_flight_supervisor import graph as duffel_flight_workflow
from agent.duffel.duffel_hotels.duffel_hotels_supervisor import graph as duffel_hotels_workflow

load_dotenv()

model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)


class DuffelState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Duffel_Flights", "Duffel_Hotels", "Duffel_Cars", "direct"]]
    forward_from_agent: Optional[Literal["Duffel_Flights", "Duffel_Hotels", "Duffel_Cars"]]


MessagesState = {"messages": add_messages}


DUFFEL_INSTRUCTIONS = """
You are the Duffel Travel Services Supervisor.

Routing rules:
- Flight requests -> Duffel_Flights
- Hotel requests -> Duffel_Hotels
- Car rental requests -> Duffel_Cars

Important:
- This fallback implementation fully covers flight workflows.
- Hotel and car branches are graceful fallback responders, not live inventory providers.
"""


SCHEMA_HINT = """
Return JSON only:
{
  "target": "Duffel_Flights" | "Duffel_Hotels" | "Duffel_Cars" | "direct",
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
    out = llm.invoke([SystemMessage(content=DUFFEL_INSTRUCTIONS), SystemMessage(content=SCHEMA_HINT)] + _trim_messages(messages))
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
        "direct_reply": text or "I couldn't route the Duffel workflow request.",
    }


def duffel_supervisor_node(state: DuffelState) -> DuffelState | Command[DuffelState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    target = cast(str, decision.get("target") or "direct")

    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    if target not in {"Duffel_Flights", "Duffel_Hotels", "Duffel_Cars"}:
        target = "Duffel_Flights"

    state["route"] = cast(DuffelState["route"], target)
    return Command(goto=target, update=state)


graph_builder = StateGraph(DuffelState)
graph_builder.add_node("duffel_supervisor", duffel_supervisor_node)
graph_builder.add_node("Duffel_Flights", duffel_flight_workflow)
graph_builder.add_node("Duffel_Hotels", duffel_hotels_workflow)
graph_builder.add_node("Duffel_Cars", duffel_cars_workflow)
graph_builder.set_entry_point("duffel_supervisor")


def route_supervisor(state: DuffelState) -> str:
    return state.get("route") or "direct"


graph_builder.add_conditional_edges(
    "duffel_supervisor",
    route_supervisor,
    {
        "Duffel_Flights": "Duffel_Flights",
        "Duffel_Hotels": "Duffel_Hotels",
        "Duffel_Cars": "Duffel_Cars",
        "direct": END,
    },
)

for worker in ("Duffel_Flights", "Duffel_Hotels", "Duffel_Cars"):
    graph_builder.add_edge(worker, END)

graph = graph_builder.compile(name="Duffel_Workflow")
