#!/usr/bin/env python3
"""
Script to add mock journey data for a specific user to MongoDB.
This will enable the real-time context endpoint to return meaningful data.
"""

import sys
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient

# Add the project root to the Python path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def _now_utc():
    return datetime.now(timezone.utc)

def add_mock_journey_for_user(user_id: str, mongo_uri: str = None):
    """
    Add a mock journey for the specified user to enable real-time context.
    
    Args:
        user_id: The user ID to create the journey for
        mongo_uri: MongoDB URI (defaults to environment variable or localhost)
    """
    
    # Use the MongoDB connection from the existing infrastructure
    if mongo_uri is None:
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/umoja_test")
    
    print(f"Connecting to MongoDB: {mongo_uri}")
    
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    
    # Get the journeys collection (using the same collection name as the app)
    db_name = mongo_uri.split('/')[-1]  # Extract DB name from URI
    db = client[db_name]
    journeys_collection = db.journeys  # Same collection name used in the app
    
    # Create a mock journey document
    journey_id = str(uuid.uuid4())
    
    mock_journey = {
        "_id": journey_id,
        "journey_id": journey_id,
        "user_id": user_id,
        "conversation_id": f"conv_{uuid.uuid4()}",
        "status": "active",
        "is_active": True,  # This marks it as the active journey for the user
        "current_segment": "home_to_airport",  # Current journey phase
        "segments": {
            "inspiration": {
                "status": "completed",
                "risk_level": "low",
                "started_at": _now_utc(),
                "completed_at": _now_utc()
            },
            "home_to_airport": {
                "status": "active",
                "risk_level": "medium",  # Medium risk due to potential traffic
                "started_at": _now_utc()
            },
            "airport_to_flight": {
                "status": "pending",
                "risk_level": "pending"
            },
            "flight_to_hotel": {
                "status": "pending",
                "risk_level": "pending"
            },
            "hotel_to_activities": {
                "status": "pending",
                "risk_level": "pending"
            },
            "return": {
                "status": "pending",
                "risk_level": "pending"
            }
        },
        "context": {
            # Journey details
            "planned_destination": "New York",
            "departure_city": "London",
            "planned_departure_date": "2026-07-15",
            "duration_days": 7,
            "travelers_count": 2,
            "budget": {
                "min": 2000,
                "max": 5000,
                "currency": "USD"
            },
            
            # Airport information
            "departure_airport_code": "LHR",
            "destination_airport_code": "JFK",
            "departure_airport_lat": 51.4700,
            "departure_airport_lon": -0.4543,
            "return_airport_lat": 40.6413,
            "return_airport_lon": -73.7781,
            
            # Current location (simulating user en route to airport)
            "location": {
                "latitude": 51.4500,  # Somewhere between London and LHR
                "longitude": -0.2543,
                "city": "Heathrow",
                "country": "United Kingdom",
                "display_name": "Near Heathrow Airport, London",
                "detected_at": _now_utc().isoformat(),
                "accuracy_meters": 50
            },
            
            # Monitoring data (this is what the real-time context will return)
            "monitoring": {
                "location": {
                    "data": {
                        "latitude": 51.4500,
                        "longitude": -0.2543,
                        "city": "Heathrow",
                        "country": "United Kingdom",
                        "display_name": "Near Heathrow Airport, London",
                        "accuracy_meters": 50,
                        "source": "browser_geolocation",
                        "timestamp": _now_utc().isoformat()
                    },
                    "timestamp": _now_utc().isoformat(),
                    "success": True
                },
                "traffic": {
                    "data": {
                        "current_travel_time": 45,  # minutes
                        "normal_travel_time": 30,   # minutes
                        "delay_minutes": 15,
                        "traffic_level": "moderate",
                        "route": "M4 -> M25 -> A3113 -> Airport",
                        "recommended_departure_adjustment": "+15 mins"
                    },
                    "timestamp": _now_utc().isoformat(),
                    "success": True
                },
                "flight_status": {
                    "data": {
                        "flight_number": "BA 178",
                        "status": "on_time",
                        "scheduled_departure": "2026-07-15T11:30:00Z",
                        "estimated_departure": "2026-07-15T11:30:00Z",
                        "gate": "B23",
                        "terminal": "5"
                    },
                    "timestamp": _now_utc().isoformat(),
                    "success": True
                },
                "weather": {
                    "data": {
                        "temperature_celsius": 18,
                        "condition": "partly_cloudy",
                        "humidity": 65,
                        "wind_speed_kmh": 12,
                        "visibility_km": 10,
                        "location": "London"
                    },
                    "timestamp": _now_utc().isoformat(),
                    "success": True
                }
            },
            
            # Other context fields
            "energy_level": "moderate",
            "timezone": "Europe/London",
            "preferences": {
                "seat": ["aisle"],
                "meal": ["vegetarian"],
                "destinations": ["New York", "Times Square", "Central Park"]
            }
        },
        "metadata": {
            "created_by": "mock_data_script",
            "last_context_update": _now_utc(),
            "notification_preferences": {
                "push_enabled": True,
                "email_enabled": True,
                "sms_enabled": False
            }
        },
        "created_at": _now_utc(),
        "updated_at": _now_utc()
    }
    
    # Insert the mock journey into the database
    try:
        result = journeys_collection.insert_one(mock_journey)
        print(f"✓ Successfully inserted mock journey: {journey_id}")
        
        # Also update the user's journey monitoring preference to "on"
        # Note: Users are typically stored in a different collection (likely 'users')
        # We'll try to update the user document if it exists
        users_collection = db.users  # Assuming standard users collection name
        
        user_update_result = users_collection.update_one(
            {"_id": user_id},
            {"$set": {"journeyMonitoringPreference": "on", "updated_at": _now_utc()}}
        )
        
        if user_update_result.modified_count > 0:
            print(f"✓ Updated user {user_id} journey monitoring preference to 'on'")
        else:
            print(f"ℹ User {user_id} not found in users collection or no change needed")
        
        print("\nMock journey data added successfully!")
        print(f"Journey ID: {journey_id}")
        print(f"User ID: {user_id}")
        print(f"Current segment: home_to_airport")
        print(f"Status: active")
        print("\nThe real-time context endpoint should now return meaningful data.")
        
    except Exception as e:
        print(f"✗ Error inserting mock journey: {e}")
        return False
    
    finally:
        client.close()
    
    return True

if __name__ == "__main__":
    # Default user ID from the example
    default_user_id = "6a2be0eb17ed68af5eed09ad"
    
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    else:
        user_id = default_user_id
        print(f"Using default user ID: {user_id}")
    
    # Use MongoDB URI from environment or default
    mongo_uri = os.getenv("MONGODB_URI")
    
    print(f"Adding mock journey for user: {user_id}")
    success = add_mock_journey_for_user(user_id, mongo_uri)
    
    if success:
        print("\n✓ Process completed successfully!")
        print("You can now test the real-time context endpoint with meaningful data.")
    else:
        print("\n✗ Process failed!")
        sys.exit(1)