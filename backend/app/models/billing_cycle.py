# backend/app/models/billing_cycle.py
import uuid
import enum
from datetime import datetime, date

from sqlalchemy import Column, Integer, Date, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BillingCycleStatus(str, enum.Enum):
    OPEN = "open"                    # employees can spend against this cycle
    CLOSED = "closed"                # cutoff passed, no new transactions assigned
    PAYROLL_DEDUCTED = "payroll_deducted"
    EMPLOYER_PAID = "employer_paid"
    MERCHANTS_SETTLED = "merchants_settled"


class BillingCycle(Base):
    """
    One row per employer per pay period. This is the "billing cycle, not
    calendar month" concept from the design notes — every transaction gets
    tagged with the cycle it falls into, and the whole settlement engine
    keys off this table rather than hardcoded dates.

    Example (employer paid on the 25th, 1-day cutoff):
      period_start = 26 July, period_end = 24 August (cutoff)
      payroll_deduction_date = 25 August
      employer_payment_due_date = payroll_deduction_date + collection_delay_days
      merchant_settlement_due_date = employer_payment_due_date + merchant_settlement_delay_days
    """
    __tablename__ = "billing_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)

    cycle_number = Column(Integer, nullable=False)  # sequential per employer, like a statement number

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)  # this IS the cutoff date — purchases up to & including this date

    payroll_deduction_date = Column(Date, nullable=False)
    employer_payment_due_date = Column(Date, nullable=False)
    merchant_settlement_due_date = Column(Date, nullable=False)

    status = Column(SAEnum(BillingCycleStatus), nullable=False, default=BillingCycleStatus.OPEN)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
