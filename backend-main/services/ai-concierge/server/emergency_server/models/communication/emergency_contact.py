from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ...core.database.database import Base

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    priority = Column(Integer, nullable=False)  # Priority level (1, 2, 3, etc.)
    contact_name = Column(String(255), nullable=False)  # Changed from name to contact_name
    contact_relationship = Column(String(255), name='relationship')  # Map model field contact_relationship to DB column relationship
    phone = Column(String(50))  # Phone number
    whatsapp = Column(String(50))  # Changed from email to whatsapp
    
    # Define the relationship with the User model (without back_populates to avoid circular reference)
    user = relationship("User")