"""
Quick test script for Journey Workflow
Run from project root: python -m ai.agent.journey.test_journey_workflow
Run from ai/: python -m agent.journey.test_journey_workflow
"""

import asyncio
from langchain_core.messages import HumanMessage, SystemMessage


async def test_journey_workflow():
    """Test the journey workflow with a sample message."""

    # Import the compiled journey graph (works from either ai/ or project root)
    try:
        from ai.agent.journey.journey_orchestrator import graph
    except ModuleNotFoundError:
        from agent.journey.journey_orchestrator import graph

    # Create initial state
    initial_state = {
        "messages": [
            HumanMessage(content="I want to plan a relaxing beach vacation for 7 days with a budget of $3000")
        ]
    }

    print("=" * 60)
    print("Testing Journey Workflow")
    print("=" * 60)
    print(f"\nInput: {initial_state['messages'][0].content}\n")

    # Invoke the graph
    result = await graph.ainvoke(initial_state)

    print("\n" + "=" * 60)
    print("Journey Workflow Result")
    print("=" * 60)

    # Print all messages
    for i, msg in enumerate(result.get("messages", []), 1):
        print(f"\n[Message {i}] {msg.__class__.__name__}:")
        print(f"{msg.content}")

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

    return result


async def test_specific_segment(segment_name="inspiration"):
    """Test a specific segment orchestrator."""

    print(f"\n{'=' * 60}")
    print(f"Testing {segment_name.title()} Segment")
    print("=" * 60)

    # Import the specific segment graph (works from either ai/ or project root)
    if segment_name == "inspiration":
        try:
            from ai.agent.journey.phase_3_segment_orchestrators.segments.inspiration import create_inspiration_graph
        except ModuleNotFoundError:
            from agent.journey.phase_3_segment_orchestrators.segments.inspiration import create_inspiration_graph
        segment_graph = create_inspiration_graph()

    elif segment_name == "home_to_airport":
        try:
            from ai.agent.journey.phase_3_segment_orchestrators.segments.home_to_airport import create_home_to_airport_graph
        except ModuleNotFoundError:
            from agent.journey.phase_3_segment_orchestrators.segments.home_to_airport import create_home_to_airport_graph
        segment_graph = create_home_to_airport_graph()

    else:
        print(f"Segment {segment_name} not configured in this test")
        return

    # Create test state
    test_state = {
        "messages": [
            HumanMessage(content="I want to visit Bali for a week, love beaches and culture")
        ],
        "journey_context": {},
        "segment_data": {}
    }

    # Interactive loop: keep invoking until the graph completes without asking for clarification
    while True:
        result = await segment_graph.ainvoke(test_state)

        print("\nSegment Result:")
        for msg in result.get("messages", []):
            print(f"  {msg.content}")

        segment_data = result.get("segment_data", {})

        # Check if graph stopped early for clarification
        if segment_data.get("needs_clarification"):
            questions = segment_data.get("questions", [])
            print("\n--- Clarification needed ---")
            for q in questions:
                print(f"  • {q}")

            user_input = input("\nYour answer: ").strip()
            if not user_input or user_input.lower() in ("quit", "exit", "q"):
                print("Exiting.")
                break

            # Feed the answer back: carry over existing segment data and append the new message
            test_state = {
                "messages": result.get("messages", []) + [HumanMessage(content=user_input)],
                "journey_context": result.get("journey_context", {}),
                "segment_data": {k: v for k, v in segment_data.items()
                                 if k not in ("needs_clarification", "questions", "_should_continue")}
            }
        else:
            # Graph ran to completion
            if segment_data:
                print(f"\nSegment Data: {segment_data}")
            break

    return result


async def test_e2e_with_monitoring():
    """
    End-to-end test with monitoring (7.7).
    Sets singletons, creates journey, starts monitoring, sends message via handle_user_message,
    asserts monitoring is injected and segment runs with real-time context.
    """
    try:
        from agent.journey.journey_orchestrator import (
            JourneyOrchestrator,
            set_journey_singletons,
            segment_router_node,
        )
        from agent.journey.phase_1_foundation import JourneyStateManager
        from agent.journey.phase_2_context_monitoring import ContextMonitor, MonitoringType
    except ModuleNotFoundError:
        from ai.agent.journey.journey_orchestrator import (
            JourneyOrchestrator,
            set_journey_singletons,
            segment_router_node,
        )
        from ai.agent.journey.phase_1_foundation import JourneyStateManager
        from ai.agent.journey.phase_2_context_monitoring import ContextMonitor, MonitoringType

    print("=" * 60)
    print("E2E Test: Journey + Monitoring injection")
    print("=" * 60)

    mgr = JourneyStateManager()
    monitor = ContextMonitor(state_manager=mgr)
    set_journey_singletons(mgr, monitor)
    orch = JourneyOrchestrator(state_manager=mgr, context_monitor=monitor)

    # Create journey and start monitoring
    j = mgr.initialize_journey("e2e_user")
    journey_id = j.journey_id
    await monitor.start_monitoring(journey_id, monitoring_types=[MonitoringType.LOCATION])
    await asyncio.sleep(1.5)

    # 1) Assert segment_router_node injects monitoring when journey_id in context
    state = {
        "messages": [
            SystemMessage(content=f"User Context:\nuser_id=e2e_user\njourney_id={journey_id}"),
            HumanMessage(content="When should I leave?"),
        ],
        "journey_context": None,
        "segment_data": None,
    }
    out = await segment_router_node(state)
    jc = out.get("journey_context", {})
    assert "journey_id" in jc, "journey_id should be in journey_context"
    assert jc.get("journey_id") == journey_id, "journey_id should match"
    monitoring = jc.get("monitoring") or {}
    assert monitoring, "monitoring should be injected when journey_id present"
    print(f"  segment_router: journey_context.monitoring keys = {list(monitoring.keys())}")

    # 2) handle_user_message path: run inspiration (current segment), assert no crash and context has monitoring
    result = await orch.handle_user_message(journey_id, "Beach vacation 5 days 2000 dollars")
    assert result.segment_name == "inspiration"
    assert result.success, f"inspiration should succeed: {result.error}"
    print(f"  handle_user_message: segment={result.segment_name}, success={result.success}")

    await monitor.stop_monitoring(journey_id)
    print("  E2E test passed: monitoring injected and handle_user_message ran with context.")
    print("=" * 60)
    return result


if __name__ == "__main__":
    print("\n🚀 Journey Workflow Test Suite\n")

    # Test 1: Full Journey Workflow
    print("Test 1: Full Journey Workflow")
    asyncio.run(test_journey_workflow())

    # Test 2: Specific Segment (Inspiration)
    print("\n\nTest 2: Inspiration Segment Only")
    asyncio.run(test_specific_segment("inspiration"))

    # Test 3: Home to Airport Segment
    print("\n\nTest 3: Home to Airport Segment")
    asyncio.run(test_specific_segment("home_to_airport"))

    # Test 4: E2E with monitoring (7.7)
    print("\n\nTest 4: E2E with monitoring")
    asyncio.run(test_e2e_with_monitoring())
