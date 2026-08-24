# backend/app/schemas/transaction.py
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.models.transaction import TransactionMethod, TransactionStatus


class TransactionCreateRequest(BaseModel):
    amount: Decimal
    method: TransactionMethod = TransactionMethod.MANUAL_CODE


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
    id: UUID4
    merchant_id: UUID4
    business_name: str
    employee_id: Optional[UUID4] = None
    amount: Decimal
    method: TransactionMethod
    status: TransactionStatus
    transaction_code: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransactionLookupView(BaseModel):
    """
    What the employee sees before deciding to approve — deliberately
    thin (no merchant bank details, no internal IDs beyond what's needed)
    since this is looked up by a shared code, not an authenticated
    per-transaction link.
    """
    id: UUID4
    business_name: str
    amount: Decimal
    status: TransactionStatus
    expires_at: Optional[datetime] = None


class TransactionDecisionResponse(BaseModel):
    id: UUID4
    status: TransactionStatus
    reason: Optional[str] = None  # populated when a limit check blocks approval
