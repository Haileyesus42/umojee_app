#!/usr/bin/env python3
"""
Test script for multi-task handling in the orchestrator and Amadeus workflows.

This script tests the ability to:
1. Parse ONE user message with MULTIPLE tasks
2. Execute tasks SEQUENTIALLY (flight → car → hotel)
3. Pass CONTEXT between tasks
4. Synthesize ALL results into ONE response

Usage:
    python test_multi_task.py
"""

import json
import os
import sys
from dotenv import load_dotenv

# Load environment before importing graph
load_dotenv()

from langchain_core.messages import HumanMessage, SystemMessage
from agent.router import graph


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")


def print_messages(messages):
    """Print messages in a readable format"""
    for i, msg in enumerate(messages):
        role = msg.__class__.__name__.replace("Message", "")
        content = str(msg.content)[:500]  # Truncate long messages
        print(f"[{i+1}] {role}: {content}")
        if len(str(msg.content)) > 500:
            print("    ... (truncated)")
        print()


def test_multi_task_basic():
    """Test basic multi-task: flight + car + hotel"""
    print_section("TEST 1: Multi-Task Basic (Flight + Car + Hotel)")

    # User message requesting 3 Amadeus services
    user_msg = (
        "I need to travel to London from New York on January 25, 2026. "
        "I'll need a rental car at Heathrow airport, and please find me "
        "a hotel near Big Ben for 3 nights."
    )

    print(f"User Request: {user_msg}\n")

    # Mock user context
    user_context = SystemMessage(content="""
User Context:
user_id=test_user_123
conversation_id=test_conv_456
username=John Doe
user_data_full={"firstName":"John","lastName":"Doe","email":"john@example.com"}
frontend_origin=http://localhost:3000
Use this information to personalize responses.
""")

    messages = [user_context, HumanMessage(content=user_msg)]

    # Invoke the graph
    try:
        print("Invoking orchestrator graph...\n")
        result = graph.invoke({"messages": messages})

        print_section("GRAPH EXECUTION RESULT")

        # Print state
        print("State Keys:", result.keys())
        print()

        # Print route information
        if "route" in result:
            print(f"Final Route: {result['route']}")
        if "route_queue" in result:
            print(f"Route Queue: {result['route_queue']}")
        if "tasks_identified" in result:
            print(f"Tasks Identified: {result['tasks_identified']}")
        if "task_context" in result:
            print(f"Task Context: {json.dumps(result.get('task_context'), indent=2)}")

        print()

        # Print messages
        print_section("CONVERSATION MESSAGES")
        print_messages(result.get("messages", []))

        # Print worker results
        if "worker_results" in result:
            print_section("WORKER RESULTS")
            for wr in result.get("worker_results", []):
                print(f"Worker: {wr['worker']}")
                print(f"Content: {wr['content'][:300]}...")
                print()

        # Print accumulated results
        if "accumulated_results" in result:
            print_section("ACCUMULATED RESULTS (Multi-Task)")
            for i, ar in enumerate(result.get("accumulated_results", [])):
                print(f"[Task {i+1}] Worker: {ar['worker']}")
                print(f"Content: {ar['content'][:300]}...")
                print()

        # Extract final AI response
        final_response = None
        for msg in reversed(result.get("messages", [])):
            if msg.__class__.__name__ == "AIMessage":
                final_response = msg.content
                break

        if final_response:
            print_section("FINAL AI RESPONSE")
            try:
                parsed = json.loads(final_response)
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print(final_response)

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_multi_task_flights_hotels():
    """Test multi-task: flight + hotel only"""
    print_section("TEST 2: Multi-Task (Flight + Hotel Only)")

    user_msg = "Book a flight to Paris on Feb 15 and find me a hotel near the Eiffel Tower."

    print(f"User Request: {user_msg}\n")

    user_context = SystemMessage(content="""
User Context:
user_id=test_user_789
conversation_id=test_conv_012
username=Jane Smith
frontend_origin=http://localhost:3000
""")

    messages = [user_context, HumanMessage(content=user_msg)]

    try:
        print("Invoking orchestrator graph...\n")
        result = graph.invoke({"messages": messages})

        print_section("RESULT")

        # Print identified tasks
        if "tasks_identified" in result:
            print(f"Tasks Identified: {result['tasks_identified']}")

        # Print final response
        final_response = None
        for msg in reversed(result.get("messages", [])):
            if msg.__class__.__name__ == "AIMessage":
                final_response = msg.content
                break

        if final_response:
            print("\nFinal Response:")
            try:
                parsed = json.loads(final_response)
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print(final_response[:500])

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_single_task():
    """Test single task (baseline - should still work)"""
    print_section("TEST 3: Single Task (Baseline)")

    user_msg = "Find me flights from NYC to London on January 25."

    print(f"User Request: {user_msg}\n")

    user_context = SystemMessage(content="""
User Context:
user_id=test_user_single
conversation_id=test_conv_single
username=Test User
frontend_origin=http://localhost:3000
""")

    messages = [user_context, HumanMessage(content=user_msg)]

    try:
        print("Invoking orchestrator graph...\n")
        result = graph.invoke({"messages": messages})

        print_section("RESULT")

        # Should NOT have route_queue or accumulated_results
        print(f"Has route_queue: {'route_queue' in result}")
        print(f"Has accumulated_results: {'accumulated_results' in result}")

        # Print final response
        final_response = None
        for msg in reversed(result.get("messages", [])):
            if msg.__class__.__name__ == "AIMessage":
                final_response = msg.content
                break

        if final_response:
            print("\nFinal Response:")
            print(final_response[:500])

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "#"*80)
    print("#  MULTI-TASK HANDLING TEST SUITE")
    print("#"*80)

    # Check environment
    if not os.getenv("GROQ_API_KEY"):
        print("\n❌ ERROR: GROQ_API_KEY not set in environment")
        print("Please set it in .env file or environment variables")
        return False

    print(f"\nUsing model: {os.getenv('GROQ_MODEL', 'default')}")

    tests = [
        ("Single Task (Baseline)", test_single_task),
        ("Multi-Task: Flight + Hotel", test_multi_task_flights_hotels),
        ("Multi-Task: Flight + Car + Hotel", test_multi_task_basic),
    ]

    results = []
    for name, test_func in tests:
        print(f"\n{'='*80}")
        print(f"Running: {name}")
        print('='*80)
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            results.append((name, False))

    # Summary
    print_section("TEST SUMMARY")
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}  {name}")

    total = len(results)
    passed = sum(1 for _, s in results if s)
    print(f"\nTotal: {passed}/{total} tests passed")

    return all(s for _, s in results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
