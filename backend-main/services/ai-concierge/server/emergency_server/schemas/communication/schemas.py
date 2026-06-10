from pydantic import BaseModel
from typing import List
from typing import Optional


class EmergencyContactBase(BaseModel):
    contact_name: str
    phone: str
    whatsapp: str
    contact_relationship: Optional[str] = None
    priority: int


class EmergencyContactResponse(EmergencyContactBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class EmergencyContactItem(BaseModel):
    contact_name: str
    phone: str
    whatsapp: str
    contact_relationship: Optional[str] = None
    priority: int


class EmergencyContactUpdate(BaseModel):
    contacts: List[EmergencyContactItem]