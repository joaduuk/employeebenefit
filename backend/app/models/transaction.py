# backend/app/models/transaction.py
import uuid
import enum
import secrets
import string
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Numeric, Float, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class TransactionMethod(str, enum.Enum):
    QR = "qr"
    MANUAL_CODE = "manual_code"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    EXPIRED = "expired"


class TransactionPurchaseTag(str, enum.Enum):
    FOOD_DRINKS = "food_drinks"
    DAILY_ESSENTIALS = "daily_essentials"
    MIXED = "mixed"


def generate_transaction_code(length: int = 5) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employee_profiles.id"), nullable=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)
    billing_cycle_id = Column(UUID(as_uuid=True), ForeignKey("billing_cycles.id"), nullable=True)

    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(SAEnum(TransactionMethod), nullable=False)
    status = Column(SAEnum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)

    transaction_code = Column(String(8), nullable=False, default=generate_transaction_code)
    purchase_tag = Column(SAEnum(TransactionPurchaseTag), nullable=True)
    qr_payload = Column(Text, nullable=True)

    merchant_latitude = Column(Float, nullable=True)
    merchant_longitude = Column(Float, nullable=True)
    employee_latitude = Column(Float, nullable=True)
    employee_longitude = Column(Float, nullable=True)
    # Great-circle distance between merchant and employee at the moment of
    # approval, in metres — computed once and stored, not enforced against
    # anything. Purely evidentiary: if an employee later disputes a
    # purchase ("I was never there"), this is the objective data point an
    # admin checks, rather than a real-time block/flag that risks
    # penalising ordinary GPS drift (very common indoors, e.g. inside a
    # supermarket or pharmacy).
    location_distance_meters = Column(Float, nullable=True)

    # --- Dispute tracking ---
    # Deliberately pure status/audit-trail only — resolving a dispute has
    # NO automatic effect on any balance, cycle total, or settlement
    # figure anywhere in the system. Any actual financial correction
    # (excluding an amount from a deduction file, refunding a merchant)
    # is a manual action the admin takes themselves, outside this record;
    # resolution_note exists so that manual action is at least written
    # down for the audit trail, not to trigger anything automatically.
    is_disputed = Column(Boolean, nullable=False, default=False)
    dispute_reason = Column(Text, nullable=True)
    disputed_at = Column(DateTime, nullable=True)
    dispute_resolved_at = Column(DateTime, nullable=True)  # NULL = still open
    dispute_outcome = Column(String, nullable=True)  # "upheld" or "rejected"
    resolution_note = Column(Text, nullable=True)  # what manual action was taken, if any

    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
