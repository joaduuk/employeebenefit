# backend/app/services/limits.py
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.approval import ApplicationStatus


def _approved_spend_since(db: Session, employee_id, since: datetime) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.employee_id == employee_id,
            Transaction.status == TransactionStatus.APPROVED,
            Transaction.created_at >= since,
        )
        .scalar()
    )
    return Decimal(total)


def _category_allowed(employee: EmployeeProfile, employer: Employer, merchant: Merchant) -> Tuple[bool, Optional[str]]:
    merchant_category = merchant.category.value

    # Per-employee override takes precedence over the employer's default
    # allow/block lists entirely, per the model's design.
    if employee.eligible_categories_override:
        allowed = {c.strip() for c in employee.eligible_categories_override.split(",") if c.strip()}
        if merchant_category not in allowed:
            return False, "This merchant's category isn't eligible for your account."
        return True, None

    if employer.blocked_categories:
        blocked = {c.strip() for c in employer.blocked_categories.split(",") if c.strip()}
        if merchant_category in blocked:
            return False, "Your employer has blocked purchases at this type of merchant."

    if employer.allowed_categories:
        allowed = {c.strip() for c in employer.allowed_categories.split(",") if c.strip()}
        if merchant_category not in allowed:
            return False, "Your employer hasn't enabled purchases at this type of merchant."

    return True, None


def check_transaction_allowed(
    db: Session,
    employee: EmployeeProfile,
    employer: Employer,
    merchant: Merchant,
    amount: Decimal,
) -> Tuple[bool, Optional[str]]:
    """
    Returns (True, None) if the transaction can proceed, or (False, reason)
    if some check blocks it. Checked in order from cheapest/most-fundamental
    to most-expensive (DB aggregate queries) so we fail fast.
    """
    today = date.today()

    # --- Eligibility gates ---
    if employee.application_status != ApplicationStatus.APPROVED:
        return False, "Your account isn't approved to use the benefit yet."
    if employee.left_employer_at is not None:
        return False, "Your access to this benefit has ended."
    if employee.benefit_start_date and employee.benefit_start_date > today:
        return False, f"Your benefit doesn't start until {employee.benefit_start_date.isoformat()}."

    if employer.application_status != ApplicationStatus.APPROVED or not employer.benefit_active:
        return False, "Your employer's benefit is not currently active."

    if merchant.application_status != ApplicationStatus.APPROVED or not merchant.payments_enabled:
        return False, "This merchant can't accept payments right now."

    # --- Category restriction ---
    ok, reason = _category_allowed(employee, employer, merchant)
    if not ok:
        return False, reason

    # --- Per-transaction cap ---
    if employee.max_transaction_amount is not None and amount > employee.max_transaction_amount:
        return False, f"This purchase exceeds your per-transaction limit of £{employee.max_transaction_amount}."

    # --- Rolling daily / weekly / monthly caps ---
    # Daily: since midnight today. Weekly: rolling 7 days (not ISO week —
    # simplest correct interpretation until a cycle-aligned week is needed).
    # Monthly: since the 1st of the current calendar month. Falls back to
    # the employer's default monthly limit when the employee has no
    # override, per the model's NULL-means-fallback design.
    if employee.daily_limit is not None:
        since = datetime.combine(today, datetime.min.time())
        spent = _approved_spend_since(db, employee.id, since)
        if spent + amount > employee.daily_limit:
            return False, f"This purchase would exceed your daily limit of £{employee.daily_limit}."

    if employee.weekly_limit is not None:
        since = datetime.utcnow() - timedelta(days=7)
        spent = _approved_spend_since(db, employee.id, since)
        if spent + amount > employee.weekly_limit:
            return False, f"This purchase would exceed your weekly limit of £{employee.weekly_limit}."

    monthly_limit = employee.monthly_limit if employee.monthly_limit is not None else employer.default_employee_monthly_limit
    since = datetime.combine(today.replace(day=1), datetime.min.time())
    spent = _approved_spend_since(db, employee.id, since)
    if spent + amount > monthly_limit:
        return False, f"This purchase would exceed your monthly limit of £{monthly_limit}."

    return True, None
