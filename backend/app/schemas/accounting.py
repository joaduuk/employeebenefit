# backend/app/schemas/accounting.py
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class DisputeRequest(BaseModel):
    reason: str


class EmployerPaymentConfirmRequest(BaseModel):
    amount_received: Decimal
    payment_reference: Optional[str] = None


class CashPositionCreateRequest(BaseModel):
    recorded_date: Optional[date] = None
    bank_balance: Decimal
    notes: Optional[str] = None


class CashPositionView(BaseModel):
    id: str
    recorded_date: date
    bank_balance: Decimal
    notes: Optional[str] = None
    recorded_by_email: str
    created_at: datetime


class AccountingSummaryView(BaseModel):
    total_owed_by_employers: Decimal
    total_owed_to_merchants: Decimal
    total_disputed: Decimal
    disputed_count: int
    total_collected_from_employers: Decimal
    total_employer_arrears: Decimal
    total_paid_to_merchants: Decimal
    book_balance: Decimal
    bank_balance: Optional[Decimal] = None
    bank_balance_recorded_date: Optional[str] = None
    discrepancy: Optional[Decimal] = None


class EmployerArrearsView(BaseModel):
    employer_id: str
    employer_company_name: str
    total_shortfall: Decimal
    cycle_count: int


class AtRiskEmployerView(BaseModel):
    employer_id: str
    employer_company_name: str
    overdue_unpaid_count: int
    overdue_unpaid_amount: Decimal
    arrears_count: int
    arrears_amount: Decimal
    total_at_risk: Decimal
    is_pattern: bool


class AuditLogView(BaseModel):
    id: str
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
