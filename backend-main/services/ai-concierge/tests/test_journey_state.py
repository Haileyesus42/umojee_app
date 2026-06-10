import sys
import os

# allow importing from ai/ directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import datetime, timezone

from agent.journey.phase_1_foundation.journey_state import JourneyStateManager
from agent.journey.phase_1_foundation.journey_models import JourneySegment


@pytest.fixture
# synchronous fixture; JourneyStateManager initialization is not async

def setup_state_manager():
    from agent.journey.phase_1_foundation import JourneyStateManager
    return JourneyStateManager()


def test_transition_segment_creates_metadata_history(setup_state_manager):
    manager = setup_state_manager
    journey = manager.initialize_journey("user_x", "conv_y")
    # metadata should be auto-created even if not originally present
    assert hasattr(journey, "metadata")
    assert journey.metadata == {}


def test_transition_with_old_journey_without_metadata(setup_state_manager):
    """Simulate legacy journey instance missing metadata attribute."""
    manager = setup_state_manager
    journey = manager.initialize_journey("legacy", "conv_legacy")
    # remove metadata attribute to mimic old object
    delattr(journey, "metadata")
    # perform transition; should not raise
    success = manager.transition_segment(
        journey.journey_id,
        JourneySegment.INSPIRATION,
        JourneySegment.HOME_TO_AIRPORT,
    )
    assert success
    # after transition metadata should be re-added with history entry
    assert hasattr(journey, "metadata")
    assert journey.metadata.get("segment_history")

    # perform a transition
    success = manager.transition_segment(
        journey.journey_id,
        JourneySegment.INSPIRATION,
        JourneySegment.HOME_TO_AIRPORT,
    )
    assert success
    # metadata.history should now contain one entry
    history = journey.metadata.get("segment_history", [])
    assert len(history) == 1
    assert history[0]["segment"] == JourneySegment.HOME_TO_AIRPORT.value


def test_rollback_on_history(setup_state_manager):
    manager = setup_state_manager
    journey = manager.initialize_journey("user_a", "conv_b")
    # transition twice to have history length >=2
    manager.transition_segment(journey.journey_id, JourneySegment.INSPIRATION, JourneySegment.HOME_TO_AIRPORT)
    manager.transition_segment(journey.journey_id, JourneySegment.HOME_TO_AIRPORT, JourneySegment.AIRPORT_TO_FLIGHT)

    # now rollback
    rolled = manager.rollback_segment(journey.journey_id)
    assert rolled
    # current segment should revert
    assert journey.current_segment == JourneySegment.HOME_TO_AIRPORT
    history = journey.metadata.get("segment_history", [])
    assert history[-1]["action"] == "rollback"
