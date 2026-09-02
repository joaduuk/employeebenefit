# backend/app/services/billing_cycles.py
import calendar
from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.employer import Employer, PayrollFrequency


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
    Used for both WEEKLY and FORTNIGHTLY — FORTNIGHTLY has no stored anchor
    date to know which week is the "on" week, so it currently behaves
    identically to WEEKLY. Revisit once Employer has a reference date for
    fortnightly cadence.
    """
    days_ahead = (weekday - after.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return after + timedelta(days=days_ahead)


def _compute_payroll_deduction_date(employer: Employer, after: date) -> date:
    if employer.payroll_frequency == PayrollFrequency.MONTHLY:
        return _next_monthly_date(employer.payroll_day, after)
    # WEEKLY and FORTNIGHTLY both use next-weekday for now — see docstring above.
    return _next_weekday_date(employer.payroll_day, after)


def get_or_create_open_cycle(db: Session, employer: Employer) -> BillingCycle:
    """
    Returns the employer's current OPEN billing cycle, creating one if none
    exists. Only ever one OPEN cycle per employer at a time — a new one is
    created only when there is none open (e.g. after the previous cycle was
    closed by the employer confirming payroll deduction).
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
        period_end = period_start  # safety clamp for very short cutoff configs

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
