# backend/app/models/merchant_settlement.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, Integer, Numeric, Date, DateTime, Enum as SAEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class MerchantSettlementStatus(str, enum.Enum):
    PENDING = "pending"   # generated, awaiting platform payout
    PAID = "paid"          # platform has paid the merchant


class MerchantSettlement(Base):
    """
    One row per merchant per calendar month — the "your settlement for
    June is £X, due 31 July" batch from the settlement design discussion.
    total_amount is every APPROVED transaction with approved_at falling in
    that calendar month, regardless of the underlying billing cycle's
    clearance status — per the Merchant Agreement's guaranteed-payment
    commitment (Section 5.1: once approved, the merchant is owed payment
    regardless of what happens on the employer side).
    """
    __tablename__ = "merchant_settlements"
    __table_args__ = (
        UniqueConstraint("merchant_id", "period_year", "period_month", name="uq_merchant_settlement_period"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)

    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)  # 1-12

    total_amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)  # last day of the month following period_month

    status = Column(SAEnum(MerchantSettlementStatus), nullable=False, default=MerchantSettlementStatus.PENDING)

    # Optional reference a platform admin can record when marking this
    # paid (e.g. a bank transfer reference), for reconciliation.
    paid_reference = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    generated_at = Column(DateTime, default=datetime.utcnow)
