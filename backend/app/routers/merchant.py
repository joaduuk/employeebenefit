# backend/app/routers/merchant.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus, TransactionMethod
from app.models.user import User
from app.models.approval import ApplicationStatus
from app.schemas.transaction import TransactionCreateRequest, TransactionView

router = APIRouter(prefix="/merchant", tags=["Merchant — Transactions"])

# How long a merchant-generated code/QR stays valid before an employee
# must ask for a new one. Kept as a plain constant for day 1 — move to
# config if this needs to differ per merchant or be tuned in production.
TRANSACTION_TTL_SECONDS = 300


def _get_own_merchant(current_user: User, db: Session) -> Merchant:
    merchant = db.query(Merchant).filter(Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="No merchant account found for this user")
    return merchant


def _to_view(txn: Transaction, merchant: Merchant) -> TransactionView:
    return TransactionView(
        id=txn.id,
        merchant_id=txn.merchant_id,
        business_name=merchant.business_name,
        employee_id=txn.employee_id,
        amount=txn.amount,
        method=txn.method,
        status=txn.status,
        transaction_code=txn.transaction_code,
        created_at=txn.created_at,
        approved_at=txn.approved_at,
        expires_at=txn.expires_at,
    )


@router.post("/transactions", response_model=TransactionView)
def create_transaction(
    payload: TransactionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("merchant")),
):
    """
    Merchant enters an amount and gets back a transaction code (and, for
    the QR method once built, a QR payload) to show the employee.
    employee_id stays NULL until an employee looks the code up and
    approves it — this endpoint only stages the transaction.
    """
    merchant = _get_own_merchant(current_user, db)
    if merchant.application_status != ApplicationStatus.APPROVED or not merchant.payments_enabled:
        raise HTTPException(status_code=403, detail="Your account can't accept payments right now")

    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    txn = Transaction(
        merchant_id=merchant.id,
        employee_id=None,
        amount=payload.amount,
        method=payload.method,
        status=TransactionStatus.PENDING,
        merchant_latitude=merchant.latitude,
        merchant_longitude=merchant.longitude,
        expires_at=datetime.utcnow() + timedelta(seconds=TRANSACTION_TTL_SECONDS),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return _to_view(txn, merchant)


@router.get("/transactions", response_model=List[TransactionView])
def list_own_transactions(
    status: Optional[TransactionStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("merchant")),
):
    merchant = _get_own_merchant(current_user, db)
    query = db.query(Transaction).filter(Transaction.merchant_id == merchant.id)
    if status is not None:
        query = query.filter(Transaction.status == status)
    rows = query.order_by(Transaction.created_at.desc()).all()
    return [_to_view(t, merchant) for t in rows]


@router.get("/transactions/{transaction_id}", response_model=TransactionView)
def get_own_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("merchant")),
):
    """
    Meant to be polled by the merchant screen while waiting for the
    employee to approve or decline — no push/websocket layer yet.
    """
    merchant = _get_own_merchant(current_user, db)
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.merchant_id == merchant.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Lazily flip PENDING -> EXPIRED once the TTL has passed, so the
    # merchant screen sees an accurate status without a background job.
    if txn.status == TransactionStatus.PENDING and txn.expires_at and datetime.utcnow() > txn.expires_at:
        txn.status = TransactionStatus.EXPIRED
        db.commit()
        db.refresh(txn)

    return _to_view(txn, merchant)
