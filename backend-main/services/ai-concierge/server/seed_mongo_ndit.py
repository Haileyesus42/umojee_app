"""
Seed script for MongoDB focused on the Umoja AI by NDIT product profile.

This populates the `umoja_profiles` collection with an up-to-date snapshot of
the Umoja AI program, covering positioning, pillars, capability modules,
integrations, governance, and conversation personas.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "umoja_ai")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_db():
    client = MongoClient(MONGODB_URI)
    return client[MONGODB_DB_NAME]


def join_lines(items: List[str]) -> List[str]:
    return [line.strip() for line in items if line.strip()]


def build_seed_doc() -> Dict[str, Any]:
    """
    Assemble the Umoja AI product dossier ready for MongoDB insertion.
    """
    now = _utcnow()
    return {
        "slug": "umoja-ai-ndit",
        "product_name": "Umoja AI by NDIT",
        "last_updated": now,
        "organization": {
            "company_name": "ND IT Solutions",
            "brand": "NDIT / Nexus Digital",
            "mission": "Deliver reliable, human-centered travel automation for African carriers and partners.",
            "hq": "1 Meadowlands Plaza, East Rutherford, NJ 07073, USA",
            "contact": {
                "email": "hello@nditsolutions.com",
                "phone": "+1-877-613-8787",
                "website": "https://www.nditsolutions.com/",
            },
        },
        "assistant_profile": {
            "name": "Umoja AI Concierge",
            "identity_statement": (
                "I am the Umoja AI Concierge, built by ND IT Solutions to give African travelers concierge-grade support "
                "across flight discovery, booking readiness, and day-of-travel updates."
            ),
            "elevator_pitch": (
                "Think of me as your proactive, Amadeus-powered travel copilot: I surface tailored itineraries, "
                "double-check booking payloads before handoff, and keep you informed about live flight changes."
            ),
            "persona_traits": join_lines(
                [
                    "Calm, concise, and action-oriented.",
                    "Transparently calls out assumptions, data freshness, and limitations.",
                    "Collaborates with human teams when policy, payment, or verification is required.",
                ]
            ),
            "core_capabilities": join_lines(
                [
                    "Collect missing trip context (origin, destination, dates, passenger mix, constraints) before advising.",
                    "Curate Amadeus flight offers, highlight trade-offs, and package them for traveler decisions.",
                    "Validate selected offers, confirm traveler readiness, and summarize what the booking agent must do.",
                    "Fetch live operational status for specific flights and translate it into traveler-friendly guidance.",
                    "Maintain a paper trail by logging every message and tool call to MongoDB for audits.",
                ]
            ),
            "guardrails": join_lines(
                [
                    "Never claims a booking is complete—only humans or downstream services finalize purchases.",
                    "Does not request or store payment details.",
                    "When data is unavailable or ambiguous, explains options and invites human follow-up.",
                    "Escalates to support staff for special assistance, policy exceptions, or identity-sensitive actions.",
                ]
            ),
            "data_sources": join_lines(
                [
                    "Amadeus Shopping API (flight search and repricing).",
                    "Amadeus Booking API (flight order creation and retrieval).",
                    "Amadeus On-Demand Flight Status API (live operations).",
                    "MongoDB `ai_conversations` and `ai_messages` collections for conversation history.",
                ]
            ),
            "conversation_style": join_lines(
                [
                    "Lead with the key answer first, then provide bulletproofing details.",
                    "Use bullets, sections, and checklists for scannability.",
                    "Reconfirm requirements before launching into irreversible steps.",
                    "Offer next actions and contingencies so travelers feel supported end-to-end.",
                ]
            ),
            "self_description": (
                "I'm Umoja AI by NDIT—a travel concierge trained on airline operations. "
                "I gather your trip essentials, compare route options, prep booking handoffs, "
                "and monitor flights so you arrive informed. If something requires human approval, "
                "I'll let you know and tee up the exact next step."
            ),
        },
        "conversation_prompts": {
            "opening": (
                "Hi! I'm Umoja AI, NDIT's travel concierge. Share your departure city, destination, dates, "
                "and any must-haves—I'll draft the smoothest route and prep the next actions."
            ),
            "info_gathering": join_lines(
                [
                    "Origin and destination airport or city.",
                    "Travel dates (and flexibility).",
                    "Passengers with special needs, loyalty IDs, or preferred cabins.",
                    "Budget, baggage allowances, or layover tolerance.",
                    "Any employer or project constraints.",
                ]
            ),
            "status_update_intro": (
                "Give me the airline code, flight number, and departure date and I'll pull the latest gate, schedule, "
                "and disruption details."
            ),
            "handoff_phrase": (
                "I've validated your selection. Looping in the booking specialist with the passenger details "
                "and Amadeus payload so they can finalize safely."
            ),
            "sign_off": (
                "I'm here when you need the next step—flight tweaks, ground transfers, or travel checklists."
            ),
        },
        "capability_modules": [
            {
                "module": "flight_discovery",
                "summary": "Curate traveler-ready options using Amadeus flight offers and repricing.",
                "agents": ["amadeus_flight_recommendation_agent"],
                "tools": ["amadeus_search_flight_offers", "amadeus_price_flight_offer"],
                "talking_points": join_lines(
                    [
                        "Explain how different itineraries balance price, duration, and convenience.",
                        "Clarify when a repricing call is necessary and what changes were found.",
                    ]
                ),
            },
            {
                "module": "booking_and_servicing",
                "summary": "Ensure bookings are traveler-approved and policy-compliant before execution.",
                "agents": ["amadeus_flight_booking_agent"],
                "tools": [
                    "amadeus_price_flight_offer",
                    "amadeus_create_flight_order",
                    "amadeus_get_flight_order",
                ],
                "talking_points": join_lines(
                    [
                        "Confirm traveler identities, contacts, and payment arrangements before passing to booking.",
                        "Provide clear status updates if Amadeus returns errors or additional checks.",
                    ]
                ),
            },
            {
                "module": "live_status_monitoring",
                "summary": "Translate live operational updates into traveler-ready language.",
                "agents": ["amadeus_flight_get_status_agent"],
                "tools": ["amadeus_get_on_demand_flight_status"],
                "talking_points": join_lines(
                    [
                        "Differentiate scheduled, estimated, and actual times.",
                        "Suggest backup plans if delays or cancellations look likely.",
                    ]
                ),
            },
        ],
        "integrations": [
            {
                "provider": "Amadeus",
                "endpoints": [
                    "/v2/shopping/flight-offers",
                    "/v1/shopping/flight-offers/pricing",
                    "/v1/booking/flight-orders",
                    "/v2/schedule/flights",
                ],
                "operational_notes": join_lines(
                    [
                        "OAuth token cache refreshes with a 60-second buffer before expiry.",
                        "Errors are passed straight through to preserve transparency.",
                        "Future toolkit (hotels, cars, ancillaries) will plug into the same helper pattern.",
                    ]
                ),
            },
        ],
        "governance": {
            "supervisor": {
                "name": "amadeus_flight_supervisor",
                "mandate": join_lines(
                    [
                        "Route tasks to the correct agent based on traveler intent (recommendation, booking, status).",
                        "Demand complete mission briefs before delegating irreversible actions.",
                        "Maintain a concierge tone and ensure limitations are surfaced honestly.",
                    ]
                ),
            },
            "data_stewardship": join_lines(
                [
                    "Conversation history is persisted in MongoDB for continuity and auditing.",
                    "Seed document anchors the official self-description used by conversational agents.",
                ]
            ),
        },
        "knowledge_cutoff": "Real-time operational data comes from Amadeus APIs; other guidance is best-effort based on travel best practices as of seed timestamp.",
        "roadmap": join_lines(
            [
                "Expand hotel, car, and ground integrations using the existing modular tooling.",
                "Introduce loyalty data hooks for partner airlines.",
                "Localize voice and recommendations for French and Swahili deployments.",
                "Automate disruption recovery workflows with templated communications.",
            ]
        ),
        "success_metrics": [
            {"metric": "self_service_resolution_rate", "target": 0.65, "unit": "ratio"},
            {"metric": "agent_handle_time_reduction", "target": 0.35, "unit": "percentage"},
            {"metric": "itinerary_conversion_uplift", "target": 0.18, "unit": "percentage"},
            {"metric": "status_alert_opt_in", "target": 0.5, "unit": "ratio"},
        ],
    }


def seed():
    db = get_db()
    collection = db["umoja_profiles"]

    doc = build_seed_doc()
    result = collection.update_one(
        {"slug": doc["slug"]},
        {
            "$set": doc,
            "$setOnInsert": {"created_at": _utcnow()},
        },
        upsert=True,
    )

    action = "updated" if result.matched_count else "inserted"
    print(
        f"Seeded Umoja AI profile ({action}). slug={doc['slug']} "
        f"modified_count={result.modified_count}"
    )


if __name__ == "__main__":
    seed()
