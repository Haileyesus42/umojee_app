from typing import Any, Dict, List

import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from ..core.base_agent import BaseAgent
# Use relative imports for model files - these should be relative to the emergency_server models
# Since this is called from the agent, but needs to access server models, we need to use the right path
# For now, let's define the basic models directly to avoid circular imports

# Define basic models to avoid import issues
class EmergencyContact:
    def __init__(self, user_id=None, contact_name=None, phone=None, priority=None):
        self.user_id = user_id
        self.contact_name = contact_name
        self.phone = phone
        self.priority = priority

class EmergencyLog:
    def __init__(self, user_id=None, timestamp=None, emergency_type=None, details=None, status=None):
        self.id = None  # Will be set by DB
        self.user_id = user_id
        self.timestamp = timestamp
        self.emergency_type = emergency_type
        self.details = details
        self.status = status

logger = logging.getLogger(__name__)


class EmergencyProtocolAgent(BaseAgent):
    """Agent for emergency protocol handling"""
    
    def __init__(self):
        self.initialized = False

    def initialize(self, config: dict = None) -> bool:
        """Initialize emergency protocol agent"""
        try:
            # Initialize any required resources here
            self.initialized = True
            logger.info("EmergencyProtocolAgent initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize EmergencyProtocolAgent: {str(e)}")
            return False

    def health_check(self) -> dict:
        """Return health status of the agent"""
        return {
            "status": "healthy" if self.initialized else "unhealthy",
            "type": "emergency_protocol"
        }

    def trigger_emergency_protocol(self, db: Session, user_id: int, emergency_data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger emergency protocol for a user"""
        if not self.initialized:
            raise RuntimeError("Agent not initialized")
            
        try:
            # Since we can't easily import the models, we'll use SQLAlchemy queries directly
            # Get the EmergencyContact table dynamically
            from sqlalchemy import MetaData, Table, select
            from sqlalchemy.exc import NoSuchTableError
            
            # Query for emergency contacts
            try:
                result = db.execute(
                    text("SELECT id, user_id, contact_name, phone, priority FROM emergency_contacts WHERE user_id = :user_id ORDER BY priority"),
                    {"user_id": user_id}
                )
                contact_rows = result.fetchall()
                
                if not contact_rows:
                    return {
                        "status": "warning",
                        "message": f"No emergency contacts found for user {user_id}. Emergency protocol initiated without contacts.",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                
                # Process emergency notification to contacts
                notifications_sent = len(contact_rows)  # Simulate notification
                
                # Create emergency log entry using direct SQL
                db.execute(
                    text("INSERT INTO emergency_logs (user_id, timestamp, emergency_type, details, status) VALUES (:user_id, :timestamp, :emergency_type, :details, :status)"),
                    {
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "emergency_type": emergency_data.get('type', 'general'),
                        "details": json.dumps(emergency_data),
                        "status": 'triggered'
                    }
                )
                db.commit()
                
                return {
                    "status": "success",
                    "message": f"Emergency protocol triggered for user {user_id}",
                    "contacts_notified": notifications_sent,
                    "timestamp": datetime.utcnow().isoformat()
                }
            except Exception as e:
                logger.error(f"Database query error: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Error triggering emergency protocol: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def _notify_emergency_contacts(self, contacts, emergency_data) -> int:
        """Notify emergency contacts about the emergency"""
        # This would integrate with actual notification services like WhatsApp, SMS, etc.
        # For now, we'll simulate the notification process
        notifications_sent = 0
        
        for contact in contacts:
            try:
                # Simulate sending notification (would be actual implementation)
                logger.info(f"Notifying emergency contact: {getattr(contact, 'contact_name', 'Unknown')} ({getattr(contact, 'phone', 'Unknown')})")
                # In real implementation, this would call WhatsApp/SMS service
                notifications_sent += 1
            except Exception as e:
                logger.error(f"Failed to notify contact: {str(e)}")
        
        return notifications_sent