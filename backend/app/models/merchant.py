# backend/app/models/merchant.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class MerchantCategory(str, enum.Enum):
    """
    Matches the employer category-restriction idea from the design notes:
    allow essentials, block alcohol/tobacco/gambling/gift cards.
    """
    SUPERMARKET = "supermarket"
    CONVENIENCE_STORE = "convenience_store"
    PHARMACY = "pharmacy"
    BABY_SUPPLIES = "baby_supplies"
    OTHER = "other"


class MerchantStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SUSPENDED = "suspended"


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The merchant user who logs in and runs the merchant app
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    business_name = Column(String, nullable=False)
    category = Column(SAEnum(MerchantCategory), nullable=False, default=MerchantCategory.OTHER)

    # Store location — used to check the employee's location against the
    # merchant's when approving a QR transaction.
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status = Column(SAEnum(MerchantStatus), nullable=False, default=MerchantStatus.PENDING_APPROVAL)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
