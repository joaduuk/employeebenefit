# backend/app/models/transaction.py
import uuid
import enum
import secrets
import string
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Numeric, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class TransactionMethod(str, enum.Enum):
    QR = "qr"                 # dynamic QR scanned by employee
    MANUAL_CODE = "manual_code"  # merchant displays a code, employee types it in


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"       # code/QR generated, awaiting employee approval
    APPROVED = "approved"
    DECLINED = "declined"     # employee explicitly rejected
    EXPIRED = "expired"       # not approved within the QR/code TTL


def generate_transaction_code(length: int = 5) -> str:
    """5-digit random alphanumeric code, per the day-1 design notes."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employee_profiles.id"), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)

    # Assigned once the transaction is approved and falls into a cycle
    # (nullable because it isn't known at creation time — assigned at
    # approval based on which employer cycle is currently OPEN).
    billing_cycle_id = Column(UUID(as_uuid=True), ForeignKey("billing_cycles.id"), nullable=True)

    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(SAEnum(TransactionMethod), nullable=False)
    status = Column(SAEnum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)

    # 5-digit alphanumeric code — used directly for MANUAL_CODE, and also
    # embedded in the QR payload as an extra check for the QR flow.
    transaction_code = Column(String(8), nullable=False, default=generate_transaction_code)

    # Raw QR payload (merchant ID, GPS, amount, timestamp, code) as JSON text,
    # kept for audit/debugging — nullable for MANUAL_CODE transactions.
    qr_payload = Column(Text, nullable=True)

    # Location captured at approval time, for the employee-location-must-
    # match-merchant-location check described in the design notes.
    merchant_latitude = Column(Float, nullable=True)
    merchant_longitude = Column(Float, nullable=True)
    employee_latitude = Column(Float, nullable=True)
    employee_longitude = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)   # when merchant generated the code/QR
    approved_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)             # created_at + DYNAMIC_QR_TTL_SECONDS
