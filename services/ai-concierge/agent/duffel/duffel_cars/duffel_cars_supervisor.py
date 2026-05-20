from typing import List, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph import END, StateGraph

from agent.duffel.duffel_cars.duffel_cars_nodes import duffel_cars_agent


class DuffelCarsState(TypedDict, total=False):
    messages: List[BaseMessage]


graph_builder = StateGraph(DuffelCarsState)
graph_builder.add_node("duffel_cars", duffel_cars_agent)
graph_builder.set_entry_point("duffel_cars")
graph_builder.add_edge("duffel_cars", END)
graph = graph_builder.compile(name="Duffel_Cars_Workflow")
