# backend/app/models/user.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class UserRole(str, enum.Enum):
    """
    The 4 modules of the platform map onto 5 roles — Platform splits into
    two tiers so day-to-day admin work doesn't require full super-admin
    access.
    """
    PLATFORM_SUPER_ADMIN = "platform_super_admin"  # The Platform — full control (billing config, staff mgmt, everything)
    PLATFORM_ADMIN = "platform_admin"               # The Platform — day-to-day ops (approvals, support, monitoring)
    EMPLOYER = "employer"                            # The Company
    MERCHANT = "merchant"                             # The Merchant
    EMPLOYEE = "employee"                              # The Employee


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)

    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.EMPLOYEE)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_valid = Column(Boolean, default=True)

    # Optional profile photo — stored as just the filename (not a full path
    # or URL), so the static-file mount location can change without a
    # migration. NULL means no photo uploaded. Used across all roles, but
    # only ever displayed back to a merchant for an EMPLOYEE, as a visual
    # anti-fraud check ("does this match the person in front of me").
    profile_photo_filename = Column(String, nullable=True)

    # Verification (email confirm)
    verification_token = Column(String, nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)
    verification_sent_at = Column(DateTime, nullable=True)

    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
