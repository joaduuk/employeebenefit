# backend/app/models/cash_position.py
import uuid
from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class CashPositionEntry(Base):
    """
    A manually-recorded snapshot of EEB's actual bank balance, entered by
    a platform admin from a real bank statement — deliberately NOT
    computed, since the system has no way to know the real bank balance
    on its own. Compared against the computed "book balance" (collected
    from employers minus paid to merchants) to catch discrepancies —
    a genuine bank reconciliation, not just a dashboard number.
    """
    __tablename__ = "cash_position_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    recorded_date = Column(Date, nullable=False, default=date.today)
    bank_balance = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text, nullable=True)

    recorded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
