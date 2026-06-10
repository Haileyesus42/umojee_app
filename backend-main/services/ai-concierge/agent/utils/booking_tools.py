import datetime
import os
import requests
import json
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from agent.utils.checkin_tools import infer_icao_code_from_city
base_url = 'https://enzo01.flyumojaairways.com'

AERODATABOX_API_KEY = os.getenv("AERODATABOX_API_KEY")


def fetch_user_information(user_id: str) -> Dict[str, Any]:
    """
    Fetches user profile information including username, email, preferences, past bookings,
    and other relevant data from the backend using the new endpoint.
    Args:
        user_id (str): The unique identifier for the user (e.g., user ID).
    Returns:
        dict: User profile information including email, preferences, bookings, and other data.
    """
    try:
        if not user_id:
            raise ValueError("User ID is required")

        profile_response = requests.get(
            f"{base_url}/api/ai/user/get/{user_id}"
        )
        profile_response.raise_for_status()
        
        profile_data = profile_response.json()
        user_data = profile_data.get('data', {}).get('user', {})
        user_profile = {
            "user_id": user_data.get("_id", "N/A"),
            "email": user_data.get("email", "N/A"),
            "first_name": user_data.get("firstName", "N/A"),
            "last_name": user_data.get("lastName", "N/A"),
            "country": user_data.get("country", "N/A"),
            "country_code": user_data.get("countryCode", "N/A"),
            "dob": user_data.get("dob", "N/A"),
            "phone": user_data.get("phone", "N/A"),
            "preferences": user_data.get("preferences", {}),
            "bookings": user_data.get("bookings", []),
            "is_blocked": user_data.get("isBlocked", False),
            "verified": user_data.get("verified", False),
            "active": user_data.get("active", False),
            "created_at": user_data.get("createdAt", "N/A"),
            "updated_at": user_data.get("updatedAt", "N/A"),
            "photo": user_data.get("photo", "N/A")
        }

        return user_profile

    except Exception as e:
        return {"error": str(e), "details": "Unable to fetch user profile information"}
        
@tool
def search_flights(departureAirport: str, arrivalAirport: str) -> Dict[str, Any]:
    """
    Retrieves available flights between airports with parameter validation.
    
    REQUIRES FROM USER:
    - departureAirport: EXACT city name (e.g. "New York")
    - arrivalAirport: EXACT city name (e.g. "London")
    
    Returns error if any parameter is missing.
    """
    try:        
        response = requests.get(
            f'{base_url}/api/ai/flight/get/airports',
            params={'departureAirport': departureAirport, 'arrivalAirport': arrivalAirport}
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e)}

@tool
def fetch_user_flight_information(user_id: str) -> Dict[str, Any]:
    """
    Fetches user's flight booking history.
    REQUIRES FROM USER:
    - user_id: The unique identifier of the user
    
    Returns a dictionary containing the user's flight booking history or error details.
    """
    try:
        response = requests.get(
            f'{base_url}/api/ai/user/booking/history/{user_id}'
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

@tool
def book_flight_for_user(user_id: str, flight_id: str, trip_type: str = "one-way") -> Dict[str, Any]:
    """Tool for booking a flight for a user.

    REQUIRES FROM USER:
    - user_id: The unique identifier for the user (required)
    - flight_id: The unique identifier for the flight to book (required). you should take this from the flight that the user selected. the user doesn't provide this information
    - trip_type: Type of trip, either "one-way" or "round-trip" (optional, defaults to "one-way")
    Returns:
        Dict containing either:
        - Success: Booking confirmation details
        - Error: Error message in {"error": "message"} format
    """
    try:
        if not user_id or not flight_id:
            error_msg = "Missing required parameters"
            return {"error": error_msg}
        user_info = fetch_user_information(user_id)
        booking_data = {
            "data": {
                "flightId": flight_id,
                "returnFlightId": None,
                "passengerUser": {
                    "email": user_info.get("email"),
                    "phone": user_info.get("phone")
                },
                "user": {
                    "_id": user_id
                },
                "passengers": [
                    {
                        "title": "Mr",
                        "firstName": user_info.get("first_name"),
                        "lastName": user_info.get("last_name")
                    }
                ],
                "currency": "USD",
                "totalBaggages": 0,
                "tripType": trip_type,
                "selectedSeats": [
                    {
                        "rowId": None,
                        "seatId": None
                    }
                ],
                "selectedSeatsReturn": [
                    {
                        "rowId": None,
                        "seatId": None
                    }
                ],
                "seat": [
                    {
                        "rowId": None,
                        "seatId": None
                    }
                ],
                "CustomerInfo": {
                    "email": user_info.get("email")
                }
            }
        }
        try:
            response = requests.post(
                f'{base_url}/api/ai/booking/checkout-session/{user_id}',
                json=booking_data,
                timeout=30
            )
            response.raise_for_status()            
            return response.json() 
        except requests.exceptions.RequestException as e:
            error_msg = f"API request failed: {str(e)}"
            return {"error": error_msg}      
    except Exception as e:
        return {"error": str(e)}

@tool
def update_passenger_information(updated_info: dict, user_id: str) -> Dict[str, Any]:
    """
    Updates passenger info with validation.
    REQUIRES FROM USER:
    - updated_info: Complete passenger data dictionary
    - user_id: Valid user id
    Returns error if any parameter is missing.
    """
    try:
        user_information = fetch_user_information(user_id)
        flight_id = user_information._id           
        response = requests.patch(
            f'{base_url}/api/admin/booking/update/passengers/information/{flight_id}',
            json=updated_info
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e)}

@tool
def get_coordinates(city_name: str) -> tuple:
    """
    Converts a city name to latitude and longitude using the Google Maps Geocoding API.
    :param city_name: Name of the city
    :return: Tuple of (latitude, longitude) or (None, None) if not found
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None, None

    url = "https://maps.googleapis.com/maps/api/geocode/json"

    try:
        response = requests.get(url, params={"address": city_name, "key": api_key}, timeout=10)
        data = response.json()

        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
        else:
            return None, None
    except Exception as e:
        print(f"Error fetching coordinates: {e}")
        return None, None

@tool
def get_weather_forecast(city_name: str) -> str:
    """
    Fetches the weather forecast for a given city from OpenWeatherMap API.
    :param city_name: Name of the city to get weather for
    :return: Weather description (e.g., "Clear sky, 22°C")
    """
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    
    if not api_key:
        return "API key not found in environment variables."

    # Get coordinates for the city
    lat, lon = get_coordinates(city_name)
    if lat is None or lon is None:
        return f"Could not find coordinates for {city_name}."

    url = f"https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude=minutely,hourly,alerts&appid={api_key}&units=metric"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        if response.status_code == 200:
            current_weather = data["current"]
            weather_description = current_weather["weather"][0]["description"]
            temperature = current_weather["temp"]
            return f"Weather in {city_name}: {weather_description}, Temperature: {temperature}°C"
        else:
            return f"Weather data not available for {city_name}."
    except Exception as e:
        return f"Error fetching weather data for {city_name}: {str(e)}"
    
@tool
def recommend_checkin_time_by_city(user_id: str, departure_city: str, departure_time_str: str, travel_class: str = "economy") -> str:
    """
    Recommends an optimal check-in time based on departure city, flight time, and travel class.
    
    REQUIRES FROM USER:
    - user_id: The unique identifier for the user
    - departure_city: Name of the departure city
    - departure_time_str: Departure time in ISO format (YYYY-MM-DDTHH:MM:SS)
    - travel_class: Class of travel ('economy', 'business', or 'first'), defaults to 'economy'
    
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

        departure_time = datetime.strptime(departure_time_str, "%Y-%m-%dT%H:%M:%S")
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

