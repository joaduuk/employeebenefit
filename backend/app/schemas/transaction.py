# backend/app/schemas/transaction.py
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.models.transaction import TransactionMethod, TransactionStatus, TransactionPurchaseTag


class TransactionCreateRequest(BaseModel):
    amount: Decimal
    method: TransactionMethod = TransactionMethod.MANUAL_CODE
    purchase_tag: Optional[TransactionPurchaseTag] = None


class TransactionApprovalRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TransactionView(BaseModel):
    id: UUID4
    merchant_id: UUID4
    business_name: str
    employee_id: Optional[UUID4] = None
    employee_full_name: Optional[str] = None
    employee_work_email: Optional[str] = None
    employee_photo_url: Optional[str] = None
    amount: Decimal
    method: TransactionMethod
    status: TransactionStatus
    transaction_code: str
    purchase_tag: Optional[TransactionPurchaseTag] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransactionLookupView(BaseModel):
    id: UUID4
    business_name: str
    amount: Decimal
    status: TransactionStatus
    expires_at: Optional[datetime] = None


class EmployeeTransactionView(BaseModel):
    id: UUID4
    business_name: str
    amount: Decimal
    method: TransactionMethod
    status: TransactionStatus
    transaction_code: str
    created_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminTransactionView(BaseModel):
    """
    Platform-wide view for oversight and dispute marking — spans every
    merchant and employer, unlike the merchant/employee-scoped views above.
    """
    id: UUID4
    amount: Decimal
    status: TransactionStatus
    transaction_code: str
    business_name: str
    employee_full_name: Optional[str] = None
    employer_company_name: Optional[str] = None
    billing_cycle_status: Optional[str] = None
    location_distance_meters: Optional[float] = None
    is_disputed: bool
    dispute_reason: Optional[str] = None
    disputed_at: Optional[datetime] = None
    dispute_resolved_at: Optional[datetime] = None
    dispute_outcome: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None


class TransactionDecisionResponse(BaseModel):
    id: UUID4
    status: TransactionStatus
    reason: Optional[str] = None
