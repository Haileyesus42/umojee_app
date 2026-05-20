"""
Phase 1 Foundation - Usage Examples

This file demonstrates practical usage patterns for the Phase 1 journey
state management system. Copy and adapt these examples for your use cases.
"""

import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from agent.journey.phase_1_foundation import (
    JourneyStateManager,
    SegmentStateMachine,
    get_journey_repository,
    JourneySegment,
    JourneyStatus,
    SegmentStatus,
    RiskLevel,
    EnergyLevel,
    BudgetComfort,
    LocationContext,
    WeatherContext,
    FlightStatusContext,
    JourneyContext,
    create_custom_criteria,
)


# =============================================================================
# Example 1: Basic Journey Creation and Management
# =============================================================================

def example_1_basic_journey():
    """Create a basic journey and manage its lifecycle."""

    # Initialize state manager (with or without MongoDB)
    manager = JourneyStateManager()  # No MongoDB (in-memory only)
    # Or with MongoDB:
    # manager = JourneyStateManager(mongo_repo=get_journey_repository())

    # Create a new journey
    journey = manager.initialize_journey(
        user_id="user123",
        conversation_id="conv456"
    )

    print(f"✅ Journey created: {journey.journey_id}")
    print(f"   Current segment: {journey.current_segment}")
    print(f"   Status: {journey.status}")
    print(f"   Total segments: {len(journey.segments)}")

    # Get the active segment
    active_segment = manager.get_active_segment(journey.journey_id)
    print(f"   Active segment: {active_segment.segment_type}")

    return journey.journey_id


# =============================================================================
# Example 2: Rich Context Initialization
# =============================================================================

def example_2_context_initialization():
    """Create a journey with rich initial context."""

    manager = JourneyStateManager()

    # Build rich initial context
    context = JourneyContext(
        location=LocationContext(
            latitude=40.7128,
            longitude=-74.0060,
            city="New York",
            country="USA"
        ),
        timezone="America/New_York",
        weather=WeatherContext(
            condition="sunny",
            temperature_celsius=22.5,
            humidity=65.0
        ),
        energy_level=EnergyLevel.FRESH,
        budget_comfort=BudgetComfort.COMFORTABLE
    )

    # Create journey with context
    journey = manager.initialize_journey(
        user_id="user456",
        conversation_id="conv789",
        initial_context=context
    )

    print(f"✅ Journey with context created")
    print(f"   Location: {journey.context.location.city}")
    print(f"   Weather: {journey.context.weather.condition} at {journey.context.weather.temperature_celsius}°C")
    print(f"   Energy: {journey.context.energy_level}")
    print(f"   Budget: {journey.context.budget_comfort}")

    return journey.journey_id


# =============================================================================
# Example 3: Segment Transitions
# =============================================================================

def example_3_segment_transitions():
    """Demonstrate segment transitions."""

    manager = JourneyStateManager()
    journey = manager.initialize_journey(user_id="user789")

    print(f"Starting segment: {journey.current_segment}")

    # Transition from Inspiration to Home→Airport
    success = manager.transition_segment(
        journey.journey_id,
        from_segment=JourneySegment.INSPIRATION,
        to_segment=JourneySegment.HOME_TO_AIRPORT
    )

    if success:
        updated = manager.get_journey(journey.journey_id)
        print(f"✅ Transitioned to: {updated.current_segment}")
        print(f"   Journey status: {updated.status}")

        # Check segment states
        inspiration = updated.get_segment(JourneySegment.INSPIRATION)
        home_to_airport = updated.get_segment(JourneySegment.HOME_TO_AIRPORT)

        print(f"   Inspiration status: {inspiration.status}")
        print(f"   Home→Airport status: {home_to_airport.status}")

    return journey.journey_id


# =============================================================================
# Example 4: Context Updates During Journey
# =============================================================================

def example_4_context_updates():
    """Update journey context as situation changes."""

    manager = JourneyStateManager()
    journey = manager.initialize_journey(user_id="user101")

    print("Initial context:")
    print(f"  Energy: {journey.context.energy_level}")
    print(f"  Timezone: {journey.context.timezone}")

    # Update context - user is getting tired
    manager.update_context(
        journey.journey_id,
        {
            "energy_level": EnergyLevel.TIRED,
            "timezone": "Europe/London"
        }
    )

    # Retrieve updated journey
    updated = manager.get_journey(journey.journey_id)
    print("\n✅ Context updated:")
    print(f"  Energy: {updated.context.energy_level}")
    print(f"  Timezone: {updated.context.timezone}")

    # Update with nested context objects
    manager.update_context(
        journey.journey_id,
        {
            "weather": WeatherContext(
                condition="rainy",
                temperature_celsius=15.0,
                humidity=85.0
            ),
            "flight_status": FlightStatusContext(
                flight_number="AA123",
                status="on_time",
                gate="B12"
            )
        }
    )

    updated = manager.get_journey(journey.journey_id)
    print("\n✅ Additional context added:")
    print(f"  Weather: {updated.context.weather.condition}")
    print(f"  Flight: {updated.context.flight_status.flight_number} at gate {updated.context.flight_status.gate}")

    return journey.journey_id


# =============================================================================
# Example 5: Risk Level Management
# =============================================================================

def example_5_risk_management():
    """Manage segment risk levels."""

    manager = JourneyStateManager()
    journey = manager.initialize_journey(user_id="user202")

    # Transition to Home→Airport segment
    manager.transition_segment(
        journey.journey_id,
        JourneySegment.INSPIRATION,
        JourneySegment.HOME_TO_AIRPORT
    )

    # Update segment with risk level
    segment = manager.update_segment_status(
        journey.journey_id,
        JourneySegment.HOME_TO_AIRPORT,
        SegmentStatus.ACTIVE,
        RiskLevel.WATCH  # Traffic is building up
    )

    print(f"✅ Segment risk updated")
    print(f"   Segment: {segment.segment_type}")
    print(f"   Status: {segment.status}")
    print(f"   Risk Level: {segment.risk_level}")

    # Escalate to ACTION_NEEDED
    segment = manager.update_segment_status(
        journey.journey_id,
        JourneySegment.HOME_TO_AIRPORT,
        SegmentStatus.ACTIVE,
        RiskLevel.ACTION_NEEDED  # Heavy traffic, need to leave now!
    )

    print(f"\n⚠️  Risk escalated to: {segment.risk_level}")

    return journey.journey_id


# =============================================================================
# Example 6: Milestone Tracking
# =============================================================================

def example_6_milestones():
    """Track milestones within segments."""

    manager = JourneyStateManager()
    journey = manager.initialize_journey(user_id="user303")

    # Get the inspiration segment
    inspiration = journey.get_segment(JourneySegment.INSPIRATION)

    # Add milestones
    m1 = inspiration.add_milestone(
        "Destination selected",
        "User has chosen their destination"
    )
    m2 = inspiration.add_milestone(
        "Flight booked",
        "Flight has been confirmed and booked"
    )
    m3 = inspiration.add_milestone(
        "Hotel booked",
        "Hotel accommodation confirmed"
    )

    print(f"✅ Added {len(inspiration.milestones)} milestones")

    # Complete milestones as journey progresses
    inspiration.complete_milestone(m1.id)
    print(f"   ✓ {m1.name}")

    inspiration.complete_milestone(m2.id)
    print(f"   ✓ {m2.name}")

    # Check progress
    completed_count = sum(1 for m in inspiration.milestones if m.completed)
    total_count = len(inspiration.milestones)
    print(f"\n   Progress: {completed_count}/{total_count} milestones completed")

    return journey.journey_id


# =============================================================================
# Example 7: Automatic State Machine
# =============================================================================

def example_7_state_machine():
    """Use the state machine for automatic transitions."""

    manager = JourneyStateManager()
    machine = SegmentStateMachine()

    journey = manager.initialize_journey(user_id="user404")

    print(f"Starting segment: {journey.current_segment}")

    # Check if transition is possible
    next_segment = machine.should_transition(journey)

    if next_segment:
        print(f"✅ Ready to transition to: {next_segment}")
    else:
        print("❌ Transition criteria not met")

        # What's the next segment in order?
        next_in_order = machine.get_next_segment(journey.current_segment)
        print(f"   Next segment in order: {next_in_order}")

        # Can it be activated?
        can_activate = machine.check_activation_criteria(journey, next_in_order)
        print(f"   Can activate: {can_activate}")

        # Is current complete?
        is_complete = machine.check_completion_criteria(journey, journey.current_segment)
        print(f"   Current segment complete: {is_complete}")

    return journey.journey_id


# =============================================================================
# Example 8: Custom Segment Criteria
# =============================================================================

def example_8_custom_criteria():
    """Define custom segment activation and completion criteria."""

    # Define custom condition functions
    def has_flight_booking(journey):
        """Check if journey has a flight booked."""
        return (journey.context.flight_status is not None and
                journey.context.flight_status.flight_number is not None)

    def is_departure_day(journey):
        """Check if it's departure day."""
        # This is a simplified check - real implementation would compare dates
        return journey.context.current_time is not None

    def user_is_ready(journey):
        """Check if user is ready to go."""
        return journey.context.energy_level == EnergyLevel.FRESH

    # Create custom criteria for Home→Airport segment
    custom_criteria = create_custom_criteria(
        segment_type=JourneySegment.HOME_TO_AIRPORT,
        activation_conditions=[
            has_flight_booking,
            is_departure_day,
        ],
        completion_conditions=[
            user_is_ready,  # Just an example
        ]
    )

    # Create state machine with custom criteria
    machine = SegmentStateMachine()
    machine.criteria[JourneySegment.HOME_TO_AIRPORT] = custom_criteria

    # Test the criteria
    manager = JourneyStateManager()
    journey = manager.initialize_journey(user_id="user505")

    # Add flight info to context
    manager.update_context(
        journey.journey_id,
        {
            "flight_status": FlightStatusContext(
                flight_number="UA456",
                status="scheduled"
            )
        }
    )

    journey = manager.get_journey(journey.journey_id)

    # Check if Home→Airport can be activated
    can_activate = machine.check_activation_criteria(
        journey,
        JourneySegment.HOME_TO_AIRPORT
    )

    print(f"✅ Custom criteria configured")
    print(f"   Flight booked: {has_flight_booking(journey)}")
    print(f"   Can activate Home→Airport: {can_activate}")

    return journey.journey_id


# =============================================================================
# Example 9: MongoDB Persistence
# =============================================================================

def example_9_mongodb_persistence():
    """Demonstrate MongoDB persistence and retrieval."""

    # Initialize with MongoDB repository
    repo = get_journey_repository()
    manager = JourneyStateManager(mongo_repo=repo)

    # Create journey - automatically persisted
    journey = manager.initialize_journey(
        user_id="user606",
        conversation_id="conv606"
    )

    journey_id = journey.journey_id
    print(f"✅ Journey created and persisted: {journey_id}")

    # Create a new manager instance (simulates new request)
    manager2 = JourneyStateManager(mongo_repo=repo)

    # Retrieve journey from MongoDB
    loaded_journey = manager2.get_journey(journey_id)

    if loaded_journey:
        print(f"✅ Journey loaded from MongoDB")
        print(f"   User: {loaded_journey.user_id}")
        print(f"   Segment: {loaded_journey.current_segment}")
        print(f"   Status: {loaded_journey.status}")

    # Get user's active journey
    active_journey = repo.get_journey_by_user("user606", active_only=True)
    if active_journey:
        print(f"\n✅ Active journey found for user")

    # List all user's journeys
    user_journeys = repo.list_journeys_for_user("user606", limit=10)
    print(f"\n✅ User has {len(user_journeys)} total journeys")

    return journey_id


# =============================================================================
# Example 10: Complete Journey Flow
# =============================================================================

def example_10_complete_flow():
    """Demonstrate a complete journey flow from start to finish."""

    repo = get_journey_repository()
    manager = JourneyStateManager(mongo_repo=repo)
    machine = SegmentStateMachine()

    print("=" * 60)
    print("COMPLETE JOURNEY FLOW EXAMPLE")
    print("=" * 60)

    # Step 1: Initialize journey
    print("\n1️⃣  Initialize Journey")
    journey = manager.initialize_journey(
        user_id="user707",
        conversation_id="conv707",
        initial_context=JourneyContext(
            location=LocationContext(city="New York"),
            energy_level=EnergyLevel.FRESH,
            budget_comfort=BudgetComfort.COMFORTABLE
        )
    )
    print(f"   ✅ Journey {journey.journey_id[:8]}... created")
    print(f"   Status: {journey.status}")
    print(f"   Segment: {journey.current_segment}")

    # Step 2: User books flight (Inspiration segment activity)
    print("\n2️⃣  Book Flight (Inspiration Segment)")
    manager.update_context(
        journey.journey_id,
        {
            "flight_status": FlightStatusContext(
                flight_number="DL789",
                status="confirmed",
                departure_time=None,  # Would be actual datetime
                gate="TBD"
            )
        }
    )
    print("   ✅ Flight booked")

    # Step 3: Transition to Home→Airport
    print("\n3️⃣  Transition to Home→Airport")
    success = manager.transition_segment(
        journey.journey_id,
        JourneySegment.INSPIRATION,
        JourneySegment.HOME_TO_AIRPORT
    )
    if success:
        print("   ✅ Transitioned to Home→Airport segment")

    # Step 4: Update risk level (traffic detected)
    print("\n4️⃣  Monitor Traffic")
    manager.update_segment_status(
        journey.journey_id,
        JourneySegment.HOME_TO_AIRPORT,
        SegmentStatus.ACTIVE,
        RiskLevel.WATCH
    )
    print("   ⚠️  Traffic building - risk level: WATCH")

    # Step 5: Update context (user location, weather)
    print("\n5️⃣  Update Context")
    manager.update_context(
        journey.journey_id,
        {
            "weather": WeatherContext(condition="clear", temperature_celsius=20.0),
            "energy_level": EnergyLevel.MODERATE
        }
    )
    print("   ✅ Context updated (weather, energy)")

    # Step 6: Continue journey (more transitions would happen here)
    print("\n6️⃣  Journey In Progress")
    journey = manager.get_journey(journey.journey_id)
    print(f"   Current: {journey.current_segment}")
    print(f"   Status: {journey.status}")

    active_seg = manager.get_active_segment(journey.journey_id)
    print(f"   Risk: {active_seg.risk_level}")

    # Step 7: Complete journey
    print("\n7️⃣  Complete Journey")
    manager.complete_journey(journey.journey_id)
    journey = manager.get_journey(journey.journey_id)
    print(f"   ✅ Journey complete!")
    print(f"   Final status: {journey.status}")

    print("\n" + "=" * 60)
    print("JOURNEY FLOW COMPLETE")
    print("=" * 60)

    return journey.journey_id


# =============================================================================
# Run Examples
# =============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("PHASE 1 FOUNDATION - USAGE EXAMPLES")
    print("=" * 70)

    # Run all examples
    examples = [
        ("Basic Journey Creation", example_1_basic_journey),
        ("Context Initialization", example_2_context_initialization),
        ("Segment Transitions", example_3_segment_transitions),
        ("Context Updates", example_4_context_updates),
        ("Risk Management", example_5_risk_management),
        ("Milestone Tracking", example_6_milestones),
        ("State Machine", example_7_state_machine),
        ("Custom Criteria", example_8_custom_criteria),
        # ("MongoDB Persistence", example_9_mongodb_persistence),  # Requires MongoDB
        # ("Complete Flow", example_10_complete_flow),  # Requires MongoDB
    ]

    for i, (name, func) in enumerate(examples, 1):
        print(f"\n{'=' * 70}")
        print(f"EXAMPLE {i}: {name}")
        print('=' * 70)
        try:
            journey_id = func()
            print(f"\n✅ Example completed - Journey ID: {journey_id[:8]}...")
        except Exception as e:
            print(f"\n❌ Example failed: {e}")

    print(f"\n{'=' * 70}")
    print("ALL EXAMPLES COMPLETED")
    print('=' * 70)
