from __future__ import annotations

from agent.config import TravelProviderConfig

ACTIVE_TRAVEL_PROVIDER = TravelProviderConfig.get_provider()
ACTIVE_TRAVEL_PROVIDER_LABEL = ACTIVE_TRAVEL_PROVIDER.capitalize()

if ACTIVE_TRAVEL_PROVIDER == "duffel":
    from agent.duffel.duffel_workflow import graph as active_travel_graph
    from agent.duffel.duffel_flight.duffel_flight_tools import (
        duffel_get_flight_order as active_get_flight_order,
        duffel_save_booked_flight_to_journey as active_save_booked_flight_to_journey,
        duffel_save_flights_to_journey as active_save_flights_to_journey,
        duffel_search_flight_offers as active_search_flight_offers,
    )
else:
    from agent.amadeus.amadeus_workflow import graph as active_travel_graph
    from agent.amadeus.amadeus_flight.amadeus_flight_tools import (
        amadeus_get_flight_order as active_get_flight_order,
        amadeus_save_booked_flight_to_journey as active_save_booked_flight_to_journey,
        amadeus_save_flights_to_journey as active_save_flights_to_journey,
        amadeus_search_flight_offers as active_search_flight_offers,
    )
