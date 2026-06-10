import os
from typing import Any, Dict, Optional

import requests


DUFFEL_API_URL = os.getenv("DUFFEL_API_URL", "https://api.duffel.com").rstrip("/")
DUFFEL_ACCESS_TOKEN = os.getenv("DUFFEL_ACCESS_TOKEN")
DUFFEL_VERSION = os.getenv("DUFFEL_VERSION", "v2")


def _make_duffel_request(
    method: str,
    endpoint: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Helper to send authenticated requests to Duffel."""
    if not DUFFEL_ACCESS_TOKEN:
        raise ValueError("Duffel access token is missing in environment variables.")

    url = f"{DUFFEL_API_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {DUFFEL_ACCESS_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Duffel-Version": DUFFEL_VERSION,
    }

    response = requests.request(method, url, params=params, json=json, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()
