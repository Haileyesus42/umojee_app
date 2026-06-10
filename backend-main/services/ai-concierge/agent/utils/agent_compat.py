"""
Compatibility layer for create_agent across different langchain versions.

This module provides a consistent create_agent function that works across
different versions of langchain/langgraph.
"""

try:
    from langchain.agents import create_agent
except ImportError:
    # Fallback: create a simple agent wrapper using StateGraph
    from langgraph.graph import StateGraph, END
    from typing import TypedDict, Annotated, Sequence
    from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
    import operator
    
    def create_agent(model, tools, system_prompt):
        """
        Simple agent wrapper when langchain's create_agent is not available.
        
        Creates a basic agent using StateGraph that:
        1. Accepts messages as input
        2. Prepends system prompt
        3. Invokes the model
        4. Returns response
        
        Note: This is a simplified version. For full agent capabilities
        (tool calling, reasoning loops), use langchain's native create_agent.
        """
        class AgentState(TypedDict):
            messages: Annotated[Sequence[BaseMessage], operator.add]
        
        def call_model(state):
            messages = state["messages"]
            # Prepend system prompt
            full_messages = [{"role": "system", "content": system_prompt}] + [
                {"role": "human" if isinstance(m, HumanMessage) else "ai", "content": m.content}
                for m in messages
            ]
            response = model.invoke(full_messages)
            return {"messages": [response]}
        
        workflow = StateGraph(AgentState)
        workflow.add_node("agent", call_model)
        workflow.set_entry_point("agent")
        workflow.add_edge("agent", END)
        
        return workflow.compile()

__all__ = ["create_agent"]
