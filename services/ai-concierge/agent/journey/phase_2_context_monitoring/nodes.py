from agent.utils.agent_compat import create_agent
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

# Import Phase 1 / Base tools if needed, but primarily Phase 2 tools
from agent.utils.booking_tools import (
    search_flights,
    book_flight_for_user,
    fetch_user_flight_information,
    update_passenger_information,
    get_coordinates
)
from agent.utils.recommendation_tools import (
    get_nearest_airport_with_travel_time,
    get_top_tourist_places,
    get_best_hotels
)
from agent.utils.checkin_tools import recommend_checkin_time_by_city

# Phase 2 Context Tools
from .context_tools import (
    get_flight_status,
    get_weather_forecast,
    get_traffic_conditions,
    get_airport_intelligence,
    get_current_location
)

load_dotenv()

# ---------- LLM ----------
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)

# ---------- Phase 2 Enhanced Agents ----------

booking_agent_v2 = create_agent(
    model=llm,
    tools=[
        search_flights, 
        book_flight_for_user, 
        fetch_user_flight_information, 
        update_passenger_information,
        get_coordinates, 
        get_weather_forecast, 
        get_flight_status, 
        get_traffic_conditions
    ],
    system_prompt="""You are a city-focused booking agent with real-time context capabilities. Follow these rules:
    1. Use EXACT city names provided by users.
    2. Pass city names directly to endpoints.
    3. Prefer using monitoring data from journey_context when provided (e.g. traffic, flight status, airport) before calling tools.
    4. Use get_flight_status for REAL-TIME updates on delays, gates, and status when not in context.
    5. Use get_traffic_conditions to estimate travel times to airports or between cities when not in context.
    6. Use get_weather_forecast for accurate weather predictions when not in context.
    7. Handle city name variations as raw strings.
    8. NEVER call tools unless ALL required parameters are explicitly provided by the user.
    9. If any required parameters are missing, ask the user to provide them.
    
    remember the flight id won't be provided by the user to book a flight so make sure to call search_flights first.
    """
)
booking_agent_v2.name = "booking_agent_v2"

recommendation_agent_v2 = create_agent(
    model=llm,
    tools=[
        get_nearest_airport_with_travel_time, 
        get_top_tourist_places, 
        get_best_hotels, 
        get_airport_intelligence,
        get_current_location
    ],
    system_prompt="""You are a smart recommendation assistant helping users with flights, tourism, and accommodations.  

1. **Nearest Airport & Travel Time** (`get_nearest_airport_with_travel_time`):  
   - If the user asks about their nearest airport, call this tool.  

2. **Airport Intelligence** (`get_airport_intelligence`):
   - Use this for security wait times, terminal info, and congestion levels.

3. **User Location** (`get_current_location`):
   - Use this if the user asks "where am I" or to ground recommendations in their current city.

4. **Tourist Attractions** (`get_top_tourist_places`):  
   - If the user requests tourist spots, check if `destination` is provided.  

5. **Hotel Recommendations** (`get_best_hotels`):  
   - If a hotel request is made, check for missing parameters.

6. **Response Handling**:  
   - Ask for missing details **only if needed** before tool execution.  
   - Maintain a natural, helpful tone.

7. **Context first**: Prefer using monitoring data from journey_context when provided (e.g. traffic, flight status, airport) before calling tools.
"""
)
recommendation_agent_v2.name = "recommendation_agent_v2"

checkin_agent_v2 = create_agent(
    model=llm,
    tools=[
        recommend_checkin_time_by_city, 
        get_airport_intelligence, 
        get_traffic_conditions,
        get_current_location
    ],
    system_prompt="""You are a precise check-in time advisor with real-time airport and traffic awareness.
    1. Prompt users for departure city, time, and travel class if missing.
    2. Use get_airport_intelligence to check current security wait times and airport congestion.
    3. Use get_traffic_conditions to factor in travel time to the airport.
    4. Use get_current_location if you need to know where the user is starting their journey from.
    5. Combine all factors (class, traffic, airport congestion) to provide THE most accurate check-in recommendation.
    6. Provide a clear, actionable recommendation: "We recommend checking in by [time] considering current security wait and traffic."
    7. Prefer using monitoring data from journey_context when provided (e.g. traffic, flight status, airport) before calling tools.
    """
)
checkin_agent_v2.name = "checkin_agent_v2"
