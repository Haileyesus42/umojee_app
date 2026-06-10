from typing import List
from sqlalchemy.orm import Session
from ..core.base_agent import BaseAgent
from ...models.communication.emergency_contact import EmergencyContact
import logging

logger = logging.getLogger(__name__)


class ContactServiceAgent(BaseAgent):
    """Agent for managing emergency contacts"""
    
    def __init__(self):
        self.initialized = False

    def initialize(self, config: dict = None) -> bool:
        """Initialize contact service agent"""
        try:
            self.initialized = True
            logger.info("ContactServiceAgent initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize ContactServiceAgent: {str(e)}")
            return False

    def health_check(self) -> dict:
        """Return health status of the agent"""
        return {
            "status": "healthy" if self.initialized else "unhealthy",
            "type": "contact_service"
        }

    def get_emergency_contacts(self, db: Session, user_id: int) -> list:
        """Get emergency contacts for a user"""
        if not self.initialized:
            raise RuntimeError("Agent not initialized")
            
        return db.query(EmergencyContact).filter(
            EmergencyContact.user_id == user_id
        ).order_by(EmergencyContact.priority).all()

    def create_mock_emergency_contacts(self, db: Session) -> bool:
        """Create mock emergency contacts if they don't exist"""
        if not self.initialized:
            raise RuntimeError("Agent not initialized")
            
        # Check if contacts already exist
        if db.query(EmergencyContact).count() > 0:
            return True
        
        # Contacts for User 1 (haile)
        contact1_1 = EmergencyContact(
            user_id=1,
            priority=1,
            contact_name="Maria Selassie",
            contact_relationship="Wife",
            phone="+251949867668",
            whatsapp="+251949867668"
        )
        
        contact1_2 = EmergencyContact(
            user_id=1,
            priority=2,
            contact_name="David Selassie",
            contact_relationship="Brother",
            phone="+251911234569",
            whatsapp="+251911234569"
        )
        
        # Contacts for User 2 (traveler1)
        contact2_1 = EmergencyContact(
            user_id=2,
            priority=1,
            contact_name="Sarah Traveler",
            contact_relationship="Mother",
            phone="+12125551235",
            whatsapp="+12125551235"
        )
        
        contact2_2 = EmergencyContact(
            user_id=2,
            priority=2,
            contact_name="Mike Traveler",
            contact_relationship="Father",
            phone="+12125551236",
            whatsapp="+12125551236"
        )
        
        try:
            db.add(contact1_1)
            db.add(contact1_2)
            db.add(contact2_1)
            db.add(contact2_2)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create mock emergency contacts: {str(e)}")
            return False