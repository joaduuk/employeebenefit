# backend/app/schemas/user.py
from pydantic import BaseModel, UUID4, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    PLATFORM_SUPER_ADMIN = "platform_super_admin"
    PLATFORM_ADMIN = "platform_admin"
    EMPLOYER = "employer"
    MERCHANT = "merchant"
    EMPLOYEE = "employee"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.EMPLOYEE


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: UUID4
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID4
    email: str
    full_name: str
    role: UserRole

    class Config:
        from_attributes = True


# Learned from RoscaApp: this must be a POST body, never a query string —
# a plaintext password in a URL ends up in logs/browser history.
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
