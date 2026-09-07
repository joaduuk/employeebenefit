# backend/app/routers/employee.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.schemas.transaction import TransactionLookupView, TransactionDecisionResponse, TransactionApprovalRequest, EmployeeTransactionView
from app.schemas.employee import EmployeeBalanceView
from app.services.limits import check_transaction_allowed, get_outstanding_balance
from app.services.billing_cycles import get_or_create_open_cycle
from app.services.audit import log_audit

router = APIRouter(prefix="/employee", tags=["Employee — Transactions"])


def _get_own_profile(current_user: User, db: Session) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No employee profile found for this user")
    return profile


def _get_pending_txn_by_code(code: str, db: Session) -> Transaction:
    txn = (
        db.query(Transaction)
        .filter(Transaction.transaction_code == code.upper(), Transaction.status == TransactionStatus.PENDING)
        .order_by(Transaction.created_at.desc())
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="No pending transaction found for that code")
    if txn.expires_at and datetime.utcnow() > txn.expires_at:
        txn.status = TransactionStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=410, detail="This code has expired — ask the merchant for a new one")
    return txn


@router.get("/balance", response_model=EmployeeBalanceView)
def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    profile = _get_own_profile(current_user, db)
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()

    spending_limit = profile.monthly_limit if profile.monthly_limit is not None else employer.default_employee_monthly_limit
    outstanding = get_outstanding_balance(db, profile.id)
    available = spending_limit - outstanding

    cycle = get_or_create_open_cycle(db, employer)
    db.commit()

    return EmployeeBalanceView(
        spending_limit=spending_limit,
        outstanding=outstanding,
        available=available,
        max_transaction_amount=profile.max_transaction_amount,
        daily_limit=profile.daily_limit,
        weekly_limit=profile.weekly_limit,
        current_cycle_period_end=cycle.period_end,
        current_cycle_status=cycle.status.value,
    )


@router.get("/transactions", response_model=List[EmployeeTransactionView])
def list_own_transactions(
    status: Optional[TransactionStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    profile = _get_own_profile(current_user, db)
    query = (
        db.query(Transaction, Merchant)
        .join(Merchant, Transaction.merchant_id == Merchant.id)
        .filter(Transaction.employee_id == profile.id)
    )
    if status is not None:
        query = query.filter(Transaction.status == status)
    rows = query.order_by(Transaction.created_at.desc()).all()
    return [
        EmployeeTransactionView(
            id=txn.id,
            business_name=merchant.business_name,
            amount=txn.amount,
            method=txn.method,
            status=txn.status,
            transaction_code=txn.transaction_code,
            created_at=txn.created_at,
            approved_at=txn.approved_at,
        )
        for txn, merchant in rows
    ]


@router.get("/transactions/lookup/{code}", response_model=TransactionLookupView)
def lookup_transaction(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    txn = _get_pending_txn_by_code(code, db)
    merchant = db.query(Merchant).filter(Merchant.id == txn.merchant_id).first()
    return TransactionLookupView(
        id=txn.id,
        business_name=merchant.business_name,
        amount=txn.amount,
        status=txn.status,
        expires_at=txn.expires_at,
    )


@router.post("/transactions/{code}/approve", response_model=TransactionDecisionResponse)
def approve_transaction(
    code: str,
    payload: TransactionApprovalRequest = TransactionApprovalRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    txn = _get_pending_txn_by_code(code, db)
    profile = _get_own_profile(current_user, db)
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    merchant = db.query(Merchant).filter(Merchant.id == txn.merchant_id).first()

    if payload.latitude is not None:
        txn.employee_latitude = payload.latitude
    if payload.longitude is not None:
        txn.employee_longitude = payload.longitude

    allowed, reason = check_transaction_allowed(db, profile, employer, merchant, txn.amount)
    if not allowed:
        txn.employee_id = profile.id
        txn.status = TransactionStatus.DECLINED
        log_audit(db, current_user, "transaction.declined_limit", "transaction", txn.id, details=reason)
        db.commit()
        db.refresh(txn)
        return TransactionDecisionResponse(id=txn.id, status=txn.status, reason=reason)

    cycle = get_or_create_open_cycle(db, employer)

    txn.employee_id = profile.id
    txn.status = TransactionStatus.APPROVED
    txn.approved_at = datetime.utcnow()
    txn.billing_cycle_id = cycle.id
    log_audit(db, current_user, "transaction.approve", "transaction", txn.id, details=f"£{txn.amount}")
    db.commit()
    db.refresh(txn)

    return TransactionDecisionResponse(id=txn.id, status=txn.status, reason=None)


@router.post("/transactions/{code}/decline", response_model=TransactionDecisionResponse)
def decline_transaction(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    txn = _get_pending_txn_by_code(code, db)
    profile = _get_own_profile(current_user, db)

    txn.employee_id = profile.id
    txn.status = TransactionStatus.DECLINED
    log_audit(db, current_user, "transaction.decline", "transaction", txn.id)
    db.commit()
    db.refresh(txn)

    return TransactionDecisionResponse(id=txn.id, status=txn.status, reason=None)
