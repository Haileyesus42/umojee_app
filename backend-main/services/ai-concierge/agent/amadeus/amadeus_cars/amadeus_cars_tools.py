from typing import Any, Dict, List, Optional

import requests
from langchain_core.tools import tool

from agent.amadeus.amadeus_make_request import _make_amadeus_request


@tool
def amadeus_list_car_locations(
    city_code: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[int] = None,
    radius_unit: str = "KM",
) -> Dict[str, Any]:
    """
    Fetch Amadeus car rental pickup locations by city or geocoordinates.

    Provide either:
    - city_code: IATA city identifier (e.g., "ADD"), or
    - latitude and longitude plus optional radius filters.

    Returns the Amadeus location payload while surfacing errors verbatim.
    """
    has_city = city_code is not None
    has_geo = latitude is not None and longitude is not None

    if not (has_city or has_geo):
        return {
            "error": "Missing location context",
            "details": "Provide city_code or both latitude and longitude.",
        }

    params: Dict[str, Any] = {}
    endpoint = ""

    if has_city:
        endpoint = "/v1/reference-data/locations/cars/by-city"
        params["cityCode"] = city_code
        if radius is not None:
            params["radius"] = radius
            params["radiusUnit"] = radius_unit
    else:
        endpoint = "/v1/reference-data/locations/cars/by-geolocation"
        params["latitude"] = latitude
        params["longitude"] = longitude
        if radius is not None:
            params["radius"] = radius
            params["radiusUnit"] = radius_unit

    try:
        return _make_amadeus_request(
            "GET",
            endpoint,
            params=params,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {
            "error": "Unexpected error listing car locations",
            "details": str(exc),
        }


@tool
def amadeus_search_car_offers(
    pickup_location_id: str,
    pickup_date: str,
    return_location_id: Optional[str] = None,
    return_date: Optional[str] = None,
    drivers_age: int = 30,
    currency: str = "USD",
    vehicle_categories: Optional[List[str]] = None,
    rate_codes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Search live vehicle offers via the Amadeus Car Rental API.

    Required inputs:
    - pickup_location_id: Amadeus location identifier (from list car locations).
    - pickup_date: ISO timestamp (YYYY-MM-DDThh:mm) for vehicle pickup.

    Optional inputs:
    - return_location_id / return_date: specify for one-way or timed returns.
    - drivers_age: age of the primary driver.
    - currency: ISO currency code for pricing.
    - vehicle_categories / rate_codes: filter inventory by class or corporate rates.

    Returns the raw Amadeus vehicle offers response.
    """
    if not pickup_location_id or not pickup_date:
        return {
            "error": "Missing required parameters",
            "details": "pickup_location_id and pickup_date are required.",
        }

    payload: Dict[str, Any] = {
        "data": {
            "type": "vehicle-offers-search",
            "attributes": {
                "pickup": {
                    "locationId": pickup_location_id,
                    "dateTime": pickup_date,
                },
                "driverAge": drivers_age,
                "currencyCode": currency,
            },
        }
    }

    if return_location_id or return_date:
        payload["data"]["attributes"]["return"] = {}
        if return_location_id:
            payload["data"]["attributes"]["return"]["locationId"] = return_location_id
        if return_date:
            payload["data"]["attributes"]["return"]["dateTime"] = return_date

    if vehicle_categories:
        payload["data"]["attributes"]["vehicleCategories"] = vehicle_categories
    if rate_codes:
        payload["data"]["attributes"]["rateCodes"] = rate_codes

    try:
        return _make_amadeus_request(
            "POST",
            "/v1/shopping/vehicle-offers",
            json=payload,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error searching car offers", "details": str(exc)}


@tool
def amadeus_create_car_booking(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Finalize a vehicle reservation with the Amadeus Car Rental Booking API.

    Required payload:
    - order_payload: Dictionary aligned with the vehicle order schema
      (selected offer, driver info, payment method, contacts, etc.).

    Returns the booking confirmation or surfaces Amadeus faults verbatim.
    """
    try:
        return _make_amadeus_request(
            "POST",
            "/v1/booking/vehicle-orders",
            json=order_payload,
        )
    except requests.exceptions.RequestException as exc:
        return {"error": "Request to Amadeus failed", "details": str(exc)}
    except Exception as exc:
        return {"error": "Unexpected error creating car booking", "details": str(exc)}

@tool
def amadeus_save_cars_to_journey(journey_id: str, cars: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save a list of car recommendations to the user's active journey context.
    
    Required inputs:
    - journey_id: The ID of the journey to update.
    - cars: A list of car offer dictionaries.
    """
    # Attempt to parse cars if the agent passed a JSON string instead of a list
    if isinstance(cars, str):
        try:
            import json
            cars = json.loads(cars)
        except Exception:
            return {"error": "cars argument is a string but not valid JSON.", "status": "failed"}
            
    if not cars or not isinstance(cars, list):
        return {"error": "A list of cars is required.", "status": "failed"}

    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}
            
        _state_manager_ref.update_journey(journey_id, {"saved_cars": cars})
        return {
            "status": "success",
            "message": f"Successfully saved {len(cars)} car(s) to the journey context.",
            "saved_count": len(cars)
        }
    except Exception as exc:
        return {
            "error": "Failed to save cars to journey data.",
            "details": str(exc),
            "status": "error"
        }

@tool
def amadeus_save_booked_car_to_journey(
    journey_id: str,
    car_name: str,
    pickup_location: str,
    pickup_date: str,
    return_location: str,
    return_date: str,
    booking_reference: str,
    price: float,
    currency: str,
    amadeus_order_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Save a confirmed car booking to the user's active journey context.
    
    Required inputs:
    - journey_id: The ID of the journey to update.
    - car_name: Description of the car (e.g., "Tesla Model 3").
    - pickup_location: Amadeus location identifier.
    - pickup_date: ISO timestamp (YYYY-MM-DDThh:mm).
    - return_location: Amadeus location identifier.
    - return_date: ISO timestamp (YYYY-MM-DDThh:mm).
    - booking_reference: Confirmation number from Amadeus.
    - price: Total price for the rental.
    - currency: Currency code (e.g., "USD").
    """
    try:
        from agent.journey.journey_orchestrator import _state_manager_ref
        if not _state_manager_ref:
            return {"error": "Journey state manager is not initialized.", "status": "failed"}
            
        journey = _state_manager_ref.get_journey(journey_id)
        if not journey:
            return {"error": f"Journey '{journey_id}' not found.", "status": "failed"}

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        # Build the booked car record
        booked_car_record = {
            "car_name": car_name,
            "pickup_location": pickup_location,
            "pickup_date": pickup_date,
            "return_location": return_location,
            "return_date": return_date,
            "booking_reference": booking_reference,
            "amadeus_order_id": amadeus_order_id,
            "price": price,
            "currency": currency,
            "booked_at": now.isoformat(),
        }

        # Append to booked_cars list
        if not hasattr(journey, 'booked_cars'):
            journey.booked_cars = []
        journey.booked_cars.append(booked_car_record)

        # Update the journey in the state manager
        _state_manager_ref.update_journey(journey_id, {"booked_cars": journey.booked_cars})
        
        return {
            "status": "success",
            "message": f"Successfully saved booked car '{car_name}' to journey.",
            "record": booked_car_record
        }
    except Exception as exc:
        return {"error": "Failed to save booked car to journey", "details": str(exc), "status": "error"}
