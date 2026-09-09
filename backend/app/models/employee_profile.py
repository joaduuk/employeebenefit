# backend/app/models/employee_profile.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Date, Boolean, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.approval import ApplicationStatus, ApprovalAuditMixin
from sqlalchemy import Enum as SAEnum


class EmployeeProfile(Base, ApprovalAuditMixin):
    """
    One row per employee-at-an-employer. Kept separate from User so a
    person could in theory belong to more than one employer over time
    (job changes) without losing their User/login identity.

    Self-registers (or is invited) against a specific employer, then
    requires employer/payroll approval — same two-layer model as Merchant
    and Employer.

    `application_status` gates whether the employee can use the benefit
    at all. Once APPROVED, the limit fields below ARE the capability
    layer.

    monthly_limit is now a SYSTEM-COMPUTED value (monthly_net_pay ×
    spending_limit_percentage / 100), not a figure the employer types
    directly — this closes a real fairness/governance gap where an
    employer admin could previously set any arbitrary cash amount with
    no relationship to what the employee actually earns. It also
    strengthens the product's regulatory position by tying the limit to
    verified pay rather than an arbitrary flat number (see
    eeb-regulatory-status.md, open question 5). The employer still
    chooses the percentage per employee (within a system-enforced 30%
    ceiling — see services/limits.py), preserving their legitimate
    discretion (e.g. a higher percentage for a senior employee) while
    removing the ability to set a disconnected, unverifiable figure.
    """
    __tablename__ = "employee_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)

    # --- Fields the employer uses to verify this is really their employee ---
    work_email = Column(String, nullable=False)
    employee_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    job_title = Column(String, nullable=True)

    # --- Layer 1: application status (is this person approved to use the benefit) ---
    application_status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)

    left_employer_at = Column(DateTime, nullable=True)

    # --- Layer 2: capability, expressed as limits rather than on/off ---
    # monthly_net_pay and spending_limit_percentage are the inputs the
    # employer actually provides; monthly_limit is computed from them
    # (see services.limits.compute_spending_limit) and stored here as the
    # value everything else in the system reads — no other code needed to
    # change to support this, since monthly_limit's meaning to the rest of
    # the app is unchanged, only how it gets set has changed.
    monthly_net_pay = Column(Numeric(10, 2), nullable=True)
    spending_limit_percentage = Column(Numeric(5, 2), nullable=True)
    monthly_limit = Column(Numeric(10, 2), nullable=True)

    max_transaction_amount = Column(Numeric(10, 2), nullable=True)
    daily_limit = Column(Numeric(10, 2), nullable=True)
    weekly_limit = Column(Numeric(10, 2), nullable=True)
    eligible_categories_override = Column(Text, nullable=True)

    benefit_start_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
