from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

INTENT_SYSTEM_PROMPT = (
    "You are an intent classifier for an airline assistant. "
    "Decide which workflow best fits the user's request.\n"
    "- Reply with 'umoja' if the user specifically wants Umoja Airways or company-specific services.\n"
    "- Reply with 'amadeus' if the user wants global flight options or airlines beyond Umoja.\n"
    "- Reply with 'clarify' if you are unsure or the user intent is ambiguous.\n"
    "Respond with a single word: umoja, amadeus, or clarify."
)

CLARIFICATION_MESSAGE = (
    "I can help with flights from Umoja Airways or search across all airlines. "
    "Do you want me to focus on Umoja Airways specifically, or explore options globally?"
)


def classify_intent(user_text: str) -> str:
    """Return 'umoja', 'amadeus', or 'clarify' based on the latest user message."""
    response = llm.invoke(
        [
            SystemMessage(content=INTENT_SYSTEM_PROMPT),
            HumanMessage(content=user_text),
        ]
    )
    decision = (response.content or "").strip().lower()
    if decision not in {"umoja", "amadeus", "clarify"}:
        return "clarify"
    return decision

