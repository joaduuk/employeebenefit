# backend/app/services/consent.py
from sqlalchemy.orm import Session

from app.models.consent import ConsentRecord
from app.core.document_versions import CURRENT_DOCUMENT_VERSIONS


def record_consent(db: Session, user_id, document_name: str, ip_address: str = None) -> None:
    """
    Adds a ConsentRecord — does NOT commit itself, so the caller's
    existing commit (right after creating the User and role-specific row)
    persists it in the same transaction, keeping the consent record and
    the account it belongs to atomic with each other.
    """
    version = CURRENT_DOCUMENT_VERSIONS.get(document_name, "unknown")
    record = ConsentRecord(
        user_id=user_id,
        document_name=document_name,
        document_version=version,
        ip_address=ip_address,
    )
    db.add(record)
