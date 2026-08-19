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
    and Employer. Per the onboarding discussion, the employee doesn't
    just type a company name and get attached: `work_email` +
    `employee_number` are captured so the employer can actually verify
    the applicant is really one of theirs before approving.

    `application_status` gates whether the employee can use the benefit
    at all. Once APPROVED, the limit fields below ARE the capability
    layer — rather than a simple on/off flag, capability here is graded:
    an employer can approve someone but still cap what they can spend.
    """
    __tablename__ = "employee_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)

    # --- Fields the employer uses to verify this is really their employee ---
    work_email = Column(String, nullable=False)      # distinct from User.email (login email)
    employee_number = Column(String, nullable=True)  # payroll/HR reference, if the employer uses one
    department = Column(String, nullable=True)
    job_title = Column(String, nullable=True)

    # --- Layer 1: application status (is this person approved to use the benefit) ---
    application_status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)

    # Offboarding is a distinct lifecycle event from rejection/suspension —
    # someone can be a validly-approved employee whose employment simply
    # ended, which shouldn't read as "rejected." NULL means still employed.
    left_employer_at = Column(DateTime, nullable=True)

    # --- Layer 2: capability, expressed as limits rather than on/off ---
    # NULL on any of these means "fall back to the employer's default"
    # (Employer.default_employee_monthly_limit) rather than unlimited.
    monthly_limit = Column(Numeric(10, 2), nullable=True)
    max_transaction_amount = Column(Numeric(10, 2), nullable=True)
    daily_limit = Column(Numeric(10, 2), nullable=True)
    weekly_limit = Column(Numeric(10, 2), nullable=True)
    # Per-employee override of the employer's allowed/blocked merchant
    # categories — same comma-separated-text approach as Employer, for
    # the same day-1-simplicity reason.
    eligible_categories_override = Column(Text, nullable=True)

    # When the employee can start using the benefit, even once approved
    # (e.g. "eligible from 01/09/2026" per the design discussion)
    benefit_start_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
