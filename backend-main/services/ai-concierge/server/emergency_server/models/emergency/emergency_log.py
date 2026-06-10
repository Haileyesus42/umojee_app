from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ...core.database.database import Base


class EmergencyLog(Base):
    __tablename__ = "emergency_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emergency_type = Column(String, nullable=False)  # Type of emergency (medical, security, etc.)
    description = Column(Text, nullable=True)  # Description of the emergency
    location = Column(String, nullable=True)  # Location where emergency occurred
    latitude = Column(String, nullable=True)  # GPS latitude
    longitude = Column(String, nullable=True)  # GPS longitude
    severity = Column(String, default="medium")  # Severity level (low, medium, high)
    status = Column(String, default="active")  # Status (active, resolved, escalated)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="emergency_logs")


# Add the relationship to User model (add this to the User model file if not already present)
# emergency_logs = relationship("EmergencyLog", back_populates="user", cascade="all, delete-orphan")