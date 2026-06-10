from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from .base import Base
from datetime import datetime


class PalmTemplate(Base):
    __tablename__ = 'palm_templates'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    features = Column(String, nullable=False)
    template_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    quality_score = Column(Float)
    
    # Removed user relationship since it's not needed for querying
    # user = relationship("User", back_populates="palm_templates")
    
    def __repr__(self):
        return f"<PalmTemplate(id={self.id}, user_id={self.user_id})>"