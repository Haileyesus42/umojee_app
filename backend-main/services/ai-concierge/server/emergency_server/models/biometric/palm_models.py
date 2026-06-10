from pydantic import BaseModel
from typing import Optional
from pydantic import ConfigDict


class PalmEnrollmentResult(BaseModel):
    """Response model for palm enrollment results"""
    success: bool
    message: str
    palm_id: Optional[int] = None
    confidence: Optional[float] = None


class PalmVerificationResult(BaseModel):
    """Response model for palm verification results"""
    verified: bool
    confidence: float
    message: str
    user_id: Optional[int] = None


class PalmStatusResult(BaseModel):
    """Response model for palm recognition status"""
    status: str
    model_loaded: bool = False
    service_type: str = "palm_recognition"
    
    model_config = ConfigDict(protected_namespaces=())

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship, declarative_base, Session
from sqlalchemy.sql import func
from services.ai_concierge.servers.core.database.database import Base

# Base class for palm recognition models
PalmBase = declarative_base()

class PalmTemplate(PalmBase):
    __tablename__ = "palm_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_data = Column(String, nullable=False)  # Will store base64 encoded template
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationship with User
    user = relationship("User", back_populates="palm_templates")