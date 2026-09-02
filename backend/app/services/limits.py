# backend/app/services/limits.py
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
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


def get_outstanding_balance(db: Session, employee_id) -> Decimal:
    """
    What the employee currently owes and hasn't yet had cleared via payroll.
    A transaction's obligation clears the moment its billing cycle's payroll
    deduction has actually happened — NOT when the employer subsequently
    pays the platform, and NOT just because the cycle's cutoff date passed.
    So this counts every APPROVED transaction whose cycle is still OPEN or
    CLOSED (cutoff passed but payroll not yet confirmed deducted) — anything
    in a cycle at PAYROLL_DEDUCTED or later no longer counts against them.
    """
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(BillingCycle, Transaction.billing_cycle_id == BillingCycle.id)
        .filter(
            Transaction.employee_id == employee_id,
            Transaction.status == TransactionStatus.APPROVED,
            BillingCycle.status.in_([BillingCycleStatus.OPEN, BillingCycleStatus.CLOSED]),
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

    # --- Rolling daily / weekly caps (pacing limits, independent of the
    # overall spending-limit/outstanding-balance check below) ---
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

    # --- Overall spending limit, tracked as outstanding balance against the
    # current billing cycle rather than a rolling calendar month. Available
    # only grows back once a cycle's payroll deduction is confirmed — see
    # get_outstanding_balance. ---
    spending_limit = employee.monthly_limit if employee.monthly_limit is not None else employer.default_employee_monthly_limit
    outstanding = get_outstanding_balance(db, employee.id)
    available = spending_limit - outstanding
    if amount > available:
        return False, (
            f"This purchase would exceed your available spending limit. "
            f"You have £{available} available out of your £{spending_limit} limit."
        )

    return True, None
