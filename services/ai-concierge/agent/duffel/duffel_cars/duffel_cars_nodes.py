import os

from langchain_groq import ChatGroq

from agent.duffel.duffel_cars.duffel_cars_tools import duffel_list_cars
from agent.utils.agent_compat import create_agent


model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)


duffel_cars_agent = create_agent(
    model=llm,
    tools=[duffel_list_cars],
    system_prompt="""
You are the Duffel Cars fallback agent.
Explain clearly that this provider implementation currently covers flights only.
Return plain-text JSON with ai_generated, api_response, api_response_type, and message.
""",
)
