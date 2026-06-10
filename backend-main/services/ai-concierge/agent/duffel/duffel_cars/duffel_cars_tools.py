from langchain_core.tools import tool


@tool
def duffel_list_cars() -> dict:
    """Duffel fallback response for unsupported car inventory."""
    return {
        "error": "Car rental search is not supported by the Duffel fallback workflow.",
        "provider": "duffel",
        "details": "Keep car requests on the Amadeus provider if you need rental inventory.",
    }
