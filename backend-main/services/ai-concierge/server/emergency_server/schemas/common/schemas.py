from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime  # Added this import for token expiration

# Token schemas (needed for authentication)
class Token(BaseModel):
    """Schema for authentication tokens"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Schema for token data"""
    username: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    current_city: Optional[str] = None
    current_country: Optional[str] = None
    hotel_name: Optional[str] = None
    current_location: Optional[str] = None
    gps_latitude: Optional[str] = None
    gps_longitude: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class PalmAuthRequest(BaseModel):
    """Request model for palm-based authentication"""
    palm_image: str  # Base64 encoded palm image

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    current_city: Optional[str] = None
    current_country: Optional[str] = None
    hotel_name: Optional[str] = None
    current_location: Optional[str] = None
    gps_latitude: Optional[str] = None
    gps_longitude: Optional[str] = None

# Emergency Contact schemas
class EmergencyContactBase(BaseModel):
    priority: int
    contact_name: str
    contact_relationship: Optional[str] = None  # Use contact_relationship to match the model
    phone: Optional[str] = None
    whatsapp: Optional[str] = None

    class Config:
        from_attributes = True

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class EmergencyContactUpdate(BaseModel):
    contacts: List[EmergencyContactBase]

# Emergency Log schemas