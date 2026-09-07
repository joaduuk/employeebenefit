# backend/app/services/audit.py
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def log_audit(
    db: Session,
    actor: User,
    action: str,
    entity_type: str,
    entity_id,
    details: str = None,
) -> None:
    """
    Records an audit entry. Does NOT call db.commit() — the caller's
    existing commit (right after the state change this is logging)
    persists it in the same transaction, so the log entry and the change
    it describes are never out of sync with each other.
    """
    entry = AuditLog(
        actor_user_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        actor_role=actor.role.value if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
    )
    db.add(entry)
