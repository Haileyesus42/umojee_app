from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from server.emergency_server.core.database.database import Base

class PalmTemplate(Base):
    __tablename__ = 'palm_templates'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    template_data = Column(String, nullable=False)
    template_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    quality_score = Column(Float)
    
    def __repr__(self):
        return f"<PalmTemplate(id={self.id}, user_id={self.user_id})>"