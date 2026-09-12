# backend/app/models/merchant.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.approval import ApplicationStatus, ApprovalAuditMixin


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


class Merchant(Base, ApprovalAuditMixin):
    """
    Self-registration + admin approval, per the onboarding discussion.
    `application_status` gates whether the merchant account exists in good
    standing at all; `payments_enabled` / `payouts_enabled` are separate,
    independently-toggled capability flags — e.g. a merchant can be
    APPROVED as a business while payouts stay off until their bank
    account is verified.
    """
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The merchant user who logs in and runs the merchant app
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    # --- Business details captured at registration ---
    business_name = Column(String, nullable=False)
    owner_name = Column(String, nullable=True)
    business_address = Column(String, nullable=True)
    postcode = Column(String, nullable=True, index=True)
    category = Column(SAEnum(MerchantCategory), nullable=False, default=MerchantCategory.OTHER)
    registration_number = Column(String, nullable=True)  # company reg number, if applicable

    # Bank/payout details — day-1 keeps this minimal (account name/number/
    # sort code as plain text); swap for a tokenised provider reference
    # once real payout rails are wired up, rather than storing raw bank
    # details longer-term.
    payout_account_name = Column(String, nullable=True)
    payout_account_number = Column(String, nullable=True)
    payout_sort_code = Column(String, nullable=True)

    # Store location — used to check the employee's location against the
    # merchant's when approving a QR transaction, and to power the
    # merchant search + map features. Populated automatically from
    # `postcode` via services/geocoding.py at approval time (or manually
    # via PUT /admin/merchants/{id}/geocode if the postcode is corrected
    # later).
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # --- Layer 1: application status (does this account exist in good standing) ---
    application_status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)

    # --- Layer 2: capability (what it can actually do right now) ---
    payments_enabled = Column(Boolean, nullable=False, default=False)
    payouts_enabled = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
