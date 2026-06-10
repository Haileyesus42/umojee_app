import os
import sys
import requests
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta, timezone
from langchain_core.tools import tool

# Add parent directories to path to import amadeus module
current_dir = os.path.dirname(os.path.abspath(__file__))
phase_2_dir = current_dir
journey_dir = os.path.dirname(phase_2_dir)
agent_dir = os.path.dirname(journey_dir)
sys.path.insert(0, agent_dir)

from amadeus.amadeus_make_request import _make_amadeus_request, _get_access_token
from agent.config import TravelProviderConfig

logger = logging.getLogger(__name__)

# Constants for API Keys (should be in .env)
# Note: Amadeus credentials are managed in amadeus_make_request.py

# Google Maps API for traffic/routing (requires API key)
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# OpenWeatherMap for weather
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")


@tool
def get_current_location(
    user_id: str,
    browser_lat: Optional[float] = None,
    browser_lon: Optional[float] = None,
    browser_city: Optional[str] = None,
    browser_country: Optional[str] = None,
    browser_detected_at: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get the current physical location of a user to provide location-aware travel assistance.

    If browser geolocation coordinates are provided (from the frontend WebSocket),
    those are returned directly. Otherwise falls back to IP-based geolocation.

    Args:
        user_id (str): The unique identifier of the user to track.
        browser_lat (float, optional): Latitude from browser geolocation.
        browser_lon (float, optional): Longitude from browser geolocation.
        browser_city (str, optional): City name from reverse geocoding.
        browser_country (str, optional): Country from reverse geocoding.
        browser_detected_at (str, optional): ISO timestamp of when the browser location was detected.

    Returns:
        Dict[str, Any]: A dictionary containing:
            - latitude (float): Latitude coordinate.
            - longitude (float): Longitude coordinate.
            - city (str): Name of the detected city.
            - country (str): ISO country code.
            - accuracy_meters (int): Estimated precision of the location.
            - detected_at (str): ISO 8601 timestamp of detection.
            - source (str): Method used (e.g., 'browser_geolocation', 'ipinfo', 'mock_data').
    """
    # 1. Use browser geolocation if available (from WebSocket location_update)
    if browser_lat is not None and browser_lon is not None:
        return {
            "latitude": browser_lat,
            "longitude": browser_lon,
            "city": browser_city or "Unknown",
            "country": browser_country or "Unknown",
            "accuracy_meters": 50,
            "detected_at": browser_detected_at or datetime.now(timezone.utc).isoformat(),
            "source": "browser_geolocation",
        }

    # 2. Fallback: Google Maps Geolocation API (IP-based approximation)
    try:
        if GOOGLE_MAPS_API_KEY:
            response = requests.post(
                f"https://www.googleapis.com/geolocation/v1/geolocate?key={GOOGLE_MAPS_API_KEY}",
                json={"considerIp": True},
                timeout=10,
            )
            if response.status_code == 200:
                data = response.json()
                location = data.get("location", {})
                lat = location.get("lat", 0)
                lon = location.get("lng", 0)
                accuracy = data.get("accuracy", 5000)
                # Reverse geocode to get city name
                city = "Unknown"
                country = "Unknown"
                try:
                    geo_resp = requests.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"latlng": f"{lat},{lon}", "key": GOOGLE_MAPS_API_KEY},
                        timeout=10,
                    )
                    if geo_resp.status_code == 200:
                        geo_data = geo_resp.json()
                        if geo_data.get("status") == "OK" and geo_data.get("results"):
                            for comp in geo_data["results"][0].get("address_components", []):
                                if "locality" in comp.get("types", []):
                                    city = comp["long_name"]
                                if "country" in comp.get("types", []):
                                    country = comp["short_name"]
                except Exception:
                    pass
                return {
                    "latitude": lat,
                    "longitude": lon,
                    "city": city,
                    "country": country,
                    "accuracy_meters": int(accuracy),
                    "detected_at": datetime.now(timezone.utc).isoformat(),
                    "source": "google_geolocation",
                }
    except Exception as e:
        logger.error(f"Failed to determine user location via Google Geolocation: {e}")

    # No location source available — return an error instead of fake coordinates
    logger.error(
        f"get_current_location: unable to resolve location for user {user_id}. "
        "No browser geolocation provided and ipinfo fallback failed."
    )
    return {
        "error": "Failed to determine user location",
        "source": "none",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }


@tool
def get_flight_status(flight_number: str, flight_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Get real-time flight status, gate info, and delay updates for a specific flight.
    Uses Amadeus Flight Status API for accurate, real-time flight data.
    Uses Amadeus Flight Status API for accurate, real-time flight data.
    
    Args:
        flight_number (str): The flight number (e.g., 'LH400' or 'UA 123').
            For provider-order based checks, this may also be the booked order id
            (for example a Duffel order id like `ord_...`).
        flight_date (str, optional): The date of the flight in 'YYYY-MM-DD' format. 
                                    Defaults to current day if not provided.
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - flight_number (str): Standardized flight identifier.
            - airline (str): Name of the operating airline.
            - status (str): Current flight status (e.g., 'On Time', 'Delayed', 'Landed').
            - status (str): Current flight status (e.g., 'On Time', 'Delayed', 'Landed').
            - departure_airport (str): IATA code of the origin airport.
            - arrival_airport (str): IATA code of the destination airport.
            - scheduled_departure (str): Original scheduled departure time (ISO).
            - estimated_departure (str): Most recent estimated departure time (ISO).
            - actual_departure (str, optional): Actual time off (ISO) if departed.
            - gate (str): Departure gate and terminal info (e.g., 'T4 G12').
            - delay_minutes (int): Current delay in minutes.
            - last_updated (str): Timestamp of the last data sync.
            - source (str): Data source ('amadeus' or 'mock_data')
            - source (str): Data source ('amadeus' or 'mock_data')
    """
    # Standardize flight number (remove spaces)
    f_num = flight_number.replace(" ", "").upper()
    date = flight_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_provider = TravelProviderConfig.get_provider()

    if active_provider == "duffel":
        try:
            from agent.duffel.duffel_flight.duffel_flight_tools import (
                duffel_get_on_demand_flight_status,
            )

            if f_num.startswith("ORD_"):
                order_result = duffel_get_on_demand_flight_status.invoke({
                    "carrier_code": "",
                    "flight_number": f_num.lower(),
                    "scheduled_departure_date": date,
                    "optional_params": {"order_id": f_num.lower()},
                })

                if order_result.get("error"):
                    return {
                        "error": order_result.get("error"),
                        "flight_number": f_num,
                        "flight_date": date,
                        "source": "error",
                        "provider": "duffel",
                        "details": order_result.get("details", {}),
                    }

                order = order_result.get("data", order_result)
                slices = order.get("slices", []) if isinstance(order, dict) else []
                if not slices:
                    return {
                        "error": "No Duffel slices found in booked order.",
                        "flight_number": f_num,
                        "flight_date": date,
                        "source": "error",
                        "provider": "duffel",
                    }

                first_slice = slices[0] if isinstance(slices[0], dict) else {}
                segments = first_slice.get("segments", [])
                if not segments:
                    return {
                        "error": "No Duffel segments found in booked order.",
                        "flight_number": f_num,
                        "flight_date": date,
                        "source": "error",
                        "provider": "duffel",
                    }

                first_segment = segments[0] if isinstance(segments[0], dict) else {}
                last_segment = segments[-1] if isinstance(segments[-1], dict) else {}
                origin = first_segment.get("origin", {}) if isinstance(first_segment.get("origin"), dict) else {}
                destination = last_segment.get("destination", {}) if isinstance(last_segment.get("destination"), dict) else {}
                marketing_carrier = first_segment.get("marketing_carrier", {}) if isinstance(first_segment.get("marketing_carrier"), dict) else {}
                operating_carrier = first_segment.get("operating_carrier", {}) if isinstance(first_segment.get("operating_carrier"), dict) else {}
                carrier = marketing_carrier or operating_carrier
                carrier_iata = carrier.get("iata_code", "")
                airline_name = carrier.get("name") or carrier_iata or "Duffel Flight"
                segment_labels = []
                for segment in segments:
                    if not isinstance(segment, dict):
                        continue
                    seg_carrier = (
                        ((segment.get("marketing_carrier") or {}).get("iata_code"))
                        or ((segment.get("operating_carrier") or {}).get("iata_code"))
                        or ""
                    )
                    seg_no = (
                        segment.get("marketing_carrier_flight_number")
                        or segment.get("operating_carrier_flight_number")
                        or ""
                    )
                    label = f"{seg_carrier}{seg_no}".strip()
                    if label:
                        segment_labels.append(label)

                departure_at = first_segment.get("departing_at", "")
                arrival_at = last_segment.get("arriving_at", "")
                status = "Confirmed"
                if departure_at:
                    try:
                        dep_dt = datetime.fromisoformat(str(departure_at).replace("Z", "+00:00"))
                        if dep_dt.tzinfo is None:
                            dep_dt = dep_dt.replace(tzinfo=timezone.utc)
                        hours_until = (dep_dt - datetime.now(timezone.utc)).total_seconds() / 3600
                        if hours_until > 48:
                            status = "Confirmed"
                        elif hours_until > 24:
                            status = "Upcoming"
                        elif hours_until > 0:
                            status = "Check-in Open"
                        elif hours_until > -2:
                            status = "Departed"
                        else:
                            status = "Arrived"
                    except Exception:
                        status = "Confirmed"

                total_amount = order.get("total_amount")
                try:
                    total_amount = float(total_amount) if total_amount is not None else None
                except (TypeError, ValueError):
                    total_amount = None

                return {
                    "flight_number": " / ".join(segment_labels) if segment_labels else f_num,
                    "airline": airline_name,
                    "status": status,
                    "departure_airport": origin.get("iata_code", "Unknown"),
                    "arrival_airport": destination.get("iata_code", "Unknown"),
                    "scheduled_departure": departure_at or "Unknown",
                    "estimated_departure": departure_at or "Unknown",
                    "actual_departure": None,
                    "scheduled_arrival": arrival_at or "Unknown",
                    "estimated_arrival": arrival_at or "Unknown",
                    "gate": "TBD",
                    "terminal": "Unknown",
                    "delay_minutes": 0,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                    "source": "duffel",
                    "provider": "duffel",
                    "provider_order_id": order.get("id") or f_num.lower(),
                    "price": total_amount,
                    "currency": order.get("total_currency", "USD"),
                }

            carrier_code = ''.join([c for c in f_num if c.isalpha()])
            flight_num = ''.join([c for c in f_num if c.isdigit()])
            if not carrier_code or not flight_num:
                return {
                    "error": f"For Duffel, provide the booked order id (for example ord_...) or a valid flight number format: {f_num}",
                    "flight_number": f_num,
                    "source": "error",
                    "provider": "duffel",
                }
        except Exception as e:
            return {
                "error": f"Duffel flight status error: {str(e)}",
                "flight_number": f_num,
                "flight_date": date,
                "source": "error",
                "provider": "duffel",
            }

    # Try Amadeus API
    try:
        # Extract airline code (first 2-3 letters) and flight number
        # e.g., "UA123" -> carrier="UA", number="123"
        carrier_code = ''.join([c for c in f_num if c.isalpha()])
        flight_num = ''.join([c for c in f_num if c.isdigit()])
        
        if not carrier_code or not flight_num:
            logger.error(f"Invalid flight number format: {f_num}")
            return {
                "error": f"Invalid flight number format: {f_num}",
                "flight_number": f_num,
                "source": "error"
            }
        
        # Call Amadeus Flight Status API using existing helper
        params = {
            "carrierCode": carrier_code,
            "flightNumber": flight_num,
            "scheduledDepartureDate": date
        }
        
        logger.info(f"Calling Amadeus Flight Status API for {carrier_code}{flight_num} on {date}")
        
        data = _make_amadeus_request(
            "GET",
            "/v2/schedule/flights",
            params=params
        )
        if data:
            flights = data.get("data", [])
            
            if not flights:
                logger.error(f"No flight data found for {f_num} on {date}")
                return {
                    "error": f"No flight data found for {f_num} on {date}",
                    "flight_number": f_num,
                    "flight_date": date,
                    "source": "amadeus",
                    "provider": "amadeus",
                }
            
            # Get first matching flight
            flight = flights[0]
            flight_points = flight.get("flightPoints", [])
            
            # Find departure and arrival points
            departure_point = next((fp for fp in flight_points if fp.get("iataCode") and fp.get("departure")), None)
            arrival_point = next((fp for fp in flight_points if fp.get("iataCode") and fp.get("arrival")), None)
            
            if not departure_point or not arrival_point:
                logger.error(f"Incomplete flight data for {f_num}")
                return {
                    "error": f"Incomplete flight data for {f_num}",
                    "flight_number": f_num,
                    "flight_date": date,
                    "source": "amadeus",
                    "provider": "amadeus",
                }
            
            departure = departure_point.get("departure", {})
            arrival = arrival_point.get("arrival", {})
            
            # Calculate delay
            scheduled_dep = departure.get("timings", [{}])[0].get("value") if departure.get("timings") else None
            estimated_dep = departure.get("timings", [{}])[-1].get("value") if departure.get("timings") else scheduled_dep
            
            delay_minutes = 0
            if scheduled_dep and estimated_dep:
                try:
                    sched_dt = datetime.fromisoformat(scheduled_dep.replace('Z', '+00:00'))
                    est_dt = datetime.fromisoformat(estimated_dep.replace('Z', '+00:00'))
                    delay_minutes = int((est_dt - sched_dt).total_seconds() / 60)
                except:
                    pass
            
            # Determine status
            status = "On Time"
            if delay_minutes > 15:
                status = "Delayed"
            elif arrival.get("timings"):
                actual_arrival = arrival.get("timings", [{}])[-1].get("value")
                if actual_arrival:
                    status = "Landed"
            
            # Extract gate and terminal
            gate_info = departure.get("gate", "")
            terminal_info = departure.get("terminal", {}).get("code", "")
            gate = f"T{terminal_info} G{gate_info}" if terminal_info and gate_info else gate_info or "TBD"
            
            return {
                "flight_number": f_num,
                "airline": flight.get("flightDesignator", {}).get("carrierCode", carrier_code),
                "status": status,
                "departure_airport": departure_point.get("iataCode", "Unknown"),
                "arrival_airport": arrival_point.get("iataCode", "Unknown"),
                "scheduled_departure": scheduled_dep or "Unknown",
                "estimated_departure": estimated_dep or scheduled_dep or "Unknown",
                "actual_departure": departure.get("timings", [{}])[-1].get("value") if departure.get("timings") else None,
                "scheduled_arrival": arrival.get("timings", [{}])[0].get("value") if arrival.get("timings") else "Unknown",
                "estimated_arrival": arrival.get("timings", [{}])[-1].get("value") if arrival.get("timings") else "Unknown",
                "gate": gate,
                "terminal": terminal_info or "Unknown",
                "delay_minutes": delay_minutes,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "source": "amadeus",
                "provider": "amadeus",
            }
            
    except Exception as e:
        logger.error(f"Error calling Amadeus API: {e}")
        return {
            "error": f"Amadeus API error: {str(e)}",
            "flight_number": f_num,
            "flight_date": date,
            "source": "error",
            "provider": "amadeus",
        }

@tool
def get_traffic_conditions(
    origin: Any,
    destination: Any,
    departure_time: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate driving traffic conditions, travel duration, and potential delays between two points.
    Uses Google Maps Distance Matrix API with real-time traffic data.
    
    Args:
        origin (dict or str): Starting point - either a dict with 'lat' and 'lon' keys, or a place name string (e.g., "Dubai", "JFK Airport")
        destination (dict or str): Destination point - either a dict with 'lat' and 'lon' keys, or a place name string (e.g., "London", "Heathrow Airport")
        departure_time (str, optional): ISO string for scheduled departure (used for traffic prediction).
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - conditions (str): Qualitative traffic state ('light', 'moderate', 'heavy').
            - normal_duration_minutes (int): Expected duration in free-flow traffic.
            - current_duration_minutes (int): Actual expected duration with current routing.
            - delay_minutes (int): Additional time added by traffic/routing.
            - distance_km (float): Driving distance in kilometers.
            - recommended_route (str): Plain language description of the fastest route.
            - route_geometry (dict): Route geometry for mapping (optional).
            - route_geometry (dict): Route geometry for mapping (optional).
            - last_updated (str): Timestamp of the last traffic assessment.
            - source (str): Data source ('google_maps')
    """
    
    # Helper function to geocode place names to coordinates
    def geocode_location(location: Any) -> tuple:
        """Convert location (string or dict) to (lat, lon) tuple."""
        if isinstance(location, dict):
            # Already a coordinate dict
            lat = location.get('lat')
            lon = location.get('lon')
            if lat is not None and lon is not None:
                return (float(lat), float(lon))
            return (None, None)
        
        elif isinstance(location, str):
            # Place name - geocode it
            if not GOOGLE_MAPS_API_KEY:
                logger.error("Google Maps API key required for geocoding place names")
                return (None, None)
            
            try:
                geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
                response = requests.get(
                    geocode_url,
                    params={"address": location, "key": GOOGLE_MAPS_API_KEY},
                    timeout=10
                )
                print(f"Geocoding '{location}' - API response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK" and data.get("results"):
                        loc = data["results"][0]["geometry"]["location"]
                        return (loc["lat"], loc["lng"])
                    else:
                        logger.error(f"Geocoding failed for '{location}': {data.get('status')}")
                        return (None, None)
            except Exception as e:
                logger.error(f"Error geocoding '{location}': {e}")
                return (None, None)
        
        return (None, None)
    
    # Extract coordinates from origin and destination
    origin_lat, origin_lon = geocode_location(origin)
    dest_lat, dest_lon = geocode_location(destination)
    
    if not all([origin_lat, origin_lon, dest_lat, dest_lon]):
        return {
            "error": "Invalid location. Provide either {'lat': X, 'lon': Y} or a place name string",
            "origin": origin,
            "destination": destination,
            "source": "error"
        }
    
    # Try Google Maps API first (with traffic data)
    if GOOGLE_MAPS_API_KEY:
        try:
            # Google Maps Distance Matrix API with traffic model
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            
            params = {
                "origins": f"{origin_lat},{origin_lon}",
                "destinations": f"{dest_lat},{dest_lon}",
                "mode": "driving",
                "departure_time": "now",  # For real-time traffic
                "traffic_model": "best_guess",  # best_guess, pessimistic, optimistic
                "key": GOOGLE_MAPS_API_KEY
            }
            
            # If departure_time is provided, use it for future traffic prediction
            if departure_time:
                try:
                    # Convert ISO string to Unix timestamp
                    dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                    params["departure_time"] = int(dt.timestamp())
                except Exception as e:
                    logger.warning(f"Could not parse departure_time: {e}")
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "OK" and data.get("rows"):
                    element = data["rows"][0]["elements"][0]
                    
                    if element.get("status") == "OK":
                        # Extract traffic data
                        duration_in_traffic = element.get("duration_in_traffic", element.get("duration"))
                        duration = element.get("duration")
                        distance = element.get("distance")
                        
                        duration_min = round(duration_in_traffic["value"] / 60)
                        normal_duration_min = round(duration["value"] / 60)
                        distance_km = round(distance["value"] / 1000, 2)
                        
                        delay_minutes = max(0, duration_min - normal_duration_min)
                        
                        # Determine traffic conditions based on delay
                        if delay_minutes < 5:
                            conditions = "light"
                        elif delay_minutes < 15:
                            conditions = "moderate"
                        else:
                            conditions = "heavy"
                        
                        # Get detailed route info using Directions API
                        route_summary = "Via fastest route"
                        route_geometry = {}
                        
                        try:
                            directions_url = "https://maps.googleapis.com/maps/api/directions/json"
                            directions_params = {
                                "origin": f"{origin_lat},{origin_lon}",
                                "destination": f"{dest_lat},{dest_lon}",
                                "mode": "driving",
                                "departure_time": params["departure_time"],
                                "traffic_model": "best_guess",
                                "key": GOOGLE_MAPS_API_KEY
                            }
                            
                            dir_response = requests.get(directions_url, params=directions_params, timeout=10)
                            if dir_response.status_code == 200:
                                dir_data = dir_response.json()
                                if dir_data.get("status") == "OK" and dir_data.get("routes"):
                                    route = dir_data["routes"][0]
                                    route_summary = route.get("summary", "Via fastest route")
                                    
                                    # Extract polyline for route geometry
                                    if route.get("overview_polyline"):
                                        route_geometry = {
                                            "type": "polyline",
                                            "data": route["overview_polyline"]["points"]
                                        }
                        except Exception as e:
                            logger.warning(f"Could not get directions details: {e}")
                        
                        return {
                            "conditions": conditions,
                            "normal_duration_minutes": normal_duration_min,
                            "current_duration_minutes": duration_min,
                            "delay_minutes": delay_minutes,
                            "distance_km": distance_km,
                            "incidents": [],  # Would need additional API call to get incidents
                            "recommended_route": route_summary,
                            "route_geometry": route_geometry,
                            "last_updated": datetime.now(timezone.utc).isoformat(),
                            "source": "google_maps"
                        }
                    else:
                        logger.warning(f"Google Maps element status: {element.get('status')}")
                else:
                    logger.warning(f"Google Maps API status: {data.get('status')}")
            else:
                logger.warning(f"Google Maps API returned {response.status_code}: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            logger.error("Google Maps API timeout")
        except Exception as e:
            logger.error(f"Error calling Google Maps API: {e}")
    else:
        logger.error("Google Maps API key not configured")

    # Google Maps API failed or not configured
    return {
        "error": "Google Maps traffic API failed. Ensure GOOGLE_MAPS_API_KEY is configured.",
        "origin": {"lat": origin_lat, "lon": origin_lon},
        "destination": {"lat": dest_lat, "lon": dest_lon},
        "source": "error"
    }

@tool
def get_weather_forecast(
    latitude: float,
    longitude: float,
    days: int = 3
) -> Dict[str, Any]:
    """
    Get current weather and a multi-day forecast for a specific coordinate.
    Use this to suggest packing, activity timing, or warn about travel disruptions.

    Uses the OpenWeatherMap 2.5 free-tier APIs:
    - /data/2.5/weather for current conditions
    - /data/2.5/forecast for 5-day/3-hour forecast (hourly + daily aggregation)

    Args:
        latitude (float): Latitude of the target location.
        longitude (float): Longitude of the target location.
        days (int, optional): Number of forecast days to retrieve (1-5). Defaults to 3.

    Returns:
        Dict[str, Any]: A nested dictionary containing:
            - current (dict): Current condition, temperature, feels_like, and humidity.
            - hourly (list): List of hourly updates for the next 12 hours.
            - daily (list): List of daily forecasts with high/low and precipitation probability.
            - location (dict): Echoes coordinates and detected timezone.
            - last_updated (str): Timestamp of the report.
    """
    if not OPENWEATHERMAP_API_KEY:
        logger.error("OpenWeatherMap API key not configured")
        return {
            "error": "OpenWeatherMap API key not configured. Please set OPENWEATHERMAP_API_KEY",
            "latitude": latitude,
            "longitude": longitude,
            "source": "error"
        }

    current_data: Dict[str, Any] = {}
    hourly_list: List[Dict[str, Any]] = []
    daily_list: List[Dict[str, Any]] = []
    tz_name = "UTC"

    # --- 1. Current weather via /data/2.5/weather (free tier) ---
    try:
        endpoint = os.getenv(
            "OPENWEATHERMAP_ENDPOINT",
            "https://api.openweathermap.org/data/2.5/weather",
        )
        resp = requests.get(
            endpoint,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": OPENWEATHERMAP_API_KEY,
                "units": "metric",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            weather_arr = data.get("weather", [{}])
            main = data.get("main", {})
            wind = data.get("wind", {})
            tz_offset = data.get("timezone", 0)  # seconds offset from UTC
            tz_name = f"UTC{'+' if tz_offset >= 0 else ''}{tz_offset // 3600}"

            current_data = {
                "condition": weather_arr[0].get("main", "Unknown") if weather_arr else "Unknown",
                "description": weather_arr[0].get("description", "Unknown") if weather_arr else "Unknown",
                "temperature_celsius": main.get("temp"),
                "feels_like_celsius": main.get("feels_like"),
                "humidity_percent": main.get("humidity"),
                "wind_speed_kmh": round((wind.get("speed", 0)) * 3.6, 1),
                "uv_index": None,  # Not available in 2.5 current endpoint
            }
        else:
            logger.warning(f"Weather current API returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.error(f"Error fetching current weather: {e}")

    # --- 2. 5-day/3-hour forecast via /data/2.5/forecast (free tier) ---
    try:
        forecast_resp = requests.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": OPENWEATHERMAP_API_KEY,
                "units": "metric",
            },
            timeout=10,
        )
        if forecast_resp.status_code == 200:
            forecast_data = forecast_resp.json()
            entries = forecast_data.get("list", [])

            # Build hourly list (next 12 hours = first 4 entries at 3-hour intervals)
            for entry in entries[:4]:
                hourly_list.append({
                    "time": entry.get("dt_txt", ""),
                    "condition": entry.get("weather", [{}])[0].get("main", "Unknown"),
                    "temperature_celsius": entry.get("main", {}).get("temp"),
                })

            # Aggregate into daily forecasts
            daily_map: Dict[str, Dict[str, Any]] = {}
            for entry in entries:
                dt_txt = entry.get("dt_txt", "")
                day_str = dt_txt.split(" ")[0] if " " in dt_txt else dt_txt[:10]
                if not day_str:
                    continue

                temp = entry.get("main", {}).get("temp")
                pop = entry.get("pop", 0)
                condition = entry.get("weather", [{}])[0].get("main", "Unknown")

                if day_str not in daily_map:
                    daily_map[day_str] = {
                        "date": day_str,
                        "condition": condition,
                        "temps": [],
                        "pops": [],
                    }
                if temp is not None:
                    daily_map[day_str]["temps"].append(temp)
                daily_map[day_str]["pops"].append(pop)

            for day_str in sorted(daily_map.keys())[:days]:
                day = daily_map[day_str]
                temps = day["temps"]
                pops = day["pops"]
                daily_list.append({
                    "date": day["date"],
                    "condition": day["condition"],
                    "high_celsius": round(max(temps), 1) if temps else None,
                    "low_celsius": round(min(temps), 1) if temps else None,
                    "precipitation_probability": round(max(pops) * 100) if pops else 0,
                })
        else:
            logger.warning(f"Weather forecast API returned {forecast_resp.status_code}: {forecast_resp.text[:200]}")
    except Exception as e:
        logger.error(f"Error fetching weather forecast: {e}")

    # If we got at least current data, return the real response
    if current_data:
        return {
            "current": current_data,
            "hourly": hourly_list,
            "daily": daily_list,
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "timezone": tz_name,
            },
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "openweathermap",
        }

    # API failed to return data
    logger.error(f"Failed to retrieve weather forecast for {latitude}, {longitude}")
    return {
        "error": "Failed to retrieve weather forecast from OpenWeatherMap API",
        "latitude": latitude,
        "longitude": longitude,
        "source": "error"
    }

@tool
def get_airport_intelligence(airport_code: str) -> Dict[str, Any]:
    """
    Get real-time airport-specific intelligence including security wait times and terminal congestion.
    Use this to help users navigate the airport or buffer time for security.
    
    Args:
        airport_code (str): IATA or ICAO code for the airport (e.g., 'JFK', 'EGLL').
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - airport_code (str): Standardized airport code.
            - name (str): Full name of the airport.
            - city (str): City where airport is located.
            - country (str): Country code.
            - timezone (str): Airport timezone.
            - terminals (list): List of active terminals.
            - last_updated (str): Timestamp of the intelligence.
    """
    # Standardize input
    code = airport_code.upper()
    
    try:
        # Use Amadeus Airport & City Search API
        params = {
            "subType": "AIRPORT",
            "keyword": code,
            "page[limit]": 1
        }
        
        logger.info(f"Calling Amadeus Airport API for {code}")
        
        data = _make_amadeus_request(
            "GET",
            "/v1/reference-data/locations",
            params=params
        )
        
        if data:
            airports = data.get("data", [])
            
            if not airports:
                logger.error(f"No airport data found for {code}")
                return {
                    "error": f"No airport data found for {code}",
                    "airport_code": code,
                    "source": "amadeus"
                }
            
            airport = airports[0]
            
            # Extract airport information
            airport_name = airport.get("name", code)
            address = airport.get("address", {})
            city_name = address.get("cityName", "Unknown")
            country_code = address.get("countryCode", "Unknown")
            
            # Get timezone if available
            timezone_info = airport.get("timeZone", {})
            timezone_str = timezone_info.get("name", "UTC") if timezone_info else "UTC"
            
            # Get IATA code
            iata_code = airport.get("iataCode", code)
            
            # Get geographical coordinates
            geo_code = airport.get("geoCode", {})
            latitude = geo_code.get("latitude")
            longitude = geo_code.get("longitude")
            
            return {
                "airport_code": iata_code,
                "name": airport_name,
                "city": city_name,
                "country": country_code,
                "timezone": timezone_str,
                "coordinates": {
                    "latitude": latitude,
                    "longitude": longitude
                } if latitude and longitude else {},
                "type": airport.get("subType", "AIRPORT"),
                "detailed_name": airport.get("detailedName", airport_name),
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "source": "amadeus"
            }
        
    except Exception as e:
        logger.error(f"Error in get_airport_intelligence: {e}")
        return {
            "error": f"Amadeus API error: {str(e)}",
            "airport_code": code,
            "source": "error"
        }

def get_all_context_tools():
    """Get all context tools as a list for agent registration."""
    return [
        get_current_location,
        get_flight_status,
        get_traffic_conditions,
        get_weather_forecast,
        get_airport_intelligence,
    ]

