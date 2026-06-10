from typing import List, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph import END, StateGraph

from agent.duffel.duffel_hotels.duffel_hotels_nodes import duffel_hotels_agent


class DuffelHotelsState(TypedDict, total=False):
    messages: List[BaseMessage]


graph_builder = StateGraph(DuffelHotelsState)
graph_builder.add_node("duffel_hotels", duffel_hotels_agent)
graph_builder.set_entry_point("duffel_hotels")
graph_builder.add_edge("duffel_hotels", END)
graph = graph_builder.compile(name="Duffel_Hotels_Workflow")
