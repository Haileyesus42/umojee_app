from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship
from .base import Base


class UserModel(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    
    # Removed palm_templates relationship since it's not needed for querying
    # palm_templates = relationship("PalmTemplate", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"