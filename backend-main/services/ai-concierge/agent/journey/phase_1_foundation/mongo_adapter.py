"""
MongoDB Adapter for Journey State Management

This adapter provides a bridge between the JourneyStateManager and the
MongoDB repository functions in server/mongo_repo.py.
"""

from typing import Optional, List
import sys
from pathlib import Path

# Add server directory to path to import mongo_repo
server_path = Path(__file__).parent.parent.parent.parent / "server"
sys.path.insert(0, str(server_path))

try:
    from server import mongo_repo
except ImportError:
    # Fallback for different import scenarios
    import mongo_repo


class MongoJourneyRepository:
    """
    MongoDB repository adapter for Journey operations.

    This class wraps the functional MongoDB operations from server/mongo_repo.py
    to provide a clean interface for the JourneyStateManager.
    """

    def create_journey(self, journey_doc: dict) -> dict:
        """Create a new journey in MongoDB."""
        return mongo_repo.create_journey(journey_doc)

    def get_journey(self, journey_id: str) -> Optional[dict]:
        """Retrieve a journey by ID."""
        return mongo_repo.get_journey(journey_id)

    def get_journey_by_user(self, user_id: str, active_only: bool = True) -> Optional[dict]:
        """Get the most recent journey for a user."""
        return mongo_repo.get_journey_by_user(user_id, active_only)

    def list_journeys_for_user(self, user_id: str, limit: int = 10) -> List[dict]:
        """List all journeys for a user."""
        return mongo_repo.list_journeys_for_user(user_id, limit)

    def update_journey(self, journey_id: str, updates: dict) -> Optional[dict]:
        """Update a journey document."""
        return mongo_repo.update_journey(journey_id, updates)

    def update_journey_segment(
        self, journey_id: str, segment_type: str, segment_updates: dict
    ) -> Optional[dict]:
        """Update a specific segment within a journey."""
        return mongo_repo.update_journey_segment(journey_id, segment_type, segment_updates)

    def update_journey_context(
        self, journey_id: str, context_updates: dict
    ) -> Optional[dict]:
        """Update the journey context."""
        return mongo_repo.update_journey_context(journey_id, context_updates)

    def complete_journey(self, journey_id: str) -> Optional[dict]:
        """Mark a journey as completed."""
        return mongo_repo.complete_journey(journey_id)

    def cancel_journey(self, journey_id: str) -> Optional[dict]:
        """Mark a journey as cancelled."""
        return mongo_repo.cancel_journey(journey_id)

    def archive_journey(self, journey_id: str) -> bool:
        """Archive a journey."""
        return mongo_repo.archive_journey(journey_id)

    def delete_journey(self, journey_id: str) -> bool:
        """Permanently delete a journey."""
        return mongo_repo.delete_journey(journey_id)

    def set_active_journey(self, journey_id: str, user_id: str) -> Optional[dict]:
        """Mark a journey as the user's active journey."""
        return mongo_repo.set_active_journey(journey_id, user_id)

    @staticmethod
    def ensure_indexes() -> None:
        """Ensure all required indexes exist."""
        mongo_repo.ensure_indexes()


# Singleton instance
_default_repo: Optional[MongoJourneyRepository] = None


def get_journey_repository() -> MongoJourneyRepository:
    """
    Get the default MongoDB journey repository instance.

    Returns:
        MongoJourneyRepository instance
    """
    global _default_repo
    if _default_repo is None:
        _default_repo = MongoJourneyRepository()
    return _default_repo
