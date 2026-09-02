# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_platform_staff
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.employee_profile import EmployeeProfile
from app.models.merchant_settlement import MerchantSettlement, MerchantSettlementStatus
from app.models.user import User
from app.models.approval import ApplicationStatus
from app.schemas.admin import EmployerAdminView, MerchantAdminView, ApprovalDecisionRequest, PayoutToggleRequest
from app.schemas.employee import EmployeeAdminView, EmployeeApprovalRequest
from app.schemas.merchant_settlement import MarkSettlementPaidRequest

router = APIRouter(prefix="/admin", tags=["Admin — Approvals"])


def _to_admin_view(employer: Employer, admin_user: User) -> EmployerAdminView:
    return EmployerAdminView(
        id=employer.id,
        company_name=employer.company_name,
        registration_number=employer.registration_number,
        payroll_frequency=employer.payroll_frequency,
        payroll_day=employer.payroll_day,
        application_status=employer.application_status.value,
        benefit_active=employer.benefit_active,
        submitted_at=employer.submitted_at,
        reviewed_at=employer.reviewed_at,
        decision_note=employer.decision_note,
        admin_full_name=admin_user.full_name,
        admin_email=admin_user.email,
    )


@router.get("/employers", response_model=List[EmployerAdminView])
def list_employers(
    status: Optional[ApplicationStatus] = Query(None, description="Filter by application status; omit for all"),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(Employer, User).join(User, Employer.admin_user_id == User.id)
    if status is not None:
        query = query.filter(Employer.application_status == status)
    rows = query.order_by(Employer.submitted_at.asc()).all()
    return [_to_admin_view(employer, user) for employer, user in rows]


@router.get("/employers/{employer_id}", response_model=EmployerAdminView)
def get_employer(
    employer_id: str,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    row = (
        db.query(Employer, User)
        .join(User, Employer.admin_user_id == User.id)
        .filter(Employer.id == employer_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Employer not found")
    employer, admin_user = row
    return _to_admin_view(employer, admin_user)


@router.put("/employers/{employer_id}/approve", response_model=EmployerAdminView)
def approve_employer(
    employer_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")

    employer.application_status = ApplicationStatus.APPROVED
    employer.benefit_active = True
    employer.reviewed_by_user_id = staff.id
    employer.reviewed_at = datetime.utcnow()
    employer.decision_note = payload.decision_note
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    return _to_admin_view(employer, admin_user)


@router.put("/employers/{employer_id}/reject", response_model=EmployerAdminView)
def reject_employer(
    employer_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")

    employer.application_status = ApplicationStatus.REJECTED
    employer.benefit_active = False
    employer.reviewed_by_user_id = staff.id
    employer.reviewed_at = datetime.utcnow()
    employer.decision_note = payload.decision_note
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    return _to_admin_view(employer, admin_user)


@router.put("/employers/{employer_id}/suspend", response_model=EmployerAdminView)
def suspend_employer(
    employer_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Pauses an already-approved employer (e.g. a billing dispute) without
    treating them as rejected — distinct status from REJECTED, per the
    two-layer approval design.
    """
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    if employer.application_status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only an approved employer can be suspended")

    employer.application_status = ApplicationStatus.SUSPENDED
    employer.benefit_active = False
    employer.reviewed_by_user_id = staff.id
    employer.reviewed_at = datetime.utcnow()
    employer.decision_note = payload.decision_note
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    return _to_admin_view(employer, admin_user)


def _to_merchant_admin_view(merchant: Merchant, owner_user: User) -> MerchantAdminView:
    return MerchantAdminView(
        id=merchant.id,
        business_name=merchant.business_name,
        owner_name=merchant.owner_name,
        business_address=merchant.business_address,
        category=merchant.category,
        registration_number=merchant.registration_number,
        payout_account_name=merchant.payout_account_name,
        payout_account_number=merchant.payout_account_number,
        payout_sort_code=merchant.payout_sort_code,
        application_status=merchant.application_status.value,
        payments_enabled=merchant.payments_enabled,
        payouts_enabled=merchant.payouts_enabled,
        submitted_at=merchant.submitted_at,
        reviewed_at=merchant.reviewed_at,
        decision_note=merchant.decision_note,
        owner_user_full_name=owner_user.full_name,
        owner_user_email=owner_user.email,
    )


@router.get("/merchants", response_model=List[MerchantAdminView])
def list_merchants(
    status: Optional[ApplicationStatus] = Query(None, description="Filter by application status; omit for all"),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(Merchant, User).join(User, Merchant.user_id == User.id)
    if status is not None:
        query = query.filter(Merchant.application_status == status)
    rows = query.order_by(Merchant.submitted_at.asc()).all()
    return [_to_merchant_admin_view(merchant, user) for merchant, user in rows]


@router.get("/merchants/{merchant_id}", response_model=MerchantAdminView)
def get_merchant(
    merchant_id: str,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    row = (
        db.query(Merchant, User)
        .join(User, Merchant.user_id == User.id)
        .filter(Merchant.id == merchant_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Merchant not found")
    merchant, owner_user = row
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/approve", response_model=MerchantAdminView)
def approve_merchant(
    merchant_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Approves the merchant as a business and turns payments on. Payouts
    are deliberately NOT enabled here — a merchant can be an approved
    business while payouts stay off until their bank account is
    separately verified (see toggle_payouts below).
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    merchant.application_status = ApplicationStatus.APPROVED
    merchant.payments_enabled = True
    merchant.reviewed_by_user_id = staff.id
    merchant.reviewed_at = datetime.utcnow()
    merchant.decision_note = payload.decision_note
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/reject", response_model=MerchantAdminView)
def reject_merchant(
    merchant_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    merchant.application_status = ApplicationStatus.REJECTED
    merchant.payments_enabled = False
    merchant.payouts_enabled = False
    merchant.reviewed_by_user_id = staff.id
    merchant.reviewed_at = datetime.utcnow()
    merchant.decision_note = payload.decision_note
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/suspend", response_model=MerchantAdminView)
def suspend_merchant(
    merchant_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if merchant.application_status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only an approved merchant can be suspended")

    merchant.application_status = ApplicationStatus.SUSPENDED
    merchant.payments_enabled = False
    merchant.payouts_enabled = False
    merchant.reviewed_by_user_id = staff.id
    merchant.reviewed_at = datetime.utcnow()
    merchant.decision_note = payload.decision_note
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/payouts", response_model=MerchantAdminView)
def toggle_merchant_payouts(
    merchant_id: str,
    payload: PayoutToggleRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Independent lever from application approval — e.g. flip this on once
    the merchant's bank account details have been verified, without
    touching their application_status at all.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if merchant.application_status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Merchant must be approved before payouts can be toggled")

    merchant.payouts_enabled = payload.enabled
    merchant.reviewed_by_user_id = staff.id
    merchant.reviewed_at = datetime.utcnow()
    if payload.decision_note:
        merchant.decision_note = payload.decision_note
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


# --- Platform-staff override of employee approvals -------------------------
# Employees are normally approved by their own employer (see routers/employer.py).
# These endpoints let platform staff step in on any employer's applicants —
# same shape as the employer-side ones, just not scoped to a single employer.

def _to_employee_admin_view(profile: EmployeeProfile, user: User, employer: Employer) -> EmployeeAdminView:
    return EmployeeAdminView(
        id=profile.id,
        employer_id=profile.employer_id,
        employer_company_name=employer.company_name,
        work_email=profile.work_email,
        employee_number=profile.employee_number,
        department=profile.department,
        job_title=profile.job_title,
        application_status=profile.application_status.value,
        monthly_limit=profile.monthly_limit,
        max_transaction_amount=profile.max_transaction_amount,
        daily_limit=profile.daily_limit,
        weekly_limit=profile.weekly_limit,
        eligible_categories_override=profile.eligible_categories_override,
        benefit_start_date=profile.benefit_start_date,
        left_employer_at=profile.left_employer_at,
        submitted_at=profile.submitted_at,
        reviewed_at=profile.reviewed_at,
        decision_note=profile.decision_note,
        user_full_name=user.full_name,
        user_email=user.email,
    )


@router.get("/employees", response_model=List[EmployeeAdminView])
def list_employees(
    status: Optional[ApplicationStatus] = Query(None, description="Filter by application status; omit for all"),
    employer_id: Optional[str] = Query(None, description="Optionally filter to one employer"),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = (
        db.query(EmployeeProfile, User, Employer)
        .join(User, EmployeeProfile.user_id == User.id)
        .join(Employer, EmployeeProfile.employer_id == Employer.id)
    )
    if status is not None:
        query = query.filter(EmployeeProfile.application_status == status)
    if employer_id is not None:
        query = query.filter(EmployeeProfile.employer_id == employer_id)
    rows = query.order_by(EmployeeProfile.submitted_at.asc()).all()
    return [_to_employee_admin_view(profile, user, employer) for profile, user, employer in rows]


@router.get("/employees/{profile_id}", response_model=EmployeeAdminView)
def get_employee(
    profile_id: str,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    row = (
        db.query(EmployeeProfile, User, Employer)
        .join(User, EmployeeProfile.user_id == User.id)
        .join(Employer, EmployeeProfile.employer_id == Employer.id)
        .filter(EmployeeProfile.id == profile_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found")
    profile, user, employer = row
    return _to_employee_admin_view(profile, user, employer)


@router.put("/employees/{profile_id}/approve", response_model=EmployeeAdminView)
def approve_employee_override(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile.application_status = ApplicationStatus.APPROVED
    profile.monthly_limit = payload.monthly_limit
    profile.max_transaction_amount = payload.max_transaction_amount
    profile.daily_limit = payload.daily_limit
    profile.weekly_limit = payload.weekly_limit
    profile.eligible_categories_override = payload.eligible_categories_override
    profile.benefit_start_date = payload.benefit_start_date
    profile.reviewed_by_user_id = staff.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    return _to_employee_admin_view(profile, user, employer)


@router.put("/employees/{profile_id}/reject", response_model=EmployeeAdminView)
def reject_employee_override(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile.application_status = ApplicationStatus.REJECTED
    profile.reviewed_by_user_id = staff.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    return _to_employee_admin_view(profile, user, employer)


@router.put("/employees/{profile_id}/suspend", response_model=EmployeeAdminView)
def suspend_employee_override(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")
    if profile.application_status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only an approved employee can be suspended")

    profile.application_status = ApplicationStatus.SUSPENDED
    profile.reviewed_by_user_id = staff.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    return _to_employee_admin_view(profile, user, employer)


# --- Merchant settlements oversight -----------------------------------
# Merchants are paid BY the platform, so the "confirm this happened"
# action belongs to platform staff, not the merchant — the mirror image
# of the employer side, where the employer confirms deduction on
# themselves. Settlements are generated automatically by
# services/merchant_settlement_scheduler.py; these endpoints are for
# oversight and marking a generated settlement as actually paid.

@router.get("/merchant-settlements")
def list_all_merchant_settlements(
    status: Optional[MerchantSettlementStatus] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(MerchantSettlement, Merchant).join(Merchant, MerchantSettlement.merchant_id == Merchant.id)
    if status is not None:
        query = query.filter(MerchantSettlement.status == status)
    rows = query.order_by(MerchantSettlement.due_date.asc()).all()
    return [
        {
            "id": str(s.id),
            "merchant_id": str(s.merchant_id),
            "business_name": m.business_name,
            "period_year": s.period_year,
            "period_month": s.period_month,
            "total_amount": str(s.total_amount),
            "due_date": s.due_date.isoformat(),
            "status": s.status.value,
            "paid_at": s.paid_at.isoformat() if s.paid_at else None,
            "paid_reference": s.paid_reference,
        }
        for s, m in rows
    ]


@router.put("/merchant-settlements/{settlement_id}/mark-paid")
def mark_settlement_paid(
    settlement_id: str,
    payload: MarkSettlementPaidRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    settlement = db.query(MerchantSettlement).filter(MerchantSettlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    if settlement.status == MerchantSettlementStatus.PAID:
        raise HTTPException(status_code=400, detail="Already marked as paid")

    settlement.status = MerchantSettlementStatus.PAID
    settlement.paid_at = datetime.utcnow()
    settlement.paid_reference = payload.paid_reference
    db.commit()
    db.refresh(settlement)
    return {"id": str(settlement.id), "status": settlement.status.value}
