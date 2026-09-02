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
    """
    Optional location captured at approval time. Not currently enforced —
    stored for later calibration of a proximity threshold, not used to
    block a purchase yet. Both fields optional since geolocation may be
    denied or unavailable on the employee's device.
    """
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TransactionView(BaseModel):
    """
    The merchant's view of a transaction — includes purchase_tag (merchant's
    own memory-jogging tag, never shown to the employee) and counterparty
    details once an employee has actually engaged with it (approved or
    declined), including employee_photo_url — a visual anti-fraud check so
    the merchant can confirm the person approving matches their profile
    photo. All employee fields stay None while status is PENDING or
    EXPIRED, since employee_id is only set once someone acts on the code.
    """
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
    """
    What the employee sees before deciding to approve — deliberately
    thin (no merchant bank details, no internal IDs beyond what's needed,
    and never purchase_tag — that's the merchant's own note) since this
    is looked up by a shared code, not an authenticated per-transaction link.
    """
    id: UUID4
    business_name: str
    amount: Decimal
    status: TransactionStatus
    expires_at: Optional[datetime] = None


class EmployeeTransactionView(BaseModel):
    """
    The employee's own purchase history view — merchant name and timing,
    deliberately never includes purchase_tag (that's the merchant's own
    reconciliation note, not something shown back to the employee).
    """
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


class TransactionDecisionResponse(BaseModel):
    id: UUID4
    status: TransactionStatus
    reason: Optional[str] = None  # populated when a limit check blocks approval
