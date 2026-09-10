# backend/app/models/consent.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ConsentRecord(Base):
    """
    One row per document a user agrees to — not one row per registration.
    An employee registering creates two rows (employee_terms +
    privacy_policy); an employer creates two (employer_agreement +
    privacy_policy); a merchant creates two (merchant_agreement +
    privacy_policy).

    document_version is a simple date-stamped identifier captured at the
    moment of consent (see app/core/document_versions.py) — if a document
    is later revised, new consents record the new version while everyone
    who already agreed keeps their original record exactly as it was.
    This is a historical trail, not something that silently updates when
    a document changes.
    """
    __tablename__ = "consent_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    document_name = Column(String, nullable=False)     # "employee_terms" | "employer_agreement" | "merchant_agreement" | "privacy_policy"
    document_version = Column(String, nullable=False)  # date-stamped, e.g. "2026-09-10"

    agreed_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
