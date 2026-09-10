# backend/app/services/billing_cycles.py
import calendar
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.employer import Employer, PayrollFrequency
from app.models.transaction import Transaction, TransactionStatus


def _clamp_day(year: int, month: int, day: int) -> date:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def _next_monthly_date(day: int, after: date) -> date:
    """Next occurrence of `day`-of-month strictly after `after`, clamped to short months."""
    candidate = _clamp_day(after.year, after.month, day)
    if candidate <= after:
        month = after.month + 1
        year = after.year
        if month > 12:
            month = 1
            year += 1
        candidate = _clamp_day(year, month, day)
    return candidate


def _next_weekday_date(weekday: int, after: date) -> date:
    """
    Next occurrence of a weekday (0=Mon..6=Sun) strictly after `after`.
    Used for WEEKLY.
    """
    days_ahead = (weekday - after.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return after + timedelta(days=days_ahead)


def _next_fortnightly_date(anchor_date: date, after: date) -> date:
    """
    Next date that is exactly N x 14 days after anchor_date, strictly
    after `after`. anchor_date is any real date that WAS an actual
    payroll date — it resolves the ambiguity of which of two possible
    weeks is the "on" week, which plain weekday matching can never do
    for a genuinely fortnightly cadence.

    Falls back to a flat 14-day-from-today guess if no anchor has been
    set yet — better than crashing, but this is exactly the situation an
    anchor date is meant to prevent, so employers should be prompted to
    set one via PUT /employer/payroll-anchor-date.
    """
    if anchor_date is None:
        return after + timedelta(days=14)

    days_since_anchor = (after - anchor_date).days
    periods_elapsed = days_since_anchor // 14
    candidate = anchor_date + timedelta(days=(periods_elapsed + 1) * 14)
    while candidate <= after:
        candidate += timedelta(days=14)
    return candidate


def _compute_payroll_deduction_date(employer: Employer, after: date) -> date:
    if employer.payroll_frequency == PayrollFrequency.MONTHLY:
        return _next_monthly_date(employer.payroll_day, after)
    if employer.payroll_frequency == PayrollFrequency.FORTNIGHTLY:
        return _next_fortnightly_date(employer.payroll_anchor_date, after)
    return _next_weekday_date(employer.payroll_day, after)


def get_or_create_open_cycle(db: Session, employer: Employer) -> BillingCycle:
    """
    Returns the employer's current OPEN billing cycle, creating one if none
    exists. Only ever one OPEN cycle per employer at a time.
    """
    existing = (
        db.query(BillingCycle)
        .filter(BillingCycle.employer_id == employer.id, BillingCycle.status == BillingCycleStatus.OPEN)
        .order_by(BillingCycle.cycle_number.desc())
        .first()
    )
    if existing:
        return existing

    last_cycle = (
        db.query(BillingCycle)
        .filter(BillingCycle.employer_id == employer.id)
        .order_by(BillingCycle.cycle_number.desc())
        .first()
    )
    cycle_number = (last_cycle.cycle_number + 1) if last_cycle else 1
    period_start = (last_cycle.period_end + timedelta(days=1)) if last_cycle else date.today()

    payroll_deduction_date = _compute_payroll_deduction_date(employer, period_start)
    period_end = payroll_deduction_date - timedelta(days=employer.cutoff_days_before_payroll)
    if period_end < period_start:
        period_end = period_start

    employer_payment_due_date = payroll_deduction_date + timedelta(days=employer.collection_delay_days)
    merchant_settlement_due_date = employer_payment_due_date + timedelta(days=employer.merchant_settlement_delay_days)

    cycle = BillingCycle(
        employer_id=employer.id,
        cycle_number=cycle_number,
        period_start=period_start,
        period_end=period_end,
        payroll_deduction_date=payroll_deduction_date,
        employer_payment_due_date=employer_payment_due_date,
        merchant_settlement_due_date=merchant_settlement_due_date,
        status=BillingCycleStatus.OPEN,
    )
    db.add(cycle)
    db.flush()
    return cycle


def close_cycle(db: Session, cycle: BillingCycle) -> None:
    """
    Transitions an OPEN cycle to CLOSED, snapshotting the expected employer
    payment amount at this exact moment. Safe to snapshot now rather than
    recompute later — once CLOSED, no new transaction can ever be assigned
    to this cycle (get_or_create_open_cycle always starts a fresh one), so
    the total is permanently stable from here on. Shared by both the
    automatic scheduler and the employer's manual "Close Now" action, so
    the snapshot always happens the same way regardless of trigger.
    """
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.billing_cycle_id == cycle.id, Transaction.status == TransactionStatus.APPROVED)
        .scalar()
    )
    cycle.status = BillingCycleStatus.CLOSED
    cycle.employer_amount_expected = Decimal(total)
