# backend/app/schemas/profile.py
from pydantic import BaseModel
from typing import Optional


class ProfileView(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None
