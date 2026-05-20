"""
API Test & Monitoring with Dummy Data
Tests all APIs with dummy data and validates response structures.

This test suite:
1. Tests each API with realistic dummy data
2. Validates API response structures
3. Checks API authentication and connectivity
4. Tests with different scenarios and edge cases
5. Provides detailed response analysis
"""

import os
import sys
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

# Setup paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# Import directly from context_tools
context_tools_path = os.path.join(os.path.dirname(__file__), 'context_tools.py')
import importlib.util
spec = importlib.util.spec_from_file_location("context_tools", context_tools_path)
context_tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(context_tools)

# Import functions
get_current_location = context_tools.get_current_location
get_flight_status = context_tools.get_flight_status
get_traffic_conditions = context_tools.get_traffic_conditions
get_weather_forecast = context_tools.get_weather_forecast
get_airport_intelligence = context_tools.get_airport_intelligence
get_amadeus_token = context_tools.get_amadeus_token

# API Configuration
AMADEUS_CLIENT_ID = context_tools.AMADEUS_CLIENT_ID
AMADEUS_CLIENT_SECRET = context_tools.AMADEUS_CLIENT_SECRET
AMADEUS_API_URL = context_tools.AMADEUS_API_URL
OSRM_BASE_URL = context_tools.OSRM_BASE_URL
OPENWEATHERMAP_API_KEY = context_tools.OPENWEATHERMAP_API_KEY


# ============================================================================
# TERMINAL COLORS
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def print_header(title: str):
    """Print section header."""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}{title:^80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.END}\n")


def print_test_case(name: str):
    """Print test case header."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}▶ {name}{Colors.END}")
    print(f"{Colors.CYAN}{'-'*80}{Colors.END}")


def print_success(msg: str):
    """Print success message."""
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")


def print_warning(msg: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")


def print_error(msg: str):
    """Print error message."""
    print(f"{Colors.RED}✗ {msg}{Colors.END}")


def print_info(msg: str):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")


def validate_response_structure(response: Dict[str, Any], required_fields: List[str], test_name: str) -> bool:
    """Validate API response has required fields."""
    missing_fields = [field for field in required_fields if field not in response]
    
    if missing_fields:
        print_error(f"{test_name}: Missing fields: {', '.join(missing_fields)}")
        return False
    
    print_success(f"{test_name}: All required fields present")
    return True


def print_json_pretty(data: Dict[str, Any], max_depth: int = 2):
    """Print JSON data in a readable format."""
    def truncate_dict(obj, depth=0):
        if depth >= max_depth:
            return "..."
        if isinstance(obj, dict):
            return {k: truncate_dict(v, depth+1) for k, v in list(obj.items())[:5]}
        elif isinstance(obj, list):
            return [truncate_dict(item, depth+1) for item in obj[:3]]
        else:
            return obj
    
    truncated = truncate_dict(data)
    print(f"{Colors.CYAN}{json.dumps(truncated, indent=2)}{Colors.END}")


# ============================================================================
# DUMMY DATA SETS
# ============================================================================

DUMMY_DATA = {
    "locations": [
        {
            "name": "San Francisco Downtown",
            "browser_lat": 37.7749,
            "browser_lon": -122.4194,
            "browser_city": "San Francisco",
            "browser_country": "US"
        },
        {
            "name": "New York Manhattan",
            "browser_lat": 40.7580,
            "browser_lon": -73.9855,
            "browser_city": "New York",
            "browser_country": "US"
        },
        {
            "name": "Los Angeles Downtown",
            "browser_lat": 34.0522,
            "browser_lon": -118.2437,
            "browser_city": "Los Angeles",
            "browser_country": "US"
        }
    ],
    
    "flights": [
        {"flight_number": "UA1008", "carrier": "UA", "route": "SFO-JFK"},
        {"flight_number": "AA100", "carrier": "AA", "route": "LAX-JFK"},
        {"flight_number": "DL200", "carrier": "DL", "route": "ATL-ORD"},
        {"flight_number": "BA178", "carrier": "BA", "route": "LHR-JFK"}
    ],
    
    "routes": [
        {
            "name": "Downtown SF to SFO Airport",
            "origin": {"lat": 37.7749, "lon": -122.4194},
            "dest": {"lat": 37.6213, "lon": -122.3790}
        },
        {
            "name": "Manhattan to JFK Airport",
            "origin": {"lat": 40.7580, "lon": -73.9855},
            "dest": {"lat": 40.6413, "lon": -73.7781}
        },
        {
            "name": "Downtown LA to LAX Airport",
            "origin": {"lat": 34.0522, "lon": -118.2437},
            "dest": {"lat": 33.9416, "lon": -118.4085}
        }
    ],
    
    "airports": ["JFK", "LAX", "SFO", "ORD", "ATL", "DFW", "DEN", "LGA"]
}


# ============================================================================
# API CONFIGURATION CHECK
# ============================================================================

def check_api_configuration():
    """Check which APIs are configured."""
    print_header("API CONFIGURATION CHECK")
    
    config_status = {
        "Amadeus (Flights)": bool(AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET),
        "OSRM (Traffic)": bool(OSRM_BASE_URL),
        "OpenWeatherMap (Weather)": bool(OPENWEATHERMAP_API_KEY)
    }
    
    for api_name, is_configured in config_status.items():
        if is_configured:
            print_success(f"{api_name}: Configured ✓")
        else:
            print_warning(f"{api_name}: Not configured (will use mock data)")
    
    # Test Amadeus authentication if configured
    if config_status["Amadeus (Flights)"]:
        print_test_case("Amadeus OAuth2 Authentication")
        try:
            token = get_amadeus_token()
            if token:
                print_success(f"Token acquired: {token[:30]}...")
            else:
                print_error("Failed to acquire token")
        except Exception as e:
            print_error(f"Authentication failed: {e}")
    
    return config_status


# ============================================================================
# TEST 1: LOCATION API WITH DUMMY DATA
# ============================================================================

def test_location_api():
    """Test location API with various dummy locations."""
    print_header("TEST 1: LOCATION API")
    
    results = []
    
    for location in DUMMY_DATA["locations"]:
        print_test_case(f"Location: {location['name']}")
        
        input_data = {
            "user_id": f"test_user_{location['name'].replace(' ', '_')}",
            "browser_lat": location["browser_lat"],
            "browser_lon": location["browser_lon"],
            "browser_city": location["browser_city"],
            "browser_country": location["browser_country"],
            "browser_detected_at": datetime.now(timezone.utc).isoformat()
        }
        
        print_info(f"Input: ({location['browser_lat']}, {location['browser_lon']})")
        
        try:
            result = get_current_location.invoke(input_data)
            
            # Validate response
            required_fields = ["latitude", "longitude", "city", "country", "source", "detected_at"]
            is_valid = validate_response_structure(result, required_fields, "Location API")
            
            if is_valid:
                print_success(f"Source: {result['source']}")
                print_success(f"Location: {result['city']}, {result['country']}")
                print_success(f"Coordinates: ({result['latitude']}, {result['longitude']})")
                
                # Verify coordinates match
                if result['latitude'] == location['browser_lat'] and result['longitude'] == location['browser_lon']:
                    print_success("Coordinates match input ✓")
                else:
                    print_warning("Coordinates don't match input (may be using fallback)")
                
                results.append({"location": location["name"], "status": "PASS"})
            else:
                results.append({"location": location["name"], "status": "FAIL"})
                
        except Exception as e:
            print_error(f"Exception: {e}")
            results.append({"location": location["name"], "status": "ERROR", "error": str(e)})
    
    return results


# ============================================================================
# TEST 2: FLIGHT STATUS API WITH DUMMY DATA
# ============================================================================

def test_flight_status_api():
    """Test flight status API with various flights."""
    print_header("TEST 2: FLIGHT STATUS API")
    
    results = []
    flight_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    
    for flight in DUMMY_DATA["flights"]:
        print_test_case(f"Flight: {flight['flight_number']} ({flight['route']})")
        
        input_data = {
            "flight_number": flight["flight_number"],
            "flight_date": flight_date
        }
        
        print_info(f"Input: {flight['flight_number']} on {flight_date}")
        
        try:
            result = get_flight_status.invoke(input_data)
            
            # Validate response
            required_fields = ["flight_number", "status", "departure_airport", "arrival_airport", "source", "last_updated"]
            is_valid = validate_response_structure(result, required_fields, "Flight Status API")
            
            if is_valid:
                print_success(f"Source: {result['source']}")
                print_success(f"Status: {result['status']}")
                print_success(f"Route: {result['departure_airport']} → {result['arrival_airport']}")
                
                if result.get('gate'):
                    print_info(f"Gate: {result['gate']}")
                if result.get('terminal'):
                    print_info(f"Terminal: {result['terminal']}")
                if result.get('delay_minutes'):
                    print_warning(f"Delay: {result['delay_minutes']} minutes")
                
                # Check if using real API or mock
                if result['source'] == 'amadeus':
                    print_success("Using real Amadeus API data ✓")
                elif result['source'] == 'mock_data':
                    print_warning("Using mock data (flight not found or API issue)")
                
                results.append({"flight": flight["flight_number"], "status": "PASS", "source": result['source']})
            else:
                results.append({"flight": flight["flight_number"], "status": "FAIL"})
                
        except Exception as e:
            print_error(f"Exception: {e}")
            results.append({"flight": flight["flight_number"], "status": "ERROR", "error": str(e)})
    
    return results


# ============================================================================
# TEST 3: TRAFFIC API WITH DUMMY DATA
# ============================================================================

def test_traffic_api():
    """Test traffic API with various routes."""
    print_header("TEST 3: TRAFFIC API (OSRM)")
    
    results = []
    
    for route in DUMMY_DATA["routes"]:
        print_test_case(f"Route: {route['name']}")
        
        input_data = {
            "origin_lat": route["origin"]["lat"],
            "origin_lon": route["origin"]["lon"],
            "dest_lat": route["dest"]["lat"],
            "dest_lon": route["dest"]["lon"]
        }
        
        print_info(f"Origin: ({route['origin']['lat']}, {route['origin']['lon']})")
        print_info(f"Destination: ({route['dest']['lat']}, {route['dest']['lon']})")
        
        try:
            start_time = time.time()
            result = get_traffic_conditions.invoke(input_data)
            elapsed_time = time.time() - start_time
            
            # Validate response
            required_fields = ["conditions", "distance_km", "current_duration_minutes", "source", "last_updated"]
            is_valid = validate_response_structure(result, required_fields, "Traffic API")
            
            if is_valid:
                print_success(f"Source: {result['source']}")
                print_success(f"Distance: {result['distance_km']:.2f} km")
                print_success(f"Duration: {result['current_duration_minutes']:.1f} minutes")
                print_success(f"Conditions: {result['conditions']}")
                print_info(f"API Response Time: {elapsed_time:.2f}s")
                
                if result.get('delay_minutes') and result['delay_minutes'] > 0:
                    print_warning(f"Delay: {result['delay_minutes']:.1f} minutes")
                
                # Check if using real OSRM or fallback
                if result['source'] == 'osrm':
                    print_success("Using real OSRM API data ✓")
                else:
                    print_warning(f"Using {result['source']}")
                
                results.append({"route": route["name"], "status": "PASS", "source": result['source']})
            else:
                results.append({"route": route["name"], "status": "FAIL"})
                
        except Exception as e:
            print_error(f"Exception: {e}")
            results.append({"route": route["name"], "status": "ERROR", "error": str(e)})
    
    return results


# ============================================================================
# TEST 4: WEATHER API WITH DUMMY DATA
# ============================================================================

def test_weather_api():
    """Test weather API with various locations."""
    print_header("TEST 4: WEATHER API")
    
    results = []
    
    for location in DUMMY_DATA["locations"]:
        print_test_case(f"Weather: {location['name']}")
        
        input_data = {
            "latitude": location["browser_lat"],
            "longitude": location["browser_lon"],
            "days": 3
        }
        
        print_info(f"Location: ({location['browser_lat']}, {location['browser_lon']})")
        
        try:
            result = get_weather_forecast.invoke(input_data)
            
            # Validate response
            required_fields = ["current", "source", "last_updated"]
            is_valid = validate_response_structure(result, required_fields, "Weather API")
            
            if is_valid:
                current = result["current"]
                
                print_success(f"Source: {result['source']}")
                print_success(f"Condition: {current.get('condition', 'N/A')}")
                print_success(f"Temperature: {current.get('temperature_celsius', 'N/A')}°C")
                print_success(f"Humidity: {current.get('humidity_percent', 'N/A')}%")
                
                if "hourly" in result:
                    print_info(f"Hourly forecast: {len(result['hourly'])} entries")
                if "daily" in result:
                    print_info(f"Daily forecast: {len(result['daily'])} entries")
                
                results.append({"location": location["name"], "status": "PASS", "source": result['source']})
            else:
                results.append({"location": location["name"], "status": "FAIL"})
                
        except Exception as e:
            print_error(f"Exception: {e}")
            results.append({"location": location["name"], "status": "ERROR", "error": str(e)})
    
    return results


# ============================================================================
# TEST 5: AIRPORT INTELLIGENCE API WITH DUMMY DATA
# ============================================================================

def test_airport_api():
    """Test airport intelligence API."""
    print_header("TEST 5: AIRPORT INTELLIGENCE API")
    
    results = []
    
    for airport_code in DUMMY_DATA["airports"]:
        print_test_case(f"Airport: {airport_code}")
        
        input_data = {"airport_code": airport_code}
        
        try:
            result = get_airport_intelligence.invoke(input_data)
            
            # Validate response
            required_fields = ["airport_code", "name", "security", "congestion", "source", "last_updated"]
            is_valid = validate_response_structure(result, required_fields, "Airport API")
            
            if is_valid:
                print_success(f"Name: {result['name']}")
                print_success(f"Security Wait: {result['security'].get('average_wait_minutes', 'N/A')} min")
                print_success(f"Crowd Level: {result['security'].get('current_crowd_level', 'N/A')}")
                print_success(f"Congestion: {result['congestion'].get('overall_level', 'N/A')}")
                print_success(f"Source: {result['source']}")
                
                results.append({"airport": airport_code, "status": "PASS", "source": result['source']})
            else:
                results.append({"airport": airport_code, "status": "FAIL"})
                
        except Exception as e:
            print_error(f"Exception: {e}")
            results.append({"airport": airport_code, "status": "ERROR", "error": str(e)})
    
    return results


# ============================================================================
# TEST 6: RESPONSE CONSISTENCY
# ============================================================================

def test_response_consistency():
    """Test that same inputs produce consistent outputs."""
    print_header("TEST 6: RESPONSE CONSISTENCY")
    
    print_test_case("Location Consistency")
    
    input_data = {
        "user_id": "test_consistency",
        "browser_lat": 40.7128,
        "browser_lon": -74.0060,
        "browser_city": "New York",
        "browser_country": "US",
        "browser_detected_at": datetime.now(timezone.utc).isoformat()
    }
    
    result1 = get_current_location.invoke(input_data)
    result2 = get_current_location.invoke(input_data)
    
    if result1["latitude"] == result2["latitude"] and result1["longitude"] == result2["longitude"]:
        print_success("Location data is consistent ✓")
    else:
        print_warning("Location data varies between calls")
    
    print_test_case("Traffic Consistency")
    
    traffic_input = {
        "origin_lat": 40.7580,
        "origin_lon": -73.9855,
        "dest_lat": 40.6413,
        "dest_lon": -73.7781
    }
    
    traffic1 = get_traffic_conditions.invoke(traffic_input)
    traffic2 = get_traffic_conditions.invoke(traffic_input)
    
    if traffic1.get("distance_km") == traffic2.get("distance_km"):
        print_success("Traffic distance is consistent ✓")
    else:
        print_warning("Traffic data varies (may be real-time data)")


# ============================================================================
# FINAL REPORT
# ============================================================================

def generate_final_report(all_results: Dict[str, List[Dict]]):
    """Generate final test report."""
    print_header("FINAL TEST REPORT")
    
    total_tests = sum(len(results) for results in all_results.values())
    total_passed = sum(
        sum(1 for r in results if r.get("status") == "PASS")
        for results in all_results.values()
    )
    
    print(f"\n{Colors.BOLD}Overall Results:{Colors.END}")
    print(f"  Total Tests: {total_tests}")
    print(f"  Passed: {total_passed}")
    print(f"  Failed: {total_tests - total_passed}")
    print(f"  Success Rate: {total_passed/total_tests*100:.1f}%\n")
    
    for test_name, results in all_results.items():
        passed = sum(1 for r in results if r.get("status") == "PASS")
        total = len(results)
        
        status_icon = "✓" if passed == total else "⚠"
        print(f"{status_icon} {test_name}: {passed}/{total} passed")
    
    print(f"\n{Colors.BOLD}API Sources Used:{Colors.END}")
    
    # Collect sources
    sources_used = set()
    for results in all_results.values():
        for result in results:
            if "source" in result:
                sources_used.add(result["source"])
    
    for source in sources_used:
        if source == "amadeus":
            print_success(f"Amadeus API: Real data")
        elif source == "osrm":
            print_success(f"OSRM API: Real data")
        elif source == "openweathermap":
            print_success(f"OpenWeatherMap API: Real data")
        elif source == "mock_data":
            print_warning(f"Mock data: Used as fallback")
        elif source == "browser_geolocation":
            print_success(f"Browser GPS: Real location data")
    
    print(f"\n{Colors.BOLD}Conclusion:{Colors.END}")
    if total_passed == total_tests:
        print_success("All tests passed! System is fully operational. ✓")
    elif total_passed >= total_tests * 0.8:
        print_success("Most tests passed. System is operational with minor issues.")
    else:
        print_warning("Multiple test failures detected. Review configuration.")


# ============================================================================
# MAIN RUNNER
# ============================================================================

def main():
    """Run all API tests."""
    print(f"\n{Colors.BOLD}╔{'='*78}╗{Colors.END}")
    print(f"{Colors.BOLD}║{' '*18}API TEST & MONITORING WITH DUMMY DATA{' '*20}║{Colors.END}")
    print(f"{Colors.BOLD}╚{'='*78}╝{Colors.END}")
    
    # Check configuration
    config_status = check_api_configuration()
    
    # Run all tests
    all_results = {
        "Location API": test_location_api(),
        "Flight Status API": test_flight_status_api(),
        "Traffic API": test_traffic_api(),
        "Weather API": test_weather_api(),
        "Airport Intelligence API": test_airport_api()
    }
    
    # Test consistency
    test_response_consistency()
    
    # Generate report
    generate_final_report(all_results)
    
    print(f"\n{Colors.BOLD}{'='*80}{Colors.END}\n")


if __name__ == "__main__":
    main()
