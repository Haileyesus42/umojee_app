#!/usr/bin/env python3
"""
Test Context Monitor Service
Tests monitoring lifecycle, multiple monitoring types, and context updates
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from context_monitor import (
    ContextMonitor,
    MonitoringType,
    MonitoringConfig,
    ContextUpdate
)

# Track context updates for verification
received_updates = []


def capture_update(update: ContextUpdate):
    """Callback to capture context updates"""
    print(f"\n[UPDATE] Context Update Received:")
    print(f"   Type: {update.monitoring_type.value}")
    print(f"   Journey: {update.journey_id}")
    print(f"   Success: {update.success}")
    print(f"   Data keys: {list(update.data.keys()) if update.data else []}")
    received_updates.append(update)


async def test_start_stop_monitoring():
    """Test 1: Basic start and stop monitoring"""
    print("\n" + "="*70)
    print("TEST 1: START AND STOP MONITORING")
    print("="*70)
    
    monitor = ContextMonitor(on_context_update=capture_update)
    
    # Start monitoring
    success = await monitor.start_monitoring(
        "journey_001",
        [MonitoringType.LOCATION]
    )
    
    print(f"\n[PASS] Monitoring started: {success}")
    print(f"   Active journeys: {monitor.get_active_journeys()}")
    print(f"   Is monitoring: {monitor.is_monitoring('journey_001')}")
    
    await asyncio.sleep(0.5)
    
    # Stop monitoring
    stopped = await monitor.stop_monitoring("journey_001")
    
    print(f"\n[FAIL] Monitoring stopped: {stopped}")
    print(f"   Active journeys: {monitor.get_active_journeys()}")
    print(f"   Is monitoring: {monitor.is_monitoring('journey_001')}")
    
    result = success and stopped and not monitor.is_monitoring('journey_001')
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    await monitor.stop_all()
    return result


async def test_multiple_monitoring_types():
    """Test 2: Monitor multiple types simultaneously"""
    print("\n" + "="*70)
    print("TEST 2: MULTIPLE MONITORING TYPES")
    print("="*70)
    
    global received_updates
    received_updates = []
    
    # Use faster intervals for testing
    config = MonitoringConfig(
        location_interval_seconds=1,
        weather_interval_seconds=1,
        traffic_interval_seconds=1
    )
    
    monitor = ContextMonitor(config=config, on_context_update=capture_update)
    
    # Start monitoring multiple types
    types = [
        MonitoringType.LOCATION,
        MonitoringType.WEATHER,
        MonitoringType.TRAFFIC
    ]
    
    success = await monitor.start_monitoring("journey_002", types)
    
    print(f"\n[PASS] Started monitoring: {success}")
    print(f"   Types: {[t.value for t in types]}")
    
    # Wait for at least one update from each type
    await asyncio.sleep(2)
    
    # Check received updates
    update_types = {u.monitoring_type for u in received_updates}
    
    print(f"\n[STATUS] Updates received:")
    print(f"   Total updates: {len(received_updates)}")
    print(f"   Update types: {[t.value for t in update_types]}")
    
    await monitor.stop_monitoring("journey_002")
    await monitor.stop_all()
    
    # Success if we got at least one update
    result = len(received_updates) >= 1
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_latest_context():
    """Test 3: Get latest context for a journey"""
    print("\n" + "="*70)
    print("TEST 3: LATEST CONTEXT RETRIEVAL")
    print("="*70)
    
    config = MonitoringConfig(location_interval_seconds=1)
    monitor = ContextMonitor(config=config)
    
    await monitor.start_monitoring("journey_003", [MonitoringType.LOCATION])
    
    # Wait for some updates
    await asyncio.sleep(1.5)
    
    # Get latest context
    latest = monitor.get_latest_context("journey_003")
    
    print(f"\n[STATUS] Latest context:")
    if latest:
        for monitor_type, update in latest.items():
            print(f"   {monitor_type.value}:")
            print(f"      Success: {update.success}")
            print(f"      Timestamp: {update.timestamp.strftime('%H:%M:%S')}")
    
    # Get specific type
    location = monitor.get_latest_context("journey_003", MonitoringType.LOCATION)
    
    print(f"\n[LOCATION] Latest location context:")
    if location:
        print(f"   Available: Yes")
        print(f"   Success: {location[MonitoringType.LOCATION].success}")
    
    await monitor.stop_monitoring("journey_003")
    await monitor.stop_all()
    
    result = latest is not None
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_monitoring_config():
    """Test 4: Custom monitoring configuration"""
    print("\n" + "="*70)
    print("TEST 4: CUSTOM MONITORING CONFIG")
    print("="*70)
    
    # Custom config with very fast intervals
    config = MonitoringConfig(
        location_interval_seconds=1,
        flight_status_interval_seconds=2,
        max_retries=5,
        retry_delay_seconds=1
    )
    
    print(f"\n[CONFIG] Custom configuration:")
    print(f"   Location interval: {config.location_interval_seconds}s")
    print(f"   Flight status interval: {config.flight_status_interval_seconds}s")
    print(f"   Max retries: {config.max_retries}")
    
    monitor = ContextMonitor(config=config)
    
    success = await monitor.start_monitoring("journey_004", [MonitoringType.LOCATION])
    
    print(f"\n[PASS] Monitoring started with custom config: {success}")
    
    await asyncio.sleep(1.5)
    
    await monitor.stop_monitoring("journey_004")
    await monitor.stop_all()
    
    print(f"\n   Test Result: {'[PASS] PASS' if success else '[FAIL] FAIL'}")
    
    return success


async def test_multiple_journeys():
    """Test 5: Monitor multiple journeys simultaneously"""
    print("\n" + "="*70)
    print("TEST 5: MULTIPLE JOURNEYS")
    print("="*70)
    
    config = MonitoringConfig(location_interval_seconds=1)
    monitor = ContextMonitor(config=config)
    
    journeys = ["journey_005", "journey_006", "journey_007"]
    
    # Start monitoring for multiple journeys
    for journey_id in journeys:
        await monitor.start_monitoring(journey_id, [MonitoringType.LOCATION])
    
    print(f"\n[PASS] Started monitoring for {len(journeys)} journeys")
    
    active = monitor.get_active_journeys()
    print(f"\n[STATUS] Active journeys:")
    for journey_id in active:
        print(f"   - {journey_id}")
    
    await asyncio.sleep(1.5)
    
    # Stop all
    await monitor.stop_all()
    
    print(f"\n[FAIL] Stopped all monitoring")
    print(f"   Active journeys: {monitor.get_active_journeys()}")
    
    result = len(active) == len(journeys) and len(monitor.get_active_journeys()) == 0
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_context_update_callback():
    """Test 6: Context update callback functionality"""
    print("\n" + "="*70)
    print("TEST 6: CONTEXT UPDATE CALLBACK")
    print("="*70)
    
    global received_updates
    received_updates = []
    
    callback_count = 0
    
    def custom_callback(update: ContextUpdate):
        nonlocal callback_count
        callback_count += 1
        print(f"\n[CALLBACK] Callback #{callback_count}:")
        print(f"   Type: {update.monitoring_type.value}")
        print(f"   Success: {update.success}")
    
    config = MonitoringConfig(location_interval_seconds=1)
    monitor = ContextMonitor(config=config, on_context_update=custom_callback)
    
    await monitor.start_monitoring("journey_008", [MonitoringType.LOCATION])
    
    # Wait for callbacks
    await asyncio.sleep(2.5)
    
    print(f"\n[STATUS] Callback statistics:")
    print(f"   Total callbacks: {callback_count}")
    
    await monitor.stop_monitoring("journey_008")
    await monitor.stop_all()
    
    result = callback_count > 0
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_monitoring_not_active():
    """Test 7: Check behavior when monitoring is not active"""
    print("\n" + "="*70)
    print("TEST 7: NON-ACTIVE MONITORING")
    print("="*70)
    
    monitor = ContextMonitor()
    
    # Try to get context for non-monitored journey
    context = monitor.get_latest_context("nonexistent_journey")
    
    print(f"\n[STATUS] Context for non-monitored journey:")
    print(f"   Result: {context}")
    
    # Check if monitoring
    is_monitoring = monitor.is_monitoring("nonexistent_journey")
    print(f"\n[CHECK] Is monitoring: {is_monitoring}")
    
    # Try to stop non-existent monitoring
    stopped = await monitor.stop_monitoring("nonexistent_journey")
    print(f"\n[FAIL] Stopped result: {stopped}")
    
    await monitor.stop_all()
    
    result = context is None and not is_monitoring and not stopped
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_duplicate_monitoring_start():
    """Test 8: Attempt to start monitoring twice for same journey"""
    print("\n" + "="*70)
    print("TEST 8: DUPLICATE MONITORING START")
    print("="*70)
    
    monitor = ContextMonitor()
    
    # Start monitoring
    first = await monitor.start_monitoring("journey_009", [MonitoringType.LOCATION])
    print(f"\n[PASS] First start: {first}")
    
    # Try to start again
    second = await monitor.start_monitoring("journey_009", [MonitoringType.LOCATION])
    print(f"[WARNING] Second start: {second}")
    
    active = monitor.get_active_journeys()
    print(f"\n[STATUS] Active journeys: {active}")
    
    await monitor.stop_all()
    
    result = first and not second
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_all_monitoring_types():
    """Test 9: Test all monitoring types"""
    print("\n" + "="*70)
    print("TEST 9: ALL MONITORING TYPES")
    print("="*70)
    
    all_types = [
        MonitoringType.LOCATION,
        MonitoringType.FLIGHT_STATUS,
        MonitoringType.WEATHER,
        MonitoringType.TRAFFIC,
        MonitoringType.AIRPORT_CONDITIONS
    ]
    
    config = MonitoringConfig(
        location_interval_seconds=1,
        flight_status_interval_seconds=1,
        weather_interval_seconds=1,
        traffic_interval_seconds=1,
        airport_interval_seconds=1
    )
    
    monitor = ContextMonitor(config=config)
    
    success = await monitor.start_monitoring("journey_010", all_types)
    
    print(f"\n[PASS] Started monitoring all types: {success}")
    print(f"\n[LIST] Monitoring types:")
    for t in all_types:
        print(f"   - {t.value}")
    
    await asyncio.sleep(1.5)
    
    # Check latest context
    latest = monitor.get_latest_context("journey_010")
    
    print(f"\n[STATUS] Latest context available for:")
    if latest:
        for t in latest.keys():
            print(f"   - {t.value}")
    
    await monitor.stop_monitoring("journey_010")
    await monitor.stop_all()
    
    result = success and latest is not None
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def test_stop_all_monitoring():
    """Test 10: Stop all monitoring at once"""
    print("\n" + "="*70)
    print("TEST 10: STOP ALL MONITORING")
    print("="*70)
    
    monitor = ContextMonitor()
    
    # Start monitoring for multiple journeys
    journeys = ["journey_011", "journey_012", "journey_013"]
    for journey_id in journeys:
        await monitor.start_monitoring(journey_id, [MonitoringType.LOCATION])
    
    print(f"\n[PASS] Started monitoring for {len(journeys)} journeys")
    print(f"   Active: {monitor.get_active_journeys()}")
    
    # Stop all at once
    await monitor.stop_all()
    
    print(f"\n[FAIL] Stopped all monitoring")
    print(f"   Active: {monitor.get_active_journeys()}")
    
    result = len(monitor.get_active_journeys()) == 0
    print(f"\n   Test Result: {'[PASS] PASS' if result else '[FAIL] FAIL'}")
    
    return result


async def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("  CONTEXT MONITOR SERVICE - TEST SUITE")
    print("="*70)
    
    global received_updates
    
    tests = [
        ("Start and Stop Monitoring", test_start_stop_monitoring),
        ("Multiple Monitoring Types", test_multiple_monitoring_types),
        ("Latest Context Retrieval", test_latest_context),
        ("Custom Monitoring Config", test_monitoring_config),
        ("Multiple Journeys", test_multiple_journeys),
        ("Context Update Callback", test_context_update_callback),
        ("Non-Active Monitoring", test_monitoring_not_active),
        ("Duplicate Monitoring Start", test_duplicate_monitoring_start),
        ("All Monitoring Types", test_all_monitoring_types),
        ("Stop All Monitoring", test_stop_all_monitoring)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            received_updates = []  # Reset
            result = await test_func()
            results[test_name] = result
        except Exception as e:
            print(f"\n[FAIL] ERROR in {test_name}: {e}")
            import traceback
            traceback.print_exc()
            results[test_name] = False
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    for test_name, passed in results.items():
        status = "[PASS] PASS" if passed else "[FAIL] FAIL"
        print(f"{status}  {test_name}")
    
    passed = sum(results.values())
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("="*70 + "\n")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
