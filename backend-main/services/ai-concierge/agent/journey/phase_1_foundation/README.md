# Phase 1: Foundation - Journey State Management

> Complete journey-based state management system for the Nexus Flow orchestrator

## Overview

Phase 1 provides the foundational architecture for journey-based travel orchestration. It implements:

- **Journey Data Models**: Complete MongoDB schemas for journey, segments, context, and timeline
- **State Management**: Full lifecycle management with caching and persistence
- **State Machines**: Automatic segment transitions based on criteria
- **MongoDB Integration**: Complete CRUD operations with optimized indexes

## Quick Start

```python
from agent.journey.phase_1_foundation import (
    JourneyStateManager,
    get_journey_repository,
    JourneyContext,
    EnergyLevel
)

# Initialize manager with MongoDB
manager = JourneyStateManager(mongo_repo=get_journey_repository())

# Create a journey
journey = manager.initialize_journey(user_id="user123")

# Update context
manager.update_context(journey.journey_id, {
    "energy_level": EnergyLevel.MODERATE,
    "timezone": "America/New_York"
})

# Transition to next segment
manager.transition_segment(
    journey.journey_id,
    from_segment=JourneySegment.INSPIRATION,
    to_segment=JourneySegment.HOME_TO_AIRPORT
)
```

## Module Structure

```
phase_1_foundation/
├── journey_models.py      # Data models and schemas
├── journey_state.py       # State management layer
├── segments.py            # State machine logic
├── mongo_adapter.py       # MongoDB integration
├── test_phase_1.py        # Test suite (26 tests)
├── USAGE_EXAMPLES.py      # Practical examples (10 examples)
└── README.md              # This file
```

## Components

### Journey Models ([journey_models.py](journey_models.py))

Complete data models for journey management:

- **Journey**: Main journey document with full state
- **SegmentState**: Individual segment tracking
- **JourneyContext**: Multi-factor context (location, weather, traffic, flight, energy, budget)
- **JourneyTimeline**: Calculated timeline with events
- **Supporting Models**: LocationContext, WeatherContext, FlightStatusContext, Milestone, etc.

### State Manager ([journey_state.py](journey_state.py))

Full lifecycle management:

- `initialize_journey()` - Create new journey
- `get_journey()` - Retrieve with caching
- `transition_segment()` - Handle segment transitions
- `update_context()` - Update journey context
- `update_segment_status()` - Update segment state
- `complete_journey()` / `cancel_journey()` - Lifecycle completion

### State Machine ([segments.py](segments.py))

Automatic transition logic:

- `SegmentStateMachine` - Manages transitions based on criteria
- `SegmentCriteria` - Activation and completion conditions
- `should_transition()` - Check if ready to transition
- `transition_to_next()` - Automatic transition
- Custom criteria support

### MongoDB Adapter ([mongo_adapter.py](mongo_adapter.py))

Bridge to MongoDB operations:

- `MongoJourneyRepository` - Complete CRUD operations
- `get_journey_repository()` - Get singleton instance
- 11 journey-specific operations
- Optimized queries with indexes

## Testing

Run the test suite:

```bash
# All tests
pytest agent/journey/phase_1_foundation/test_phase_1.py -v

# Specific test class
pytest agent/journey/phase_1_foundation/test_phase_1.py::TestJourneyStateManager -v

# With coverage
pytest agent/journey/phase_1_foundation/test_phase_1.py --cov=agent/journey/phase_1_foundation
```

**Test Results**: ✅ 26/26 passing (100%)

## Examples

Run practical examples:

```bash
python agent/journey/phase_1_foundation/USAGE_EXAMPLES.py
```

Available examples:
1. Basic Journey Creation
2. Context Initialization
3. Segment Transitions
4. Context Updates
5. Risk Management
6. Milestone Tracking
7. State Machine
8. Custom Criteria
9. MongoDB Persistence
10. Complete Journey Flow

## API Reference

### JourneyStateManager

#### Core Methods

```python
# Create journey
journey = manager.initialize_journey(
    user_id="user123",
    conversation_id="conv456",
    initial_context=JourneyContext(...)
)

# Retrieve journey
journey = manager.get_journey(journey_id)

# Transition segment
success = manager.transition_segment(
    journey_id,
    from_segment=JourneySegment.INSPIRATION,
    to_segment=JourneySegment.HOME_TO_AIRPORT
)

# Update context
context = manager.update_context(
    journey_id,
    {"energy_level": EnergyLevel.TIRED}
)

# Update segment
segment = manager.update_segment_status(
    journey_id,
    JourneySegment.HOME_TO_AIRPORT,
    SegmentStatus.ACTIVE,
    RiskLevel.WATCH
)

# Complete journey
success = manager.complete_journey(journey_id)
```

### SegmentStateMachine

```python
machine = SegmentStateMachine()

# Check if should transition
next_segment = machine.should_transition(journey)

# Automatic transition
new_segment = machine.transition_to_next(journey)

# Check criteria
can_activate = machine.check_activation_criteria(journey, segment_type)
is_complete = machine.check_completion_criteria(journey, segment_type)
```

### MongoDB Operations

```python
repo = get_journey_repository()

# Create
doc = repo.create_journey(journey.to_mongo_dict())

# Read
doc = repo.get_journey(journey_id)
doc = repo.get_journey_by_user(user_id, active_only=True)
docs = repo.list_journeys_for_user(user_id, limit=10)

# Update
doc = repo.update_journey(journey_id, updates)
doc = repo.update_journey_segment(journey_id, segment_type, updates)
doc = repo.update_journey_context(journey_id, context_updates)

# Complete/Cancel
doc = repo.complete_journey(journey_id)
doc = repo.cancel_journey(journey_id)
```

## Journey Segments

The system manages 6 journey segments:

1. **INSPIRATION** - Trip planning and intent discovery
2. **HOME_TO_AIRPORT** - Departure from home to airport
3. **AIRPORT_TO_FLIGHT** - Airport navigation to boarding
4. **FLIGHT_TO_HOTEL** - Post-landing to hotel arrival
5. **HOTEL_TO_ACTIVITIES** - Stay and activities
6. **RETURN** - Return journey home

Each segment has:
- Status (PENDING → ACTIVE → COMPLETED)
- Risk level (ON_TRACK / WATCH / ACTION_NEEDED)
- Milestones for tracking progress
- Activation and completion criteria

## Context Tracking

Multi-factor context includes:

- **Location**: GPS coordinates, city, country
- **Weather**: Conditions, temperature, forecast
- **Traffic**: Current conditions, ETA impact
- **Flight**: Flight number, status, gate, times
- **Time**: Current time, timezone
- **Energy**: User's energy level (FRESH / MODERATE / TIRED)
- **Budget**: Budget comfort (COMFORTABLE / STRETCH / PREMIUM)

## Integration

### With Existing System

Phase 1 is completely backward compatible:
- ✅ No changes to existing workflows
- ✅ No changes to current API endpoints
- ✅ Message-based state still available
- ✅ Fully additive implementation

### With Future Phases

Phase 1 provides foundation for:
- **Phase 2**: Context monitoring will use `JourneyContext`
- **Phase 3**: Segment orchestrators will use state machine
- **Phase 4**: Risk engine will update `risk_level`
- **Phase 5**: Timeline calculator will populate `JourneyTimeline`
- **Phase 6**: Journey orchestrator will use `JourneyStateManager`

## Performance

- **Caching**: In-memory cache for active journeys
- **Indexes**: Optimized MongoDB queries
- **Persistence**: Automatic background persistence
- **Scalability**: Multiple concurrent journeys supported

## Documentation

- **[PHASE_1_COMPLETE.md](../../../../PHASE_1_COMPLETE.md)**: Complete implementation guide
- **[PHASE_1_COMPLETION_SUMMARY.md](../../../../PHASE_1_COMPLETION_SUMMARY.md)**: Executive summary
- **[PHASE_1_VISUAL_SUMMARY.md](../../../../PHASE_1_VISUAL_SUMMARY.md)**: Visual overview
- **[USAGE_EXAMPLES.py](USAGE_EXAMPLES.py)**: Runnable code examples
- **[test_phase_1.py](test_phase_1.py)**: Comprehensive test suite

## Status

**Phase 1**: ✅ **COMPLETE** and **PRODUCTION READY**

- ✅ All components implemented
- ✅ All tests passing (26/26)
- ✅ Complete documentation
- ✅ MongoDB integration working
- ✅ Usage examples verified
- ✅ Ready for Phase 2

## Next Steps

Phase 2 will implement:
- Context monitoring engine
- Background task management
- Real-time updates via WebSocket
- Continuous location/weather/traffic/flight monitoring

## Support

For questions or issues:
1. See [PHASE_1_COMPLETE.md](../../../../PHASE_1_COMPLETE.md) for detailed documentation
2. Check [USAGE_EXAMPLES.py](USAGE_EXAMPLES.py) for practical examples
3. Review [test_phase_1.py](test_phase_1.py) for usage patterns

---

**Status**: ✅ Production Ready | **Tests**: 26/26 Passing | **Phase**: 1 of 7 Complete
