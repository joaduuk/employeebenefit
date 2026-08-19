# backend/app/models/employer.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SAEnum, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.approval import ApplicationStatus, ApprovalAuditMixin


class PayrollFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    FORTNIGHTLY = "fortnightly"
    MONTHLY = "monthly"


class Employer(Base, ApprovalAuditMixin):
    """
    One row per employer/company. This is where the billing-cycle engine
    config lives — payroll day, cutoff, and settlement delays are all
    per-employer rather than a single fixed monthly schedule, per the
    design discussion: "make the employer the billing cycle."

    Self-registers, then requires platform approval (same two-layer model
    as Merchant): `application_status` gates the account, `benefit_active`
    is the single capability flag — once approved, the platform can still
    pause the whole benefit for this employer (e.g. a billing dispute)
    without changing their application status back to anything.
    """
    __tablename__ = "employers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The employer's admin user who manages this account
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    company_name = Column(String, nullable=False)
    registration_number = Column(String, nullable=True)

    # --- Payroll schedule ---
    payroll_frequency = Column(SAEnum(PayrollFrequency), nullable=False, default=PayrollFrequency.MONTHLY)
    # For MONTHLY: day of month (1-31). For WEEKLY/FORTNIGHTLY: weekday (0=Mon..6=Sun).
    payroll_day = Column(Integer, nullable=False)

    # --- Cycle timing ---
    # "The spending cycle closes one business day before the employer's
    # payroll date" — this is the default; some employers may need more.
    cutoff_days_before_payroll = Column(Integer, nullable=False, default=1)
    # How many days after payroll the employer is expected to pay the platform
    collection_delay_days = Column(Integer, nullable=False, default=5)
    # How many days after the employer pays before merchants are settled
    merchant_settlement_delay_days = Column(Integer, nullable=False, default=10)
    # Extra buffer before anything is treated as overdue
    grace_period_days = Column(Integer, nullable=False, default=3)

    # --- Spending controls ---
    default_employee_monthly_limit = Column(Numeric(10, 2), nullable=False, default=300)
    # Comma-separated MerchantCategory values this employer allows/blocks —
    # kept simple as text for day 1; move to a proper join table if the
    # rule set grows more complex than an allow/block list.
    allowed_categories = Column(Text, nullable=True)
    blocked_categories = Column(Text, nullable=True)

    # --- Layer 1: application status (does this account exist in good standing) ---
    application_status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)

    # --- Layer 2: capability (can employees actually transact right now) ---
    benefit_active = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
