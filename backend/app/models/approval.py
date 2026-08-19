# backend/app/models/approval.py
"""
Shared approval-workflow pieces for Employer, Merchant, and EmployeeProfile.

Design (from the onboarding/approval discussion): keep "is this application
allowed to exist" (ApplicationStatus) separate from "what can it actually do
right now" (capability flags). A merchant can be APPROVED as a business
while payouts stay off until their bank account is verified — one boolean
can't express that, but two independent layers can.

Each model that goes through an approval flow:
  1. Uses ApplicationStatus for its status column.
  2. Mixes in ApprovalAuditMixin for the who/when/why-rejected trail.
  3. Adds its OWN capability flags/limits — these are intentionally NOT
     shared, because what "capability" means differs per module:
       Employer:  a single "benefit active" toggle
       Merchant:  payments_enabled / payouts_enabled (two independent flags)
       Employee:  spending limits (amount + per-transaction + period),
                  which act as capability by *degree* rather than on/off
"""
import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"              # submitted, not yet looked at
    UNDER_REVIEW = "under_review"    # a reviewer has started checking it
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"          # was approved, now paused (not a rejection)


class ApprovalAuditMixin:
    """
    Mixed into any model that goes through a human approval step.
    Columns only — the class isn't a table itself (no __tablename__),
    so SQLAlchemy just folds these columns into whichever model uses it.
    """
    reviewed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    # Populated on REJECTED (and optionally on SUSPENDED) so the applicant
    # can see why, and so support isn't guessing later.
    decision_note = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
