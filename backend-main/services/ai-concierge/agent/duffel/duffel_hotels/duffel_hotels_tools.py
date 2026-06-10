from langchain_core.tools import tool


@tool
def duffel_list_hotels() -> dict:
    """Duffel fallback response for unsupported hotel inventory."""
    return {
        "error": "Hotel search is not supported by the Duffel fallback workflow.",
        "provider": "duffel",
        "details": "Keep hotel requests on the Amadeus provider if you need hotel inventory.",
    }
