# backend/app/schemas/employee.py
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class EmployeeApprovalRequest(BaseModel):
    monthly_limit: Optional[Decimal] = None
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