# backend/app/models/billing_cycle.py
import uuid
import enum
from datetime import datetime, date

from sqlalchemy import Column, Integer, Date, DateTime, Enum as SAEnum, ForeignKey, String, Numeric
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BillingCycleStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    PAYROLL_DEDUCTED = "payroll_deducted"
    EMPLOYER_PAID = "employer_paid"
    MERCHANTS_SETTLED = "merchants_settled"


class BillingCycle(Base):
    __tablename__ = "billing_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)

    cycle_number = Column(Integer, nullable=False)

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    payroll_deduction_date = Column(Date, nullable=False)
    employer_payment_due_date = Column(Date, nullable=False)
    merchant_settlement_due_date = Column(Date, nullable=False)

    status = Column(SAEnum(BillingCycleStatus), nullable=False, default=BillingCycleStatus.OPEN)

    # --- Employer-paid confirmation + shortfall tracking ---
    # employer_amount_expected is snapshotted the moment the cycle closes
    # (OPEN -> CLOSED) — a stable figure, since no new transactions can be
    # added to a closed cycle. employer_amount_received is entered by
    # platform staff when confirming payment, and may be LESS than
    # expected — that gap is a real shortfall, tracked as standing arrears
    # against the employer rather than assumed away.
    employer_amount_expected = Column(Numeric(10, 2), nullable=True)
    employer_amount_received = Column(Numeric(10, 2), nullable=True)
    employer_paid_at = Column(DateTime, nullable=True)
    employer_paid_reference = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
