#!/usr/bin/env python3
"""
Test Background Task Manager
Tests task scheduling, execution, cancellation, and handlers
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from background_tasks import (
    BackgroundTaskManager,
    TaskStatus,
    TaskPriority
)

# Track executed tasks for verification
executed_tasks = []

async def dummy_notification_handler(notification_type: str = None, message: str = None, channels: list = None, **kwargs):
    """Dummy handler for notification tasks"""
    print(f"\n[NOTIFICATION] Handler Called:")
    print(f"   Type: {notification_type}")
    print(f"   Message: {message}")
    print(f"   Channels: {channels}")
    executed_tasks.append(("notification", notification_type, message))
    await asyncio.sleep(0.1)  # Simulate work
    return {"sent": True, "channels": channels}

async def dummy_recalculation_handler(journey_id: str = None, **kwargs):
    """Dummy handler for recalculation tasks"""
    print(f"\n[RECALCULATION] Handler Called:")
    print(f"   Journey ID: {journey_id}")
    executed_tasks.append(("recalculation", journey_id))
    await asyncio.sleep(0.1)  # Simulate work
    return {"recalculated": True, "journey_id": journey_id}

async def dummy_monitoring_handler(journey_id: str = None, **kwargs):
    """Dummy handler for monitoring tasks"""
    print(f"\n[MONITORING] Handler Called:")
    print(f"   Journey ID: {journey_id}")
    executed_tasks.append(("monitoring", journey_id))
    await asyncio.sleep(0.1)  # Simulate work
    return {"checked": True, "journey_id": journey_id}

async def test_basic_task_scheduling():
    """Test 1: Basic task scheduling and execution"""
    print("\n" + "="*70)
    print("TEST 1: BASIC TASK SCHEDULING")
    print("="*70)
    
    manager = BackgroundTaskManager(max_concurrent_tasks=5)
    await manager.start()
    
    # Register handlers
    manager.register_handler("test_task", dummy_monitoring_handler)
    
    # Schedule a task
    task = await manager.schedule_task(
        task_type="test_task",
        name="Test Task 1",
        journey_id="journey_001",
        priority=TaskPriority.NORMAL
    )
    
    print(f"\n[SCHEDULED] Task scheduled: {task.task_id}")
    print(f"   Status: {task.status.value}")
    print(f"   Priority: {task.priority.value}")
    
    # Wait for execution
    await asyncio.sleep(0.5)
    
    # Check result
    completed_task = manager.get_task(task.task_id)
    print(f"\n[RESULT] Task completed:")
    print(f"   Status: {completed_task.status.value}")
    print(f"   Result: {completed_task.result}")
    
    success = completed_task.status == TaskStatus.COMPLETED
    print(f"   Test Result: {'[PASS]' if success else '[FAIL]'}")
    
    await manager.stop()
    return success

async def test_delayed_task():
    """Test 2: Delayed task scheduling"""
    print("\n" + "="*70)
    print("TEST 2: DELAYED TASK SCHEDULING")
    print("="*70)
    
    manager = BackgroundTaskManager()
    await manager.start()
    
    manager.register_handler("delayed_test", dummy_monitoring_handler)
    
    # Schedule task with 2 second delay
    print(f"\n[DELAYED] Scheduling task with 2 second delay at {datetime.now(timezone.utc).strftime('%H:%M:%S')}")
    
    task = await manager.schedule_task(
        task_type="delayed_test",
        name="Delayed Task",
        journey_id="journey_002",
        delay_seconds=2
    )
    
    print(f"   Task ID: {task.task_id}")
    print(f"   Scheduled for: {task.scheduled_time.strftime('%H:%M:%S')}")
    
    # Check status before delay
    print(f"\n[STATUS] Status after 0.5s:")
    await asyncio.sleep(0.5)
    print(f"   Status: {manager.get_task(task.task_id).status.value}")
    
    # Wait for execution
    await asyncio.sleep(2)
    
    print(f"\n[STATUS] Status after 2.5s:")
    completed = manager.get_task(task.task_id)
    print(f"   Status: {completed.status.value}")
    print(f"   Completed at: {completed.completed_at.strftime('%H:%M:%S') if completed.completed_at else 'N/A'}")
    
    success = completed.status == TaskStatus.COMPLETED
    print(f"   Test Result: {'[PASS] PASS' if success else '[FAIL] FAIL'}")
    
    await manager.stop()
    return success

async def test_notification_task():
    """Test 3: Notification task scheduling"""
    print("\n" + "="*70)
    print("TEST 3: NOTIFICATION TASK SCHEDULING")
    print("="*70)
    
    manager = BackgroundTaskManager()
    await manager.start()
    
    manager.register_handler("notification", dummy_notification_handler)
    
    # Schedule immediate notification
    scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=1)
    
    task = await manager.schedule_notification_task(
        journey_id="journey_003",
        notification_type="flight_reminder",
        scheduled_time=scheduled_time,
        message="Your flight departs in 2 hours from Gate B12",
        channels=["push", "email"]
    )
    
    print(f"\n[SCHEDULED] Notification scheduled:")
    print(f"   Task ID: {task.task_id}")
    print(f"   Type: flight_reminder")
    print(f"   Priority: {task.priority.value}")
    
    # Wait for execution
    await asyncio.sleep(2)
    
    completed = manager.get_task(task.task_id)
    print(f"\n[RESULT] Notification sent:")
    print(f"   Status: {completed.status.value}")
    print(f"   Result: {completed.result}")
    
    success = completed.status == TaskStatus.COMPLETED
    print(f"   Test Result: {'[PASS]' if success else '[FAIL]'}")
    
    await manager.stop()
    return success

async def test_recalculation_task():
    """Test 4: Recalculation task scheduling"""
    print("\n" + "="*70)
    print("TEST 4: RECALCULATION TASK SCHEDULING")
    print("="*70)
    
    manager = BackgroundTaskManager()
    await manager.start()
    
    manager.register_handler("recalculate_timeline", dummy_recalculation_handler)
    
    task = await manager.schedule_recalculation_task(
        journey_id="journey_004",
        recalculation_type="timeline"
    )
    
    print(f"\n[SCHEDULED] Recalculation scheduled:")
    print(f"   Task ID: {task.task_id}")
    print(f"   Type: recalculate_timeline")
    
    await asyncio.sleep(0.5)
    
    completed = manager.get_task(task.task_id)
    print(f"\n[RESULT] Recalculation completed:")
    print(f"   Status: {completed.status.value}")
    print(f"   Result: {completed.result}")
    
    success = completed.status == TaskStatus.COMPLETED
    print(f"   Test Result: {'[PASS]' if success else '[FAIL]'}")
    
    await manager.stop()
    return success
    
    await manager.stop()
    return completed.status == TaskStatus.COMPLETED

async def test_task_cancellation():
    """Test 5: Task cancellation"""
    print("\n" + "="*70)
    print("TEST 5: TASK CANCELLATION")
    print("="*70)
    
    manager = BackgroundTaskManager()
    await manager.start()
    
    manager.register_handler("long_task", dummy_monitoring_handler)
    
    # Schedule task with long delay
    task = await manager.schedule_task(
        task_type="long_task",
        name="Long Task to Cancel",
        journey_id="journey_005",
        delay_seconds=10  # Long delay
    )
    
    print(f"\n[SCHEDULED] Task scheduled with 10s delay:")
    print(f"   Task ID: {task.task_id}")
    print(f"   Status: {manager.get_task(task.task_id).status.value}")
    
    await asyncio.sleep(0.5)
    
    # Cancel the task
    cancelled = await manager.cancel_task(task.task_id)
    
    print(f"\n[CANCELLED] Task cancelled:")
    print(f"   Success: {cancelled}")
    print(f"   Status: {manager.get_task(task.task_id).status.value}")
    
    await manager.stop()
    return manager.get_task(task.task_id).status == TaskStatus.CANCELLED

async def test_journey_task_cancellation():
    """Test 6: Cancel all tasks for a journey"""
    print("\n" + "="*70)
    print("TEST 6: JOURNEY TASK CANCELLATION")
    print("="*70)
    
    manager = BackgroundTaskManager()
    await manager.start()
    
    manager.register_handler("journey_task", dummy_monitoring_handler)
    
    # Schedule multiple tasks for same journey
    journey_id = "journey_006"
    
    tasks = []
    for i in range(3):
        task = await manager.schedule_task(
            task_type="journey_task",
            name=f"Journey Task {i+1}",
            journey_id=journey_id,
            delay_seconds=5
        )
        tasks.append(task)
    
    print(f"\n[SCHEDULED] Scheduled {len(tasks)} tasks for {journey_id}")
    
    await asyncio.sleep(0.5)
    
    # Cancel all tasks for journey
    cancelled_count = await manager.cancel_journey_tasks(journey_id)
    
    print(f"\n[CANCELLED] Cancelled {cancelled_count} tasks")
    
    # Check status
    journey_tasks = manager.get_journey_tasks(journey_id)
    print(f"\n[STATUS] Journey tasks status:")
    for task in journey_tasks:
        print(f"   {task.name}: {task.status.value}")
    
    await manager.stop()
    return cancelled_count == 3

async def test_task_stats():
    """Test 7: Task manager statistics"""
    print("\n" + "="*70)
    print("TEST 7: TASK MANAGER STATISTICS")
    print("="*70)
    
    manager = BackgroundTaskManager(max_concurrent_tasks=3)
    await manager.start()
    
    manager.register_handler("stats_test", dummy_monitoring_handler)
    
    # Schedule various tasks
    await manager.schedule_task("stats_test", "Task 1", journey_id="j1")
    await manager.schedule_task("stats_test", "Task 2", journey_id="j2", delay_seconds=10)
    await manager.schedule_task("stats_test", "Task 3", journey_id="j3")
    
    await asyncio.sleep(0.5)
    
    stats = manager.get_stats()
    
    print(f"\n[STATS] Task Manager Statistics:")
    print(f"   Total tasks: {stats['total_tasks']}")
    print(f"   Running tasks: {stats['running_tasks']}")
    print(f"   Max concurrent: {stats['max_concurrent']}")
    print(f"\n   Status breakdown:")
    for status, count in stats['status_counts'].items():
        print(f"      {status}: {count}")
    
    await manager.stop()
    return stats['total_tasks'] == 3

async def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("  BACKGROUND TASK MANAGER - TEST SUITE")
    print("="*70)
    
    global executed_tasks
    
    tests = [
        ("Basic Task Scheduling", test_basic_task_scheduling),
        ("Delayed Task", test_delayed_task),
        ("Notification Task", test_notification_task),
        ("Recalculation Task", test_recalculation_task),
        ("Task Cancellation", test_task_cancellation),
        ("Journey Task Cancellation", test_journey_task_cancellation),
        ("Task Statistics", test_task_stats)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            executed_tasks = []  # Reset
            result = await test_func()
            results[test_name] = result
        except Exception as e:
            print(f"\n[ERROR] ERROR in {test_name}: {e}")
            import traceback
            traceback.print_exc()
            results[test_name] = False
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status}  {test_name}")
    
    passed = sum(results.values())
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("="*70 + "\n")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
