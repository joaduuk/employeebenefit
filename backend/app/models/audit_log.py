# backend/app/models/audit_log.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuditLog(Base):
    """
    A general-purpose record of significant state-changing actions —
    approvals, rejections, financial confirmations, dispute markings.
    actor_email is denormalized (stored directly, not just via FK) so the
    log still reads sensibly even if the acting user's account is later
    deleted or changed. entity_id is stored as a string since it may
    reference different kinds of primary keys across entity_type values.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor_email = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)

    action = Column(String, nullable=False)         # e.g. "employer.approve", "billing_cycle.confirm_employer_paid"
    entity_type = Column(String, nullable=False)     # e.g. "employer", "transaction", "billing_cycle"
    entity_id = Column(String, nullable=True)

    details = Column(Text, nullable=True)            # free-form context (decision note, amount, reference, etc.)

    created_at = Column(DateTime, default=datetime.utcnow)
