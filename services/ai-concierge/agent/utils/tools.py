import os
import requests
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from pinecone import Pinecone
import google.generativeai as genai
from geopy.distance import geodesic
from langchain_community.tools import TavilySearchResults
from langchain_groq import ChatGroq
from PIL import Image as PILImage
from io import BytesIO
from dotenv import load_dotenv
load_dotenv()

# Define the base URL
base_url = 'http://localhost:4001'

# Initialization for customerSupportAgent
try:
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY")

    if pinecone_api_key:
        pc = Pinecone(api_key=pinecone_api_key)
        index = pc.Index("airline")
    else:
        pc = None
        index = None

    if google_api_key:
        genai.configure(api_key=google_api_key)
        
except Exception as e:
    # Quietly fail to Avoid log pollution
    index = None


# Helper function to validate required parameters
def validate_required_params(params: dict, required: list) -> None:
    missing = [field for field in required if params.get(field) in (None, "")]
    if missing:
        raise ValueError(f"Missing user-provided parameters: {', '.join(missing)}")

# Tool for customerSupportAgent
@tool
def pdf_faq_retriever(query: str) -> Dict[str, Any]:
    """Retrieve verified answers from official documentation"""
    try:
        if not query or len(query) < 3:
            return {"error": "Please provide a more specific question"}
            
        if not index:
            return {"error": "Documentation system is currently unavailable"}
            
        embedding = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="retrieval_query"
        ).get('embedding', [])
        
        if not embedding:
            return {"error": "Failed to process your question"}
            
        results = index.query(
            vector=embedding,
            top_k=3,
            include_metadata=True,
            timeout=15
        )
        
        if not results.matches:
            return {"response": "No specific information found in our documentation"}
            
        # Return only clean text excerpts
        return {
            "response": "Documentation excerpts:\n" + 
            "\n\n".join(
                f"Excerpt {i+1}: {match.metadata.get('text', '')}" 
                for i, match in enumerate(results.matches)
            )
        }
        
    except Exception as e:
        print(f"GELF error: {e}")
        return {"error": "Unable to retrieve information at this time"}


# Tool for luggageAgent
@tool
def luggage_update(booking_id: str, count: int) -> Dict[str, Any]:
    """
    Updates luggage count with validation
    
    Args:
        booking_id (str): Valid booking reference
        count (int): New luggage count (0-10)
    
    Returns:
        dict: Update result or error
    """
    try:
        if not booking_id:
            raise ValueError("Booking ID is required")
        if not isinstance(count, int) or not (0 <= count <= 10):
            raise ValueError("Count must be integer between 0-10")
            
        response = requests.patch(
            f"{base_url}/api/admin/booking/update/luggage/{booking_id}",
            json={"luggage": count}
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e), "details": "Ensure booking ID is valid and count is numeric"}

# Tools for bookingAgent
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
        validate_required_params(locals(), ['departureAirport', 'arrivalAirport'])
        
        response = requests.get(
            f'{base_url}/api/ai/flight/get/airports',
            params={'departureAirport': departureAirport, 'arrivalAirport': arrivalAirport}
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e)}

@tool
def fetch_user_flight_information(reference_number: str) -> Dict[str, Any]:
    """
    Fetches user flight information with validation.
    
    REQUIRES FROM USER:
    - reference_number: Valid booking reference number
    
    Returns error if reference number is missing.
    """
    try:
        validate_required_params(locals(), ['reference_number'])
            
        response = requests.get(
            f'{base_url}/api/ai/booking/get/reference',
            params={'referenceNumber': reference_number}
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e)}

@tool
def book_flight_for_user(
    flight_id: str,
    passenger_email: str,
    passenger_phone: str,
    passenger_title: str,
    passenger_first_name: str,
    passenger_last_name: str,
    return_flight_id: str = None,
    trip_type: str = "round-trip"):
    """
    Books a flight for the user with the provided details.
    Args:
        flight_id (str): The ID of the departure flight.
        return_flight_id (str): The ID of the return flight.
        passenger_email (str): The passenger's email address.
        passenger_phone (str): The passenger's phone number.
        passenger_title (str): The passenger's title (e.g., Mr., Ms.).
        passenger_first_name (str): The passenger's first name.
        passenger_last_name (str): The passenger's last name.
        trip_type (str): The type of trip (e.g., round-trip, one-way).
    Returns:
        dict: A JSON response with booking details.
    """
    booking_data = {
        "data": {
            "flightId": flight_id,
            "returnFlightId": return_flight_id,
            "passengerUser": {
                "email": passenger_email,
                "phone": passenger_phone
            },
            "user": {
                "_id": "665094d65ca55d8ca46508b7"
            },
            "passengers": [
                {
                    "title": passenger_title,
                    "firstName": passenger_first_name,
                    "lastName": passenger_last_name
                }
            ],
            "currency": "USD",
            "totalBaggages": 0,
            "tripType": trip_type,
            "selectedSeats": [
                {
                    "rowId": "672db9ae92e02f6636aa8e23",
                    "seatId": "66a19176e537edf80fc3f67b"
                }
            ],
            "selectedSeatsReturn": [
                {
                    "rowId": "672b6ec4543affb35b033f1b",
                    "seatId": "66a19176e537edf80fc3f67b"
                }
            ],
            "seat": [
                {
                    "rowId": "672db9ae92e02f6636aa8e23",
                    "seatId": "66a19176e537edf80fc3f67b"
                }
            ],
            "CustomerInfo": {
                "docNo": None,
                "issuingCountry": None,
                "expirationDate": None,
                "nationality": None,
                "email": passenger_email
            }
        }
    }
    response = requests.post(f'{base_url}/api/ai/booking/checkout-session', json=booking_data)
    return response.json()

@tool
def update_passenger_information(updated_info: dict, flight_id: str) -> Dict[str, Any]:
    """
    Updates passenger info with validation.
    
    REQUIRES FROM USER:
    - updated_info: Complete passenger data dictionary
    - flight_id: Valid flight ID
    
    Returns error if any parameter is missing.
    """
    try:
        validate_required_params(locals(), ['updated_info', 'flight_id'])
            
        response = requests.patch(
            f'{base_url}/api/admin/booking/update/passengers/information/{flight_id}',
            json=updated_info
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        return {"error": str(e)}

# Tools for seatingAgent
@tool
def extract_seat_info(referenceNumber):
    """
    Retrieves the flight ID using a reference number and extracts the available and unavailable seats.

    Args:
        referenceNumber (str): The unique reference number provided by the user.

    Returns:
        dict: A dictionary containing lists of available and unavailable seats.
    """
    url = f"{base_url}/api/ai/booking/get/reference"

    payload = {
        "referenceNumber": referenceNumber
    }

    response = requests.get(url, json=payload)

    if response.status_code == 200:
        response_data = response.json()
        print(response_data)
        flight_id = response_data['data']['flightId']
        print(f"Flight ID: {flight_id}")
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}, Message: {response.text}")
    api_endpoint = f"{base_url}/api/admin/seats/getallsf/{flight_id}"
    try:
        response = requests.get(api_endpoint)
        response.raise_for_status()
        data = response.json()

        seats_dict = {
            "available": [],
            "unavailable": []
        }
        for row in data.get("allSeats", []):
            for seat in row.get("seats", []):
                seat_id = seat.get("seatId")
                seat_status = seat.get("status")
                if seat_status == "available":
                    seats_dict["available"].append(seat_id)
                elif seat_status == "unavailable":
                    seats_dict["unavailable"].append(seat_id)
        print("Seats Dictionary:", seats_dict)
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
    return seats_dict

@tool
def mock_update_seat(update_data: Dict[str, str]) -> Dict[str, str]:
    """
    Mock seat update tool.

    This function simulates updating a seat's status on a flight. It validates the input data to ensure
    all required fields are present and then returns a success message.

    Args:
        update_data (Dict[str, str]): A dictionary containing the seat update information. 
                                      Required fields are 'flightId', 'rowId', 'seatId', and 'status'.

    Returns:
        Dict[str, str]: A dictionary containing the status of the update operation. If the required fields
                        are missing, an error message is returned. Otherwise, a success message is returned.
    """
    required_fields = {"flightId", "rowId", "seatId", "status"}
    if not all(field in update_data for field in required_fields):
        return {"error": "Missing required fields in update data"}
        
    return {
        "status": "success",
        "message": "Seat updated successfully",
        "mockData": {
            "newStatus": update_data["status"],
            "confirmationCode": "MOCK-1234",
            "updatedAt": "2024-06-20T12:00:00Z"
        }
    }


@tool
def get_nearest_airport_with_travel_time() -> Dict[str, Optional[str]]:
    """
    Fetch the user's current location using IP-based geolocation, find the nearest airport, 
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

        # Step 3: Summarizing using Langchain Groq
        llm = ChatGroq(
            model="llama3-8b-8192",
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

        # Step 3: Summarizing using Langchain Groq
        llm = ChatGroq(
            model="mixtral-8x7b-32768",
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
def get_nearby_places(latitude: float, longitude: float, radius: int = 3000, types: list[str] = None) -> Dict[str, Any]:
    """
    Fetch nearby places using Google Places Nearby Search.
    
    Args:
        latitude (float): Latitude coordinate.
        longitude (float): Longitude coordinate.
        radius (int): Search radius in meters (default 3000).
        types (list[str]): List of place types (e.g., ["restaurant", "park"]).
    
    Returns:
        Dict[str, Any]: A dictionary containing a list of nearby places with details.
    """
    try:
        gm_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not gm_key:
            return {"error": "GOOGLE_MAPS_API_KEY not configured"}

        place_types = types or ["restaurant", "lodging", "library", "park", "cafe", "museum"]
        all_places = []

        for ptype in place_types:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            params = {
                "location": f"{latitude},{longitude}",
                "radius": str(radius),
                "type": ptype,
                "key": gm_key,
            }
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                continue
            
            data = resp.json()
            if data.get("status") not in ("OK", "ZERO_RESULTS"):
                continue
                
            for place in data.get("results", [])[:5]:
                photo_url = None
                if place.get("photos"):
                    photo_ref = place["photos"][0].get("photo_reference", "")
                    if photo_ref:
                        photo_url = (
                            f"https://maps.googleapis.com/maps/api/place/photo"
                            f"?maxwidth=400&photo_reference={photo_ref}&key={gm_key}"
                        )
                loc = place.get("geometry", {}).get("location", {})
                all_places.append({
                    "place_id": place.get("place_id", ""),
                    "name": place.get("name", ""),
                    "type": ptype,
                    "latitude": loc.get("lat"),
                    "longitude": loc.get("lng"),
                    "rating": place.get("rating"),
                    "user_ratings_total": place.get("user_ratings_total"),
                    "vicinity": place.get("vicinity", ""),
                    "photo_url": photo_url,
                    "icon": place.get("icon", ""),
                    "open_now": place.get("opening_hours", {}).get("open_now"),
                })

        # Deduplicate
        seen = set()
        unique = []
        for p in all_places:
            if p["place_id"] not in seen:
                seen.add(p["place_id"])
                unique.append(p)

        return {"status": "success", "places": unique}

    except Exception as e:
        return {"error": f"An error occurred: {e}"}
