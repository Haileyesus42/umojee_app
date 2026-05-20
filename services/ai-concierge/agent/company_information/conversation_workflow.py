# agent/company_information/conversation_supervisor.py — latest LangGraph-native supervisor
from __future__ import annotations

import json
from typing import TypedDict, Literal, Optional, List, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.graph.message import add_messages

# Your single worker (function node or compiled subgraph)
from agent.company_information.conversation_node import conversation_agent

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

# ---------- State ----------
class ConversationState(TypedDict, total=False):
    messages: List[BaseMessage]
    route: Optional[Literal["Conversation_Agent", "direct"]]
    # If set, we’ll forward the last worker AI message verbatim
    forward_from_agent: Optional[Literal["Conversation_Agent"]]

MessagesState = {"messages": add_messages}

# ---------- Prompt & JSON Schema ----------
CONV_PROMPT = """
You are the Umoja AI Conversation Supervisor coordinating the conversation agent: {members}.
Serve travelers seeking greetings, relationship-building, Umoja AI self-descriptions, or ND IT Solutions knowledge.

Execution principles:
1. Ensure the agent is used whenever the traveler asks about the system itself (tone, guardrails, roadmap) or company info.
2. Route corporate questions (values, services, testimonials, personas, mission) to the agent with a succinct focus brief.
3. Keep answers concise, structured, and consistent with the seeded data. Quote specifics when they help the traveler.
4. If data is missing or a tool errors, acknowledge it plainly and offer alternatives.
5. Maintain a concierge tone: warm, professional, action-oriented; invite follow-up when it advances the traveler’s goal.
6. Require Markdown formatting for traveler-facing responses; prefer headings, bullets, and tables when they clarify.
"""

SCHEMA_HINT = """
Return one JSON object ONLY:

type Decision = {
  "target": "Conversation_Agent" | "direct",
  "rationale": string,
  "direct_reply"?: string,
  "forward_from_agent"?: "Conversation_Agent",
  "missing_info_question"?: string
}

Rules:
- Ask for missing info if needed (set "missing_info_question") and still choose the most likely "target".
- If answering directly, set "target":"direct" and include "direct_reply".
- If the agent already produced the exact user-visible text, set "forward_from_agent":"Conversation_Agent".
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

VALID_TARGETS = {"Conversation_Agent", "direct"}

def _decide(messages: List[BaseMessage]) -> dict:
    sys = SystemMessage(content=CONV_PROMPT.format(members="Conversation_Agent"))
    schema = SystemMessage(content=SCHEMA_HINT)
    trimmed = _trim_messages(messages)
    out = llm.invoke([sys, schema] + trimmed)
    text = getattr(out, "content", "").strip()
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("Decision must be an object")
        # Validate and correct target if LLM returned invalid value
        target = data.get("target", "direct")
        if target not in VALID_TARGETS:
            # LLM sometimes returns parent workflow name; correct to agent
            if "conversation" in target.lower():
                data["target"] = "Conversation_Agent"
            else:
                data["target"] = "direct"
        return data
    except Exception:
        return {
            "target": "direct",
            "rationale": "LLM returned non-JSON; responding directly.",
            "direct_reply": text or "Sorry, I couldn't parse the decision."
        }

# ---------- Nodes ----------
def conversation_supervisor_node(state: ConversationState) -> ConversationState | Command[ConversationState]:
    messages = state.get("messages", [])
    decision = _decide(messages)
    target = cast(str, decision.get("target", "direct"))

    # Ask for missing info (append as assistant) but still route
    if q := decision.get("missing_info_question"):
        state["messages"] = messages + [AIMessage(content=q)]
        messages = state["messages"]

    # If set, we’ll forward the agent’s last message verbatim after it runs
    if "forward_from_agent" in decision:
        state["forward_from_agent"] = decision["forward_from_agent"]

    if target == "direct":
        reply = decision.get("direct_reply") or "(no reply provided)"
        state["messages"] = messages + [AIMessage(content=reply)]
        return state

    # Validate target before routing
    if target not in VALID_TARGETS:
        if "conversation" in target.lower():
            target = "Conversation_Agent"
        else:
            target = "direct"
            reply = decision.get("direct_reply") or "I can help with general questions and information."
            state["messages"] = messages + [AIMessage(content=reply)]
            return state

    state["route"] = cast(ConversationState["route"], target)
    return Command(goto=target, update=state)

def conversation_return(state: ConversationState) -> ConversationState:
    msgs = state.get("messages", [])
    forward_from = state.get("forward_from_agent")
    route = state.get("route", "unknown")

    # Forward verbatim when requested
    last_ai = next((m for m in reversed(msgs) if isinstance(m, AIMessage)), None)
    if forward_from and last_ai:
        state["messages"] = msgs + [AIMessage(content=last_ai.content)]
        state["forward_from_agent"] = None
        return state

    # Default wrap-up
    state["messages"] = msgs + [AIMessage(content=f"Handled by {route}.")]
    return state

# ---------- Graph wiring ----------
graph_builder = StateGraph(ConversationState)

graph_builder.add_node("conversation_supervisor", conversation_supervisor_node)
graph_builder.add_node("Conversation_Agent", conversation_agent)
graph_builder.add_node("conversation_return", conversation_return)

graph_builder.set_entry_point("conversation_supervisor")


def route_supervisor(state: ConversationState) -> str:
    route = state.get("route") or "direct"
    # Validate route is valid for this subgraph (not parent workflow name)
    if route not in VALID_TARGETS:
        # Parent might have set route="Conversation_Workflow"; default to direct
        return "direct"
    return route


graph_builder.add_conditional_edges(
    "conversation_supervisor",
    route_supervisor,
    {
        "Conversation_Agent": "Conversation_Agent",
        "direct": END,
    },
)

graph_builder.add_edge("Conversation_Agent", "conversation_return")
graph_builder.add_edge("conversation_return", END)

graph = graph_builder.compile(name="Conversation_Workflow")
