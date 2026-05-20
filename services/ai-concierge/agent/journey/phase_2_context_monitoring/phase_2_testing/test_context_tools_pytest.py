"""
Pytest test suite for Context Tools
Tests all Phase 2 context monitoring tools
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from context_tools import (
    get_current_location,
    get_flight_status,
    get_traffic_conditions,
    get_weather_forecast,
    get_airport_intelligence
)


class TestLocationTool:
    """Test get_current_location tool"""

    def test_browser_geolocation(self):
        """Test location with browser geolocation data"""
        result = get_current_location.invoke({
            "user_id": "test_user_001",
            "browser_lat": 25.2048,
            "browser_lon": 55.2708,
            "browser_city": "Dubai",
            "browser_country": "AE"
        })
        
        assert result["source"] == "browser_geolocation"
        assert result["latitude"] == 25.2048
        assert result["longitude"] == 55.2708
        assert result["city"] == "Dubai"
        assert result["country"] == "AE"
        assert "accuracy_meters" in result
        assert "detected_at" in result

    def test_ip_fallback(self):
        """Test location with IP-based fallback"""
        result = get_current_location.invoke({
            "user_id": "test_user_002"
        })
        
        assert result["source"] in ["ipinfo", "browser_geolocation"]
        assert "latitude" in result
        assert "longitude" in result
        assert "city" in result
        assert "country" in result

    def test_location_returns_coordinates(self):
        """Test that location always returns coordinates"""
        result = get_current_location.invoke({"user_id": "test_user"})
        
        assert isinstance(result["latitude"], (int, float))
        assert isinstance(result["longitude"], (int, float))


class TestFlightStatusTool:
    """Test get_flight_status tool"""

    def test_flight_status_structure(self):
        """Test flight status returns proper structure"""
        result = get_flight_status.invoke({
            "flight_number": "AA100"
        })
        
        assert "flight_number" in result
        assert "source" in result
        assert result["source"] in ["amadeus", "mock"]
        
        # Either has data or error
        has_data = "status" in result or "airline" in result
        has_error = "error" in result
        assert has_data or has_error

    def test_flight_status_with_date(self):
        """Test flight status with specific date"""
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        result = get_flight_status.invoke({
            "flight_number": "UA100",
            "flight_date": today
        })
        
        assert "flight_number" in result
        assert result["source"] in ["amadeus", "mock"]


class TestTrafficTool:
    """Test get_traffic_conditions tool"""

    def test_traffic_with_coordinates(self):
        """Test traffic conditions with coordinates"""
        result = get_traffic_conditions.invoke({
            "origin": {"lat": 25.2048, "lon": 55.2708},
            "destination": {"lat": 24.4539, "lon": 54.3773}
        })
        
        assert "distance_km" in result
        assert "conditions" in result
        assert "current_duration_minutes" in result
        assert "source" in result
        
        if "error" not in result:
            assert isinstance(result["distance_km"], (int, float))
            assert isinstance(result["current_duration_minutes"], (int, float))

    def test_traffic_returns_route_info(self):
        """Test traffic returns route information"""
        result = get_traffic_conditions.invoke({
            "origin": {"lat": 25.2, "lon": 55.3},
            "destination": {"lat": 25.3, "lon": 55.4}
        })
        
        assert "recommended_route" in result
        assert "source" in result


class TestWeatherTool:
    """Test get_weather_forecast tool"""

    def test_weather_forecast_structure(self):
        """Test weather forecast returns proper structure"""
        result = get_weather_forecast.invoke({
            "latitude": 25.2048,
            "longitude": 55.2708,
            "days": 3
        })
        
        assert "current" in result or "error" in result
        assert "source" in result
        
        if "current" in result:
            current = result["current"]
            assert "condition" in current
            assert "temperature_celsius" in current
            assert "humidity_percent" in current

    def test_weather_with_different_days(self):
        """Test weather forecast with different day counts"""
        result = get_weather_forecast.invoke({
            "latitude": 25.2048,
            "longitude": 55.2708,
            "days": 5
        })
        
        assert "source" in result
        
        if "daily" in result:
            assert len(result["daily"]) <= 5

    def test_weather_hourly_forecast(self):
        """Test weather includes hourly forecast"""
        result = get_weather_forecast.invoke({
            "latitude": 25.2048,
            "longitude": 55.2708
        })
        
        if "hourly" in result:
            assert isinstance(result["hourly"], list)


class TestAirportIntelligenceTool:
    """Test get_airport_intelligence tool"""

    def test_airport_intelligence_structure(self):
        """Test airport intelligence returns proper structure"""
        result = get_airport_intelligence.invoke({
            "airport_code": "DXB"
        })
        
        assert "airport_code" in result
        assert result["airport_code"] == "DXB"
        assert "source" in result
        
        # Either has data or error
        has_data = "name" in result or "city" in result
        has_error = "error" in result
        assert has_data or has_error

    def test_multiple_airports(self):
        """Test different airport codes"""
        airports = ["JFK", "DXB", "LHR"]
        
        for code in airports:
            result = get_airport_intelligence.invoke({
                "airport_code": code
            })
            
            assert "airport_code" in result
            assert result["airport_code"] == code

    def test_airport_coordinates(self):
        """Test airport returns coordinates if available"""
        result = get_airport_intelligence.invoke({
            "airport_code": "JFK"
        })
        
        if "coordinates" in result and result["coordinates"]:
            coords = result["coordinates"]
            assert "latitude" in coords
            assert "longitude" in coords


class TestToolIntegration:
    """Integration tests for all tools"""

    def test_all_tools_return_source(self):
        """Test all tools return source information"""
        location = get_current_location.invoke({"user_id": "test"})
        assert "source" in location
        
        flight = get_flight_status.invoke({"flight_number": "AA100"})
        assert "source" in flight
        
        traffic = get_traffic_conditions.invoke({
            "origin": {"lat": 25.2, "lon": 55.3},
            "destination": {"lat": 25.3, "lon": 55.4}
        })
        assert "source" in traffic
        
        weather = get_weather_forecast.invoke({
            "latitude": 25.2048,
            "longitude": 55.2708
        })
        assert "source" in weather
        
        airport = get_airport_intelligence.invoke({"airport_code": "DXB"})
        assert "source" in airport

    def test_tools_handle_missing_params(self):
        """Test tools handle missing parameters gracefully"""
        # Location with minimal params
        location = get_current_location.invoke({})
        assert "error" in location or "latitude" in location
        
        # Flight status without date
        flight = get_flight_status.invoke({"flight_number": "AA100"})
        assert "flight_number" in flight
        
        # Weather with just coordinates
        weather = get_weather_forecast.invoke({
            "latitude": 25.2048,
            "longitude": 55.2708
        })
        assert "source" in weather

    def test_tools_are_langchain_tools(self):
        """Test all tools are proper LangChain tools"""
        tools = [
            get_current_location,
            get_flight_status,
            get_traffic_conditions,
            get_weather_forecast,
            get_airport_intelligence
        ]
        
        for tool in tools:
            assert hasattr(tool, "invoke")
            assert hasattr(tool, "name")
            assert hasattr(tool, "description")


class TestToolErrorHandling:
    """Test error handling in tools"""

    def test_invalid_coordinates(self):
        """Test tools handle invalid coordinates"""
        weather = get_weather_forecast.invoke({
            "latitude": 999,
            "longitude": 999
        })
        
        # Should either return error or handle gracefully
        assert "error" in weather or "source" in weather

    def test_invalid_airport_code(self):
        """Test airport tool with invalid code"""
        result = get_airport_intelligence.invoke({
            "airport_code": "INVALID"
        })
        
        assert "airport_code" in result
        assert result["airport_code"] == "INVALID"

    def test_tools_dont_crash(self):
        """Test tools don't crash on bad input"""
        try:
            get_current_location.invoke({"user_id": None})
            get_flight_status.invoke({"flight_number": ""})
            get_traffic_conditions.invoke({
                "origin": {"lat": 0, "lon": 0},
                "destination": {"lat": 0, "lon": 0}
            })
            get_weather_forecast.invoke({"latitude": 0, "longitude": 0})
            get_airport_intelligence.invoke({"airport_code": ""})
            assert True  # All tools handled bad input
        except Exception as e:
            pytest.fail(f"Tool crashed on bad input: {e}")
