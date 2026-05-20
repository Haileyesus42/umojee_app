import os
import requests
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from geopy.distance import geodesic
from langchain_community.tools import TavilySearchResults
from langchain_groq import ChatGroq
from PIL import Image as PILImage
from io import BytesIO
from datetime import datetime, timedelta

AERODATABOX_API_KEY = os.getenv("AERODATABOX_API_KEY")

def _get_aerodatabox_key() -> Optional[str]:
    """Return the configured Aerodatabox API key if present."""
    return AERODATABOX_API_KEY or os.getenv("AERODATABOX_API_KEY")

def check_required_apis():
    required_keys = {
        "TAVILY_API_KEY": os.getenv("TAVILY_API_KEY"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        "GOOGLE_MAPS_API_KEY": os.getenv("GOOGLE_MAPS_API_KEY"),
        "AERODATABOX_API_KEY": AERODATABOX_API_KEY
    }

    missing_keys = [key for key, value in required_keys.items() if not value]
    if missing_keys:
        raise EnvironmentError(f"Missing required API keys: {', '.join(missing_keys)}")

@tool
def get_nearest_airport_with_travel_time() -> Dict[str, Optional[str]]:
    """
    Fetch the user's current location using Google Geolocation API, find the nearest airport,
    and estimate travel time using Google Maps Directions API.

    Returns:
        Dict[str, Optional[str]]: A dictionary containing the nearest airport name, distance in km,
                                  coordinates, and estimated travel time. If any step fails, an error message is returned.
    """
    try:
        GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
        if not GOOGLE_MAPS_KEY:
            return {"error": "GOOGLE_MAPS_API_KEY not configured"}

        # Step 1: Fetch user's current location via Google Geolocation API
        geo_resp = requests.post(
            f"https://www.googleapis.com/geolocation/v1/geolocate?key={GOOGLE_MAPS_KEY}",
            json={"considerIp": True},
            timeout=10,
        )
        if geo_resp.status_code != 200:
            return {"error": "Failed to fetch location from Google Geolocation API"}

        geo_data = geo_resp.json()
        location = geo_data.get("location", {})
        lat, lon = location.get("lat", 0), location.get("lng", 0)
        user_location = (lat, lon)

        # Step 2: List of major airports with coordinates
        airports = {
            "Cheddi Jagan International Airport (Georgetown)": (6.4985, -58.2541),
            "Piarco International Airport (Port of Spain)": (10.5953, -61.3372),
            "Crown Point International Airport (Scarborough)": (11.1497, -60.8322),
            "Miami International Airport (Miami)": (25.7959, -80.2870),
            "Toronto Pearson International Airport (Toronto)": (43.6777, -79.6248),
            "Norman Manley International Airport (Kingston)": (17.9357, -76.7875),
            "José Martí International Airport (Havana)": (22.9892, -82.4091),
        }

        # Step 3: Find the nearest airport
        nearest_airport = None
        min_distance = float("inf")

        for airport_name, airport_coords in airports.items():
            distance = geodesic(user_location, airport_coords).kilometers
            if distance < min_distance:
                min_distance = distance
                nearest_airport = {
                    "airport_name": airport_name,
                    "distance_km": round(min_distance, 2),
                    "coordinates": {
                        "latitude": airport_coords[0],
                        "longitude": airport_coords[1]
                    }
                }

        if not nearest_airport:
            return {"error": "No nearby airport found"}

        # Step 4: Estimate travel time using Google Maps Directions API
        try:
            directions_resp = requests.get(
                "https://maps.googleapis.com/maps/api/directions/json",
                params={
                    "origin": f"{lat},{lon}",
                    "destination": f"{nearest_airport['coordinates']['latitude']},{nearest_airport['coordinates']['longitude']}",
                    "mode": "driving",
                    "key": GOOGLE_MAPS_KEY,
                },
                timeout=10,
            )
            if directions_resp.status_code == 200:
                dir_data = directions_resp.json()
                if dir_data.get("status") == "OK" and dir_data.get("routes"):
                    leg = dir_data["routes"][0]["legs"][0]
                    duration_sec = leg["duration"]["value"]
                    travel_time_min = round(duration_sec / 60)
                    nearest_airport["travel_time"] = f"{travel_time_min} mins"
                else:
                    nearest_airport["travel_time"] = "Route not available"
            else:
                nearest_airport["travel_time"] = "Error fetching directions"
        except Exception as e:
            nearest_airport["travel_time"] = f"Error estimating travel time: {e}"

        return nearest_airport

    except Exception as e:
        return {"error": f"An error occurred: {e}"}


@tool
def get_top_tourist_places(destination: str) -> Dict[str, Optional[str]]:
    """
    Fetch top tourist places for a given destination using TavilySearchResults and summarize 
    them using Langchain Groq.

    Args:
        destination (str): The location for which tourist places need to be retrieved.

    Returns:
        Dict[str, Optional[str]]: A dictionary containing the summarized tourist places.
                                  If any step fails, an error message is returned.
    """
    try:
        # Step 1: Search for tourist places
        tool = TavilySearchResults(
            max_results=5,
            search_depth="advanced",
            include_answer=True,
            include_raw_content=True,
            include_images=True,
        )
        result = tool.invoke({"query": f"top tourist places in {destination}"})

        # Step 2: Extract relevant content
        content_list = [item['content'] for item in result]
        extracted_content = "\n".join(content_list)

        if not extracted_content:
            return {"error": "No relevant tourist places found for this destination."}

        # Step 3: Updating to use llama-3.3-70b-versatile model
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=None,
            timeout=None,
            max_retries=2,
        )
        messages = [
            ("system", "You are a helpful assistant that extracts and summarizes only tourist attractions and must-visit places from the given content. Exclude any unrelated information."),
            ("human", extracted_content),
        ]
        ai_msg = llm.invoke(messages)

        return {"destination": destination, "summary": ai_msg.content}

    except Exception as e:
        return {"error": f"An error occurred: {e}"}

@tool
def get_best_hotels(destination: str, budget: str, star_rating: str, location_preference: str) -> Dict[str, Optional[str]]:
    """
    Fetch the best hotel recommendations based on budget, star rating, and location preference,
    summarize them, and include images and booking links.

    Args:
        destination (str): The location where hotels are being searched.
        budget (str): Budget range (low, medium, high).
        star_rating (str): Preferred star rating (e.g., 3, 4, 5).
        location_preference (str): Specific location preference (e.g., near city center, near airport).

    Returns:
        Dict[str, Optional[str]]: A dictionary containing the summarized hotel recommendations,
                                  images, and booking links. If any step fails, an error message is returned.
    """
    try:
        # Step 1: Search for hotels
        tool = TavilySearchResults(
            max_results=5,
            search_depth="advanced",
            include_answer=True,
            include_raw_content=True,
            include_images=True,
        )
        result = tool.invoke({"query": f"best {star_rating}-star hotels in {destination} within {budget} budget near {location_preference} with booking links"})

        # Step 2: Extract relevant content, images, and links
        content_list = [item['content'] for item in result]
        image_list = [img for item in result for img in item.get('images', [])]  # Flatten list of image URLs
        link_list = [item.get('url', '') for item in result]
        extracted_content = "\n".join(content_list)

        if not extracted_content:
            return {"error": "No relevant hotel recommendations found for this query."}

        # Step 3: Updating to use llama-3.3-70b-versatile model
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=None,
            timeout=None,
            max_retries=2,
        )
        messages = [
            ("system", "You are a helpful assistant that extracts and summarizes only the best hotel recommendations based on the provided criteria. Include booking links where available. Exclude any unrelated information."),
            ("human", extracted_content),
        ]
        ai_msg = llm.invoke(messages)

        # Step 4: Display images (optional)
        for img_url in image_list[:3]:  # Show up to 3 images
            try:
                response = requests.get(img_url)
                img = PILImage.open(BytesIO(response.content))
                img.show()  # Open the image in an external viewer
            except Exception as e:
                print(f"Error loading image: {img_url} - {e}")

        return {
            "destination": destination,
            "summary": ai_msg.content,
            "booking_links": link_list
        }

    except Exception as e:
        return {"error": f"An error occurred: {e}"}

@tool
def infer_icao_code_from_city(city_name: str) -> Optional[str]:
    """
    Helper function to infer ICAO code from city name.
    """
    api_key = _get_aerodatabox_key()
    if not api_key:
        print("AERODATABOX_API_KEY environment variable is not set.")
        return None

    url = f"https://aerodatabox.p.rapidapi.com/airports/search/term?q={city_name}&limit=1"
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
    }
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        return data['items'][0]['icao'] if data['items'] else None
    except Exception as e:
        print(f"❌ Failed to infer ICAO: {e}")
        return None

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
    - Airport congestion levels
    - Travel class specific requirements
    - Standard processing times
    
    Returns:
        str: A formatted string with the recommended check-in time or an error message
    """
    try:
        api_key = _get_aerodatabox_key()
        if not api_key:
            return "AERODATABOX_API_KEY environment variable is not set."

        airport_code = infer_icao_code_from_city(departure_city)
        if not airport_code:
            return f"Could not determine ICAO airport code for {departure_city}."

        departure_time = datetime.strptime(departure_time_str, "%Y-%m-%dT%H:%M:%S")
        hour_to_check = departure_time.replace(minute=0, second=0).isoformat()

        headers = {
            "X-RapidAPI-Key": api_key,
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

        checkin_time = departure_time - timedelta(hours=(class_padding + congestion_delay))
        return f"Based on your flight from {departure_city} at {departure_time_str} with {travel_class} class and {congestion_level} congestion, you should check in by {checkin_time.strftime('%Y-%m-%d %H:%M')}"

    except Exception as e:
        return f"Failed to recommend check-in time: {str(e)}"
