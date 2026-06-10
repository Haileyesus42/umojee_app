from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ...core.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    current_city = Column(String, nullable=True)
    current_country = Column(String, nullable=True)
    hotel_name = Column(String, nullable=True)
    current_location = Column(String, nullable=True)
    gps_latitude = Column(String, nullable=True)
    gps_longitude = Column(String, nullable=True)

    # Relationships
    # palm_templates = relationship("PalmTemplate", back_populates="user")