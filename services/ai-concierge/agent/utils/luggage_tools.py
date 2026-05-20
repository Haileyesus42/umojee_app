import os
import getpass
import requests
from typing import Dict, Any
from langchain_core.tools import tool
import google.generativeai as genai

base_url = 'https://enzo01.flyumojaairways.com/'

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
