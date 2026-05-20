import sys
import os

# ensure ai package is discoverable when tests run from ai/ directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import datetime, timezone, timedelta

from agent.proactive_intelligence import ProactiveIntelligence, ProactiveSuggestion


class DummyTimeline:
    # no attributes defined by default
    pass


class DummyJourney:
    def __init__(self, journey_id, timeline=None, context=None):
        self.journey_id = journey_id
        self.timeline = timeline
        self.context = context or {}


def test_analyze_journey_missing_timeline_attrs():
    """Ensure analyze_journey doesn't crash when timeline lacks expected fields."""
    timeline = DummyTimeline()
    journey = DummyJourney("test123", timeline=timeline)
    intelligence = ProactiveIntelligence()

    # Should not raise even though timeline has no attributes like hotel_checkin
    suggestions = intelligence.analyze_journey(journey)
    assert isinstance(suggestions, list)
    # no suggestions likely since no times
    assert suggestions == []


def test_predictive_suggestion_with_partial_timeline():
    """Verify suggestions are generated when some timeline fields exist."""
    class PartialTimeline:
        def __init__(self, flight_departure):
            self.flight_departure = flight_departure

    # create timeline 2 hours from now to trigger restaurant suggestion
    future = datetime.now(timezone.utc) + timedelta(hours=2)
    timeline = PartialTimeline(future)
    journey = DummyJourney("j2", timeline=timeline, context={})
    intelligence = ProactiveIntelligence()
    suggestions = intelligence.analyze_journey(journey)
    # Expect at least one suggestion related to restaurant
    assert any("restaurant" in s.suggestion_id for s in suggestions)
