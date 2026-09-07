# backend/app/services/accounting.py
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionStatus
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.merchant_settlement import MerchantSettlement, MerchantSettlementStatus
from app.models.cash_position import CashPositionEntry
from app.models.employer import Employer


def _sum(query) -> Decimal:
    result = query.scalar()
    return Decimal(result) if result is not None else Decimal("0.00")


def get_accounting_summary(db: Session) -> dict:
    """
    A daily balancing summary in the accounting sense. Every figure here
    is computed from real recorded state — nothing assumes an employer
    paid the full amount they owed, or that a transaction wasn't disputed.
    """

    total_owed_by_employers = _sum(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(BillingCycle, Transaction.billing_cycle_id == BillingCycle.id)
        .filter(
            Transaction.status == TransactionStatus.APPROVED,
            BillingCycle.status.in_([
                BillingCycleStatus.OPEN,
                BillingCycleStatus.CLOSED,
                BillingCycleStatus.PAYROLL_DEDUCTED,
            ]),
        )
    )

    total_owed_to_merchants = _sum(
        db.query(func.coalesce(func.sum(MerchantSettlement.total_amount), 0))
        .filter(MerchantSettlement.status == MerchantSettlementStatus.PENDING)
    )

    total_disputed = _sum(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.is_disputed.is_(True), Transaction.dispute_resolved_at.is_(None))
    )
    disputed_count = (
        db.query(Transaction)
        .filter(Transaction.is_disputed.is_(True), Transaction.dispute_resolved_at.is_(None))
        .count()
    )

    # Actually collected — the REAL amount received, not the amount that
    # was owed. A cycle confirmed EMPLOYER_PAID with a shortfall only
    # contributes what was actually received; the gap shows up separately
    # as arrears below, never silently absorbed into "collected".
    paid_cycles = (
        db.query(BillingCycle)
        .filter(BillingCycle.status.in_([BillingCycleStatus.EMPLOYER_PAID, BillingCycleStatus.MERCHANTS_SETTLED]))
        .all()
    )
    total_collected_from_employers = sum(
        (c.employer_amount_received for c in paid_cycles if c.employer_amount_received is not None),
        Decimal("0.00"),
    )
    total_employer_arrears = sum(
        (
            (c.employer_amount_expected - c.employer_amount_received)
            for c in paid_cycles
            if c.employer_amount_expected is not None
            and c.employer_amount_received is not None
            and c.employer_amount_received < c.employer_amount_expected
        ),
        Decimal("0.00"),
    )

    total_paid_to_merchants = _sum(
        db.query(func.coalesce(func.sum(MerchantSettlement.total_amount), 0))
        .filter(MerchantSettlement.status == MerchantSettlementStatus.PAID)
    )

    book_balance = total_collected_from_employers - total_paid_to_merchants

    latest_entry = (
        db.query(CashPositionEntry)
        .order_by(CashPositionEntry.recorded_date.desc(), CashPositionEntry.created_at.desc())
        .first()
    )
    bank_balance = latest_entry.bank_balance if latest_entry else None
    discrepancy = (bank_balance - book_balance) if bank_balance is not None else None

    return {
        "total_owed_by_employers": total_owed_by_employers,
        "total_owed_to_merchants": total_owed_to_merchants,
        "total_disputed": total_disputed,
        "disputed_count": disputed_count,
        "total_collected_from_employers": total_collected_from_employers,
        "total_employer_arrears": total_employer_arrears,
        "total_paid_to_merchants": total_paid_to_merchants,
        "book_balance": book_balance,
        "bank_balance": bank_balance,
        "bank_balance_recorded_date": latest_entry.recorded_date.isoformat() if latest_entry else None,
        "discrepancy": discrepancy,
    }


def get_employer_arrears(db: Session) -> list:
    """
    Every employer with an outstanding shortfall — a cycle confirmed
    EMPLOYER_PAID where less was received than expected. This is the
    standing-arrears view: shortfalls are tracked here for visibility and
    manual follow-up, not automatically rolled into a future cycle.
    """
    cycles = (
        db.query(BillingCycle, Employer)
        .join(Employer, BillingCycle.employer_id == Employer.id)
        .filter(
            BillingCycle.status.in_([BillingCycleStatus.EMPLOYER_PAID, BillingCycleStatus.MERCHANTS_SETTLED]),
            BillingCycle.employer_amount_expected.isnot(None),
            BillingCycle.employer_amount_received.isnot(None),
            BillingCycle.employer_amount_received < BillingCycle.employer_amount_expected,
        )
        .all()
    )

    by_employer = {}
    for cycle, employer in cycles:
        shortfall = cycle.employer_amount_expected - cycle.employer_amount_received
        if employer.id not in by_employer:
            by_employer[employer.id] = {
                "employer_id": str(employer.id),
                "employer_company_name": employer.company_name,
                "total_shortfall": Decimal("0.00"),
                "cycle_count": 0,
            }
        by_employer[employer.id]["total_shortfall"] += shortfall
        by_employer[employer.id]["cycle_count"] += 1

    return list(by_employer.values())
