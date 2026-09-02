# backend/app/services/merchant_settlements.py
import calendar
from datetime import date
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.merchant_settlement import MerchantSettlement
from app.models.approval import ApplicationStatus


def _previous_month(today: date) -> tuple:
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


def _last_day_of_month_after(year: int, month: int) -> date:
    """Last day of the month AFTER (year, month) — the settlement due date,
    per the "paid on the last day of the following month" design."""
    next_month = month + 1
    next_year = year
    if next_month > 12:
        next_month = 1
        next_year += 1
    last_day = calendar.monthrange(next_year, next_month)[1]
    return date(next_year, next_month, last_day)


def compute_month_total(db: Session, merchant_id, year: int, month: int) -> Decimal:
    start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)

    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.merchant_id == merchant_id,
            Transaction.status == TransactionStatus.APPROVED,
            func.date(Transaction.approved_at) >= start,
            func.date(Transaction.approved_at) <= end,
        )
        .scalar()
    )
    return Decimal(total)


def generate_due_settlements(db: Session):
    """
    Ensures a MerchantSettlement row exists for every approved merchant's
    previous calendar month. Idempotent — checks for an existing row per
    merchant/period before creating, so it's safe to run daily without
    ever double-generating a settlement.
    """
    today = date.today()
    year, month = _previous_month(today)

    merchants = db.query(Merchant).filter(Merchant.application_status == ApplicationStatus.APPROVED).all()
    created = []
    for merchant in merchants:
        existing = (
            db.query(MerchantSettlement)
            .filter(
                MerchantSettlement.merchant_id == merchant.id,
                MerchantSettlement.period_year == year,
                MerchantSettlement.period_month == month,
            )
            .first()
        )
        if existing:
            continue

        total = compute_month_total(db, merchant.id, year, month)
        if total <= 0:
            continue

        settlement = MerchantSettlement(
            merchant_id=merchant.id,
            period_year=year,
            period_month=month,
            total_amount=total,
            due_date=_last_day_of_month_after(year, month),
        )
        db.add(settlement)
        created.append(settlement)

    if created:
        db.commit()
    return created
