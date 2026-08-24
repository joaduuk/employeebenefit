# backend/app/routers/employee.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.schemas.transaction import TransactionLookupView, TransactionDecisionResponse, TransactionApprovalRequest
from app.services.limits import check_transaction_allowed

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


@router.get("/transactions/lookup/{code}", response_model=TransactionLookupView)
def lookup_transaction(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employee")),
):
    """
    Shows the employee what they're about to approve (merchant name,
    amount) before they commit — deliberately doesn't run limit checks
    here, only at actual approve time, so browsing a code has no side effects.
    """
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

    # Captured regardless of outcome — not enforced yet. This is deliberately
    # NOT part of check_transaction_allowed: it's audit/calibration data
    # for a future proximity threshold, not a gate on approval today.
    if payload.latitude is not None:
        txn.employee_latitude = payload.latitude
    if payload.longitude is not None:
        txn.employee_longitude = payload.longitude

    allowed, reason = check_transaction_allowed(db, profile, employer, merchant, txn.amount)
    if not allowed:
        # A blocked limit is a real decision, not a "try again" state — the
        # merchant's screen should update immediately rather than sit on
        # "waiting" until the code eventually expires. The employee has to
        # go back and ask the merchant to generate a fresh code if they
        # still want to attempt a (smaller, or later) purchase.
        txn.employee_id = profile.id
        txn.status = TransactionStatus.DECLINED
        db.commit()
        db.refresh(txn)
        return TransactionDecisionResponse(id=txn.id, status=txn.status, reason=reason)

    txn.employee_id = profile.id
    txn.status = TransactionStatus.APPROVED
    txn.approved_at = datetime.utcnow()
    # billing_cycle_id is intentionally left NULL here — cycle assignment
    # happens once BillingCycle creation/lookup logic exists; until then
    # approved transactions are reconciled to a cycle after the fact.
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
    db.commit()
    db.refresh(txn)

    return TransactionDecisionResponse(id=txn.id, status=txn.status, reason=None)
