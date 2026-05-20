from pathlib import Path

from langchain.agents import create_agent
from langchain_groq import ChatGroq

from agent.journey.journey_inspiration.journey_inspiration_tools import (
    inspiration_collect_journey_context,
    inspiration_find_nearest_airport,
    inspiration_recommend_flights,
)
from agent.amadeus.amadeus_flight.amadeus_flight_tools import amadeus_save_flights_to_journey

from dotenv import load_dotenv
load_dotenv()
import os

# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
llm = ChatGroq(model=model)

_TEMPLATE_PATH = Path(__file__).with_name("journey_inspiration_example.md")
try:
    _template_text = _TEMPLATE_PATH.read_text(encoding="utf-8")
except Exception:
    _template_text = ""

journey_inspiration_agent = create_agent(
    model=llm,
    tools=[
        inspiration_collect_journey_context,
        inspiration_find_nearest_airport,
        inspiration_recommend_flights,
        amadeus_save_flights_to_journey,
    ],
    system_prompt=f"""You are the Umoja Journey Inspiration Agent. You handle flight recommendations for newly created journeys. Do not delegate to other agents or workflows.

MANDATORY TOOL SEQUENCE — call each tool ONE AT A TIME, in this exact order:
1) inspiration_collect_journey_context — decode the provided journey payload JSON and extract destination, departure city/airport, budget, dates, user profile, and location.
2) inspiration_find_nearest_airport — ONLY when departure_airport_code is empty/missing AND lat/lon are available from step 1; skip if departure_airport_code is already provided.
   FALLBACK: If the tool returns found=false or an empty iata_code, use YOUR OWN KNOWLEDGE to determine the country's primary international airport based on the user's departure city/country from step 1. For example: Ethiopia → ADD, Kenya → NBO, Nigeria → LOS, South Africa → JNB, Ghana → ACC, Egypt → CAI, USA/New York → JFK, UK/London → LHR. Use the inferred IATA code as origin_iata for step 3.
3) inspiration_recommend_flights — Call this tool ONCE with the correct parameters:
   - origin_iata: from step 1 (departure_airport_code) or step 2 (nearest airport / fallback).
   - destination_iata: from step 1 (destination_airport_code). If destination_airport_code is empty but destination city is provided, use YOUR OWN KNOWLEDGE to determine the main airport IATA code for that city/country.
   - user_id: from the payload.
   - departure_date: from step 1 (departure_date). If empty, it defaults to 30 days from today.
   - adults: from step 1 (travelers_count), default 1.
   - currency_code: from step 1 (currency), default "USD".
   - max_results: 10 (to get multiple flight options).
   - journey_id: from step 1 (journey_id). CRITICAL: Always provide this to enable auto-saving.
   The returned "flights" array goes directly into the "items" array in api_response.

ABSOLUTE OUTPUT RULES:
- After ALL tool calls are complete, your FINAL response MUST be EXACTLY ONE valid JSON object.
- When you have gathered all information and are ready to respond, provide your answer as a PLAIN TEXT message (NOT a tool call).
- IMPORTANT: Do NOT try to call a "json" tool or any non-existent tool. Just respond with the JSON as plain text in your message content.
- Do NOT output ANY text before or after the JSON object.
- Do NOT wrap the JSON in markdown code fences (no ```json).
- Do NOT include any commentary, explanation, or thinking outside the JSON.
- The JSON must conform EXACTLY to the schema defined in the template below.
- The "items" array in api_response MUST contain the "flights" array from the inspiration_recommend_flights call VERBATIM. Do NOT invent, alter, or restructure flight data.
- "api_response_type" MUST be exactly "compare_flights" when flights exist.
- "comparison_type" MUST be exactly "destination".
- "trigger_popup" MUST be true when flights exist, false otherwise.
- "ai_generated" and "message" MUST contain the SAME string.
- If the user explicitly asks to "save these" again or "shortlist" them, use `amadeus_save_flights_to_journey` manually, though step 3 usually handles it automatically.
- Keep tone enthusiastic, concise, and action-oriented.
- In the greeting text, do NOT list individual flights — just mention you found options. The frontend renders the flights as interactive cards from api_response.

FULL TEMPLATE AND FORMAT REFERENCE:

{_template_text}
""",
)
journey_inspiration_agent.name = "journey_inspiration_agent"
