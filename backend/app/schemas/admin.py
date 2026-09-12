# backend/app/schemas/admin.py
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

from app.models.employer import PayrollFrequency
from app.models.merchant import MerchantCategory


class EmployerAdminView(BaseModel):
    id: UUID4
    company_name: str
    registration_number: Optional[str] = None
    payroll_frequency: PayrollFrequency
    payroll_day: int
    application_status: str
    benefit_active: bool
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    decision_note: Optional[str] = None
    admin_full_name: str
    admin_email: str

    class Config:
        from_attributes = True


class MerchantAdminView(BaseModel):
    id: UUID4
    business_name: str
    owner_name: Optional[str] = None
    business_address: Optional[str] = None
    postcode: Optional[str] = None
    category: MerchantCategory
    registration_number: Optional[str] = None
    payout_account_name: Optional[str] = None
    payout_account_number: Optional[str] = None
    payout_sort_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    application_status: str
    payments_enabled: bool
    payouts_enabled: bool
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    decision_note: Optional[str] = None
    owner_user_full_name: str
    owner_user_email: str

    class Config:
        from_attributes = True


class MerchantDetailsUpdateRequest(BaseModel):
    business_address: Optional[str] = None
    postcode: Optional[str] = None
    owner_name: Optional[str] = None
    registration_number: Optional[str] = None
    category: Optional[MerchantCategory] = None


class ApprovalDecisionRequest(BaseModel):
    decision_note: Optional[str] = None


class PayoutToggleRequest(BaseModel):
    enabled: bool
    decision_note: Optional[str] = None
