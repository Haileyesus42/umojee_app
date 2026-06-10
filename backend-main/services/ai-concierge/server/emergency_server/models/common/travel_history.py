from sqlalchemy import Column, Integer, String, DateTime, Text
from ...core.database.database import Base  # Direct import from new location
from datetime import datetime

class TravelHistory(Base):
    __tablename__ = "travel_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    date = Column(String)
    time = Column(String)
    location = Column(String)
    city = Column(String)
    country = Column(String)
    activity = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)