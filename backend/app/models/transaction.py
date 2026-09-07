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

    # --- Dispute tracking, added for accounting/audit reporting ---
    # Platform-admin-marked for now (no self-service dispute submission
    # yet) — a simple flag + reason, not a full dispute workflow.
    is_disputed = Column(Boolean, nullable=False, default=False)
    dispute_reason = Column(Text, nullable=True)
    disputed_at = Column(DateTime, nullable=True)
    dispute_resolved_at = Column(DateTime, nullable=True)  # NULL = still open

    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
