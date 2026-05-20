import os
import getpass
import requests
from typing import Dict, Any
from langchain_core.tools import tool
import google.generativeai as genai

base_url = 'https://enzo01.flyumojaairways.com/'

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
