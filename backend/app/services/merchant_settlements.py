# backend/app/services/merchant_settlements.py
import calendar
from datetime import date
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.merchant import Merchant
from app.models.user import User
from app.models.transaction import Transaction, TransactionStatus
from app.models.merchant_settlement import MerchantSettlement
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.approval import ApplicationStatus
from app.core.email import send_settlement_generated_email


def _previous_month(today: date) -> tuple:
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


def _last_day_of_month_after(year: int, month: int) -> date:
    """Last day of the month AFTER (year, month) — the settlement due date."""
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


def get_settlement_readiness(db: Session, settlement: MerchantSettlement) -> dict:
    """
    For a given monthly settlement, breaks down how much of the total is
    backed by employer money EEB has actually collected (the underlying
    billing cycle has reached EMPLOYER_PAID or later) versus still riding
    on the assumption that collection completes before this settlement
    gets paid out. This is visibility, not a gate — per the Merchant
    Agreement's guaranteed-payment commitment, an unready settlement still
    gets paid on schedule; this just shows the platform admin what's
    actually backing that payment before they confirm it.
    """
    start = date(settlement.period_year, settlement.period_month, 1)
    last_day = calendar.monthrange(settlement.period_year, settlement.period_month)[1]
    end = date(settlement.period_year, settlement.period_month, last_day)

    rows = (
        db.query(Transaction, BillingCycle)
        .outerjoin(BillingCycle, Transaction.billing_cycle_id == BillingCycle.id)
        .filter(
            Transaction.merchant_id == settlement.merchant_id,
            Transaction.status == TransactionStatus.APPROVED,
            func.date(Transaction.approved_at) >= start,
            func.date(Transaction.approved_at) <= end,
        )
        .all()
    )

    backed = Decimal("0.00")
    unbacked = Decimal("0.00")
    for txn, cycle in rows:
        if cycle and cycle.status in (BillingCycleStatus.EMPLOYER_PAID, BillingCycleStatus.MERCHANTS_SETTLED):
            backed += txn.amount
        else:
            unbacked += txn.amount

    total = backed + unbacked
    readiness_pct = float(backed / total * 100) if total > 0 else 100.0

    return {
        "amount_backed": backed,
        "amount_unbacked": unbacked,
        "readiness_percentage": round(readiness_pct, 1),
    }


def generate_due_settlements(db: Session):
    """
    Ensures a MerchantSettlement row exists for every approved merchant's
    previous calendar month. Idempotent — checks for an existing row per
    merchant/period before creating, so it's safe to run daily without
    ever double-generating a settlement.

    Notifies each merchant once their new settlement is safely committed.
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
        created.append((settlement, merchant))

    if created:
        db.commit()
        for settlement, merchant in created:
            owner_user = db.query(User).filter(User.id == merchant.user_id).first()
            if owner_user:
                period_label = f"{calendar.month_name[settlement.period_month]} {settlement.period_year}"
                try:
                    send_settlement_generated_email(owner_user.email, merchant.business_name, period_label, settlement.total_amount, settlement.due_date.isoformat())
                except Exception as e:
                    print(f"[EMAIL] settlement generated notification failed: {e}")
    return created
