import datetime
import os
import requests
from typing import Dict, Any
from langchain_core.tools import tool

AERODATABOX_API_KEY = os.getenv("AERODATABOX_API_KEY")

def infer_icao_code_from_city(city_name: str) -> str:
    """
    Helper function to infer ICAO airport code from city name.
    This is a simplified version - in production, you'd want to use a proper airport database.
    """
    # This is a placeholder - in production, you'd want to use a proper airport database
    # or API to get the correct ICAO code
    return "KJFK"  # Default to JFK for example

@tool
def recommend_checkin_time_by_city(departure_city: str, departure_time_str: str, travel_class: str = "economy", user_id: str = None) -> str:
    """
    Recommends an optimal check-in time based on departure city, flight time, and travel class.
    
    REQUIRES FROM USER:
    - departure_city: Name of the departure city
    - departure_time_str: Departure time in ISO format (YYYY-MM-DDTHH:MM:SS)
    - travel_class: Class of travel ('economy', 'business', or 'first'), defaults to 'economy'
    - user_id: Optional - The unique identifier for the user
    
    The recommendation factors in:
    - Airport congestion levels from AeroDataBox API
    - Different buffer times based on travel class
    - Additional padding for high congestion periods
    
    Returns:
        A string with the recommended check-in time and explanation of factors considered
    """
    try:
        airport_code = infer_icao_code_from_city(departure_city)
        if not airport_code:
            return f"Could not determine ICAO airport code for {departure_city}."

        departure_time = datetime.datetime.strptime(departure_time_str, "%Y-%m-%dT%H:%M:%S")
        hour_to_check = departure_time.replace(minute=0, second=0).isoformat()

        headers = {
            "X-RapidAPI-Key": AERODATABOX_API_KEY,
            "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
        }

        congestion_url = f"https://aerodatabox.p.rapidapi.com/airports/icao/{airport_code}/stats/departures/{hour_to_check}"
        response = requests.get(congestion_url, headers=headers)
        congestion_data = response.json()
        congestion_level = congestion_data.get("departureStatistics", {}).get("congestionLevel", "unknown")

        class_padding = {
            "economy": 3,
            "business": 2,
            "first": 1.5
        }.get(travel_class.lower(), 3)

        congestion_delay = {
            "low": 1,
            "medium": 2,
            "high": 3
        }.get(congestion_level.lower(), 2)

        checkin_time = departure_time - datetime.timedelta(hours=(class_padding + congestion_delay))
        return f"Based on your flight from {departure_city} at {departure_time_str} with {travel_class} class and {congestion_level} congestion, you should check in by {checkin_time.strftime('%Y-%m-%d %H:%M')}"

    except Exception as e:
        return f"Failed to recommend check-in time: {str(e)}"
