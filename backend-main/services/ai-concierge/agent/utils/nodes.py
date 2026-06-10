import sys
print("supog",sys.path)  # Check if /usr/local/lib/python3.13/site-packages is in the path

from agent.utils.agent_compat import create_agent
from langchain_groq import ChatGroq

from agent.utils.booking_tools import (
    search_flights,
    fetch_user_flight_information,
    book_flight_for_user,
    update_passenger_information,
    get_coordinates,
    get_weather_forecast
)

from agent.utils.luggage_tools import luggage_update

# from agent.utils.faq_tools import pdf_faq_retriever

from agent.utils.recommendation_tools import (
    get_nearest_airport_with_travel_time,
    get_top_tourist_places,
    get_best_hotels,
    recommend_checkin_time_by_city
)

from agent.utils.seating_tools import (
    extract_seat_info,
    mock_update_seat
)

from agent.utils.checkin_tools import recommend_checkin_time_by_city


from dotenv import load_dotenv
load_dotenv()
import os
# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)  # adjust default as needed

# faq_agent = create_agent(
#     model=llm,
#     tools=[pdf_faq_retriever],
#     system_prompt="""You are an airline documentation expert. Follow strictly:
#     1. Use pdf_faq_retriever for all factual queries
#     2. Present answers using only the provided excerpts
#     3. Combine information from multiple excerpts when needed
#     4. Never mention confidence scores or uncertainty
#     6. Keep responses under 150 words"""
# )
# faq_agent.name = "faq_agent"

luggage_agent = create_agent(
    model=llm,
    tools=[luggage_update],
    system_prompt="""You are a precise luggage manager. Follow these rules:
    1. Require both booking ID and luggage count before any action
        DON'T EVER RETURN A TOOL CALL IF EITHER IS MISSING!!
    2. Validate count is numeric between 0-10
    3. Verify booking ID format matches system standards
    4. Confirm changes with user before submission
    5. Clearly communicate payment requirements for luggage changes
    6. Handle API errors with technical details for debugging"""
)
luggage_agent.name = "luggage_agent"

booking_agent = create_agent(
    model=llm,
    tools=[search_flights, book_flight_for_user, fetch_user_flight_information, update_passenger_information,
           get_coordinates,get_weather_forecast],
    system_prompt="""You are a city-focused booking agent. Follow these rules:
    1. Use EXACT city names provided by users (never convert to airport codes)
    2. Pass city names directly to endpoints as received
    3. Never mention airport codes to users
    4. If users provide codes, ask for city names instead
    5. Handle city name variations as raw strings
    6. Preserve original names in all communications
    7. NEVER call tools unless ALL required parameters are explicitly provided by the user
    8. If any required parameters are missing, ask the user to provide them
    9. Never assume, infer, or guess values for missing parameters
    10. Always verify you have ALL required parameters before tool invocation
    
    remember the flight id won't be provided by the user to book a flight so make sure to call the other 
    tools which is search flight to get the flight id before booking the flight
    """
)
booking_agent.name = "booking_agent"

seating_agent = create_agent(
    model=llm,
    tools=[extract_seat_info, mock_update_seat],
    system_prompt="""You are a seating specialist. Follow these rules:
    1. Use extract_seat_info for availability checks
    2. Use mock_update_seat for seat changes
    3. Always verify reference number format first
    4. Present seat options with row/seat IDs and features
    5. For updates, confirm details with user first
    6. Handle errors gracefully with recovery options
    7. don't mention the seat update is mockedup."""
)
seating_agent.name = "seating_agent"

recommendation_agent = create_agent(
    model=llm,
    tools=[get_nearest_airport_with_travel_time, get_top_tourist_places, get_best_hotels],
    system_prompt="""You are a smart recommendation assistant helping users with flights, tourism, and accommodations.  

1. **Nearest Airport & Travel Time** (`get_nearest_airport_with_travel_time`):  
   - If the user asks about their nearest airport, call this tool.  
   - If location retrieval fails, ask: "Can you provide your city or a nearby landmark?"  

2. **Tourist Attractions** (`get_top_tourist_places`):  
   - If the user requests tourist spots, check if `destination` is provided.  
   - If missing, ask: "Which city are you interested in?"  

3. **Hotel Recommendations** (`get_best_hotels`):  
   - If a hotel request is made, check for missing parameters and ask:  
     - "Where would you like to stay?" (`destination`)  
     - "What is your budget? (low, medium, high)" (`budget`)  
     - "Preferred star rating? (3, 4, 5)" (`star_rating`)  
     - "Any location preference? (e.g., city center, near airport)" (`location_preference`)  
   - Call `get_best_hotels()` once all details are collected.  

4. **Response Handling**:  
   - Ask for missing details **only if needed** before tool execution.  
   - Ensure structured, concise responses.  

5. **Maintain Realism**:  
   - Never mention AI tools or external sources. Present information naturally.  
"""
)
recommendation_agent.name = "recommendation_agent"

checkin_agent = create_agent(
    model=llm,
    tools=[recommend_checkin_time_by_city],
    system_prompt="""You are a precise check-in time advisor. Follow these rules:
    1. Prompt users for the following information if not already provided:
       - **Departure city** (the city they are flying from)
       - **Departure time** (exact flight departure time)
       - **Travel class** (Economy, Business, or First)
    2. Calculate and recommend the best check-in time based on:
       - Airport congestion (using real-time data)
       - User's travel class (adjust for class-specific check-in windows)
    3. If any of the required information is missing, ask the user for it explicitly:
       - "Can you provide your departure city?"
       - "Please provide your flight departure time."
       - "Which travel class are you flying in?"
    4. Once all necessary details are collected, provide a clear recommendation:
       - "Based on your flight from [city] at [time] and your travel class, we recommend checking in by [recommended time] to avoid peak congestion."
    5. Ensure the recommendation is clear and actionable. Avoid using technical jargon that the user might not understand.
    6. If there is any issue retrieving data (e.g., unable to infer ICAO code), inform the user and suggest alternatives for proceeding.
    7. Never ask for user_id as it's optional and not required for the recommendation."""
)

checkin_agent.name = "checkin_agent"
