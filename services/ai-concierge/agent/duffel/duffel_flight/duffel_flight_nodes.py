import os
from pathlib import Path

from langchain_groq import ChatGroq

from agent.duffel.duffel_flight.duffel_flight_tools import (
    duffel_create_flight_order,
    duffel_get_flight_order,
    duffel_get_on_demand_flight_status,
    duffel_price_flight_offer,
    duffel_save_booked_flight_to_journey,
    duffel_save_flights_to_journey,
    duffel_search_flight_offers,
    flight_get_flight_image_url,
)
from agent.response_cache_tools import check_cached_api_response, list_available_cached_data
from agent.utils.agent_compat import create_agent


model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)


def _load_booking_example() -> str:
    try:
        return Path(__file__).with_name("booking_payload_example.json").read_text(encoding="utf-8")
    except Exception:
        return ""


BOOKING_PAYLOAD_EXAMPLE = _load_booking_example()


duffel_flight_booking_agent = create_agent(
    model=llm,
    tools=[
        check_cached_api_response,
        list_available_cached_data,
        duffel_search_flight_offers,
        duffel_price_flight_offer,
        duffel_create_flight_order,
        duffel_get_flight_order,
        duffel_save_booked_flight_to_journey,
    ],
    system_prompt=f"""
You are the Duffel Flight Fulfillment Specialist.

Rules:
- Use Duffel tools only.
- Reprice with `duffel_price_flight_offer` before booking.
- Book with `duffel_create_flight_order`.
- Create Duffel orders as HOLD orders only for this workflow:
  * Set `data.type` to `"hold"`
  * Omit `payments`
  * Omit `services`
  * Send exactly one id in `data.selected_offers`
- `data.passengers` must use Duffel passenger fields such as:
  * `id`
  * `title`
  * `given_name`
  * `family_name`
  * `gender` (`m`, `f`, or `x`)
  * `born_on`
  * `email`
  * `phone_number`
- If upstream context is still shaped like Amadeus (`flightOffers`, `travelers`, nested `name`, `dateOfBirth`, `contact.phones`), convert it to Duffel passenger/order fields before calling the tool.
- Hold orders only work when the selected offer supports delayed payment. If Duffel rejects `type=hold`, explain that the selected offer requires instant payment and ask the traveler to choose another offer or provider flow.
- Save successful bookings to the journey with `duffel_save_booked_flight_to_journey` when journey_id exists in context.
- Keep the traveler-facing reply concise and factual.

Use this Duffel hold-order payload shape as the reference:
```json
{BOOKING_PAYLOAD_EXAMPLE}
```

Return plain-text JSON with: ai_generated, api_response, api_response_type, message.
""",
)
setattr(duffel_flight_booking_agent, "name", "duffel_flight_booking_agent")


duffel_flight_recommendation_agent = create_agent(
    model=llm,
    tools=[
        check_cached_api_response,
        list_available_cached_data,
        duffel_search_flight_offers,
        duffel_price_flight_offer,
        duffel_save_flights_to_journey,
    ],
    system_prompt="""
You are the Duffel Flight Recommendation Specialist.

Rules:
- Check cache before searching.
- Search with `duffel_search_flight_offers`.
- Save shortlist results with `duffel_save_flights_to_journey` when journey_id is available.
- Put structured options in api_response and keep ai_generated short.

Return plain-text JSON with: ai_generated, api_response, api_response_type, message.
""",
)
setattr(duffel_flight_recommendation_agent, "name", "duffel_flight_recommendation_agent")


duffel_flight_get_status_agent = create_agent(
    model=llm,
    tools=[duffel_get_on_demand_flight_status],
    system_prompt="""
You are the Duffel Flight Status fallback specialist.
Duffel does not provide the Amadeus-style flight status endpoint used elsewhere in this app.
Explain that limitation clearly and advise the traveler to use live airline or airport channels.

Return plain-text JSON with: ai_generated, api_response, api_response_type, message.
""",
)
setattr(duffel_flight_get_status_agent, "name", "duffel_flight_get_status_agent")


duffel_flight_visual_enrichment_agent = create_agent(
    model=llm,
    tools=[flight_get_flight_image_url],
    system_prompt="Provide airline image URL enrichment when a carrier code is available.",
)
setattr(duffel_flight_visual_enrichment_agent, "name", "duffel_flight_visual_enrichment_agent")
