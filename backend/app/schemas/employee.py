# backend/app/schemas/employee.py
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class EmployeeApprovalRequest(BaseModel):
    """
    monthly_limit is no longer typed directly — it's computed by the
    backend from monthly_net_pay × spending_limit_percentage, enforced
    against a hard ceiling (see services.limits.MAX_SPENDING_LIMIT_PERCENTAGE).
    This closes the gap where an employer admin could previously set any
    arbitrary cash figure with no relationship to what the employee
    actually earns.
    """
    monthly_net_pay: Optional[Decimal] = None
    spending_limit_percentage: Optional[Decimal] = Decimal("20.00")  # DEFAULT_SPENDING_LIMIT_PERCENTAGE
    max_transaction_amount: Optional[Decimal] = None
    daily_limit: Optional[Decimal] = None
    weekly_limit: Optional[Decimal] = None
    eligible_categories_override: Optional[str] = None
    benefit_start_date: Optional[date] = None
    decision_note: Optional[str] = None


class EmployeeAdminView(BaseModel):
    id: UUID4
    employer_id: UUID4
    employer_company_name: str
    work_email: str
    employee_number: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    application_status: str
    monthly_net_pay: Optional[Decimal] = None
    spending_limit_percentage: Optional[Decimal] = None
    monthly_limit: Optional[Decimal] = None
    max_transaction_amount: Optional[Decimal] = None
    daily_limit: Optional[Decimal] = None
    weekly_limit: Optional[Decimal] = None
    eligible_categories_override: Optional[str] = None
    benefit_start_date: Optional[date] = None
    left_employer_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    decision_note: Optional[str] = None
    user_full_name: str
    user_email: str

    class Config:
        from_attributes = True


class EmployeeBalanceView(BaseModel):
    """
    What the employee sees about their own account. Includes their own
    registered pay and percentage for transparency — they can see exactly
    how their limit was calculated, not just the resulting figure.
    """
    spending_limit: Decimal
    outstanding: Decimal
    available: Decimal
    monthly_net_pay: Optional[Decimal] = None
    spending_limit_percentage: Optional[Decimal] = None
    max_transaction_amount: Optional[Decimal] = None
    daily_limit: Optional[Decimal] = None
    weekly_limit: Optional[Decimal] = None
    current_cycle_period_end: Optional[date] = None
    current_cycle_status: Optional[str] = None
