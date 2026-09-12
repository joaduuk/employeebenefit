# backend/app/routers/admin.py
import calendar
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_platform_staff
from app.models.employer import Employer
from app.models.merchant import Merchant, MerchantCategory
from app.models.employee_profile import EmployeeProfile
from app.models.merchant_settlement import MerchantSettlement, MerchantSettlementStatus
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.audit_log import AuditLog
from app.models.cash_position import CashPositionEntry
from app.models.user import User
from app.models.approval import ApplicationStatus
from app.schemas.admin import EmployerAdminView, MerchantAdminView, ApprovalDecisionRequest, PayoutToggleRequest, MerchantDetailsUpdateRequest
from app.schemas.employee import EmployeeAdminView, EmployeeApprovalRequest
from app.schemas.merchant_settlement import MarkSettlementPaidRequest
from app.schemas.transaction import AdminTransactionView
from app.services.export import export_response
from app.services.pdf_reports import generate_accounting_summary_pdf, generate_settlement_statement_pdf
from app.services.geocoding import geocode_uk_postcode
from app.core.email import (
    send_application_approved_email, send_application_rejected_email, send_account_suspended_email,
    send_settlement_paid_email,
)
from app.schemas.accounting import (
    DisputeRequest, DisputeResolutionRequest, EmployerPaymentConfirmRequest, CashPositionCreateRequest,
    CashPositionView, AccountingSummaryView, AuditLogView, EmployerArrearsView, AtRiskEmployerView,
)
from app.services.accounting import get_accounting_summary, get_employer_arrears, get_at_risk_employers
from app.services.merchant_settlements import get_settlement_readiness
from app.services.limits import compute_spending_limit
from app.services.audit import log_audit

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
    log_audit(db, staff, "employer.approve", "employer", employer.id, details=payload.decision_note)
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    try:
        send_application_approved_email(admin_user.email, admin_user.full_name, "Your company account is approved — you can now review and approve employees to start using their EEB benefit.")
    except Exception as e:
        print(f"[EMAIL] employer approved notification failed: {e}")
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
    log_audit(db, staff, "employer.reject", "employer", employer.id, details=payload.decision_note)
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    try:
        send_application_rejected_email(admin_user.email, admin_user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] employer rejected notification failed: {e}")
    return _to_admin_view(employer, admin_user)


@router.put("/employers/{employer_id}/suspend", response_model=EmployerAdminView)
def suspend_employer(
    employer_id: str,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
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
    log_audit(db, staff, "employer.suspend", "employer", employer.id, details=payload.decision_note)
    db.commit()
    db.refresh(employer)

    admin_user = db.query(User).filter(User.id == employer.admin_user_id).first()
    try:
        send_account_suspended_email(admin_user.email, admin_user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] employer suspended notification failed: {e}")
    return _to_admin_view(employer, admin_user)


def _to_merchant_admin_view(merchant: Merchant, owner_user: User) -> MerchantAdminView:
    return MerchantAdminView(
        id=merchant.id,
        business_name=merchant.business_name,
        owner_name=merchant.owner_name,
        business_address=merchant.business_address,
        postcode=merchant.postcode,
        category=merchant.category,
        registration_number=merchant.registration_number,
        payout_account_name=merchant.payout_account_name,
        payout_account_number=merchant.payout_account_number,
        payout_sort_code=merchant.payout_sort_code,
        latitude=merchant.latitude,
        longitude=merchant.longitude,
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
    category: Optional[MerchantCategory] = Query(None, description="Filter by merchant category"),
    q: Optional[str] = Query(None, description="Context-sensitive search across business name, postcode, and address"),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(Merchant, User).join(User, Merchant.user_id == User.id)
    if status is not None:
        query = query.filter(Merchant.application_status == status)
    if category is not None:
        query = query.filter(Merchant.category == category)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Merchant.business_name.ilike(like),
                Merchant.postcode.ilike(like),
                Merchant.business_address.ilike(like),
                Merchant.owner_name.ilike(like),
            )
        )
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
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    merchant.application_status = ApplicationStatus.APPROVED
    merchant.payments_enabled = True
    merchant.reviewed_by_user_id = staff.id
    merchant.reviewed_at = datetime.utcnow()
    merchant.decision_note = payload.decision_note

    # Geocode on approval if we have a postcode but no coordinates yet —
    # keeps the merchant map/search populated without a separate manual
    # step for the common case. Failures here are non-fatal: approval
    # still goes through, coordinates can be filled in later via the
    # manual /geocode endpoint below.
    if merchant.postcode and (merchant.latitude is None or merchant.longitude is None):
        coords = geocode_uk_postcode(merchant.postcode)
        if coords:
            merchant.latitude, merchant.longitude = coords
        else:
            print(f"[GEOCODE] could not geocode postcode '{merchant.postcode}' for merchant {merchant.id}")

    log_audit(db, staff, "merchant.approve", "merchant", merchant.id, details=payload.decision_note)
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    try:
        send_application_approved_email(owner_user.email, owner_user.full_name, "Your merchant account is approved — you can now start accepting EEB payments.")
    except Exception as e:
        print(f"[EMAIL] merchant approved notification failed: {e}")
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/geocode", response_model=MerchantAdminView)
def geocode_merchant(
    merchant_id: str,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Manual re-geocode — use this after correcting a merchant's postcode,
    or to retry a merchant that failed to geocode automatically at
    approval time.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if not merchant.postcode:
        raise HTTPException(status_code=400, detail="Merchant has no postcode on file to geocode")

    coords = geocode_uk_postcode(merchant.postcode)
    if not coords:
        raise HTTPException(status_code=422, detail=f"Could not geocode postcode '{merchant.postcode}'")

    merchant.latitude, merchant.longitude = coords
    log_audit(db, staff, "merchant.geocode", "merchant", merchant.id, details=f"postcode={merchant.postcode}")
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/details", response_model=MerchantAdminView)
def update_merchant_details(
    merchant_id: str,
    payload: MerchantDetailsUpdateRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Admin-side edit for merchant record details — primarily so a
    postcode can be added or corrected for merchants that registered
    before `postcode` existed as a field (or mistyped it at
    registration), without needing direct database access.

    All fields are optional; only the ones provided are changed. If the
    postcode is changed to a new value, this automatically re-geocodes
    it, same as the dedicated /geocode endpoint.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    postcode_changed = False

    if payload.business_address is not None:
        merchant.business_address = payload.business_address
    if payload.postcode is not None:
        if payload.postcode.strip().upper() != (merchant.postcode or "").strip().upper():
            postcode_changed = True
        merchant.postcode = payload.postcode
    if payload.owner_name is not None:
        merchant.owner_name = payload.owner_name
    if payload.registration_number is not None:
        merchant.registration_number = payload.registration_number
    if payload.category is not None:
        merchant.category = payload.category

    if postcode_changed and merchant.postcode:
        coords = geocode_uk_postcode(merchant.postcode)
        if coords:
            merchant.latitude, merchant.longitude = coords
        else:
            print(f"[GEOCODE] could not geocode postcode '{merchant.postcode}' for merchant {merchant.id}")

    log_audit(db, staff, "merchant.update_details", "merchant", merchant.id, details="admin edited merchant details")
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
    log_audit(db, staff, "merchant.reject", "merchant", merchant.id, details=payload.decision_note)
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    try:
        send_application_rejected_email(owner_user.email, owner_user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] merchant rejected notification failed: {e}")
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
    log_audit(db, staff, "merchant.suspend", "merchant", merchant.id, details=payload.decision_note)
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    try:
        send_account_suspended_email(owner_user.email, owner_user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] merchant suspended notification failed: {e}")
    return _to_merchant_admin_view(merchant, owner_user)


@router.put("/merchants/{merchant_id}/payouts", response_model=MerchantAdminView)
def toggle_merchant_payouts(
    merchant_id: str,
    payload: PayoutToggleRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
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
    log_audit(db, staff, "merchant.toggle_payouts", "merchant", merchant.id, details=f"enabled={payload.enabled}")
    db.commit()
    db.refresh(merchant)

    owner_user = db.query(User).filter(User.id == merchant.user_id).first()
    return _to_merchant_admin_view(merchant, owner_user)


# --- Platform-staff override of employee approvals -------------------------

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
        monthly_net_pay=profile.monthly_net_pay,
        spending_limit_percentage=profile.spending_limit_percentage,
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

    if payload.monthly_net_pay is None:
        raise HTTPException(status_code=400, detail="Monthly net pay is required to approve an employee.")

    try:
        computed_limit = compute_spending_limit(payload.monthly_net_pay, payload.spending_limit_percentage)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    profile.application_status = ApplicationStatus.APPROVED
    profile.monthly_net_pay = payload.monthly_net_pay
    profile.spending_limit_percentage = payload.spending_limit_percentage
    profile.monthly_limit = computed_limit
    profile.max_transaction_amount = payload.max_transaction_amount
    profile.daily_limit = payload.daily_limit
    profile.weekly_limit = payload.weekly_limit
    profile.eligible_categories_override = payload.eligible_categories_override
    profile.benefit_start_date = payload.benefit_start_date
    profile.reviewed_by_user_id = staff.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    log_audit(db, staff, "employee.approve_override", "employee_profile", profile.id, details=f"net_pay=£{payload.monthly_net_pay} pct={payload.spending_limit_percentage}% limit=£{computed_limit}")
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    try:
        send_application_approved_email(user.email, user.full_name, f"Your EEB benefit is now active with a monthly spending limit of £{computed_limit}.")
    except Exception as e:
        print(f"[EMAIL] employee approved notification failed: {e}")
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
    log_audit(db, staff, "employee.reject_override", "employee_profile", profile.id, details=payload.decision_note)
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    try:
        send_application_rejected_email(user.email, user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] employee rejected notification failed: {e}")
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
    log_audit(db, staff, "employee.suspend_override", "employee_profile", profile.id, details=payload.decision_note)
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    employer = db.query(Employer).filter(Employer.id == profile.employer_id).first()
    try:
        send_account_suspended_email(user.email, user.full_name, payload.decision_note)
    except Exception as e:
        print(f"[EMAIL] employee suspended notification failed: {e}")
    return _to_employee_admin_view(profile, user, employer)


# --- Merchant settlements oversight -----------------------------------

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
    results = []
    for s, m in rows:
        readiness = get_settlement_readiness(db, s)
        results.append({
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
            "amount_backed": str(readiness["amount_backed"]),
            "amount_unbacked": str(readiness["amount_unbacked"]),
            "readiness_percentage": readiness["readiness_percentage"],
        })
    return results


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
    log_audit(db, staff, "merchant_settlement.mark_paid", "merchant_settlement", settlement.id, details=f"£{settlement.total_amount} ref={payload.paid_reference}")
    db.commit()
    db.refresh(settlement)

    row = (
        db.query(Merchant, User)
        .join(User, Merchant.user_id == User.id)
        .filter(Merchant.id == settlement.merchant_id)
        .first()
    )
    if row:
        merchant, owner_user = row
        period_label = f"{calendar.month_name[settlement.period_month]} {settlement.period_year}"
        try:
            send_settlement_paid_email(owner_user.email, merchant.business_name, period_label, settlement.total_amount, payload.paid_reference)
        except Exception as e:
            print(f"[EMAIL] settlement paid notification failed: {e}")

    return {"id": str(settlement.id), "status": settlement.status.value}


# --- Billing cycle oversight + employer-paid confirmation ----------------
# Mirrors the merchant-settlement asymmetry: the employer confirms their
# OWN payroll deduction (routers/employer.py), but PLATFORM staff confirm
# when EEB actually receives that money, since it's EEB's own bank
# account receiving the payment.

@router.get("/billing-cycles")
def list_all_billing_cycles(
    status: Optional[BillingCycleStatus] = Query(None),
    employer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(BillingCycle, Employer).join(Employer, BillingCycle.employer_id == Employer.id)
    if status is not None:
        query = query.filter(BillingCycle.status == status)
    if employer_id is not None:
        query = query.filter(BillingCycle.employer_id == employer_id)
    rows = query.order_by(BillingCycle.payroll_deduction_date.asc()).all()
    return [
        {
            "id": str(c.id),
            "employer_id": str(c.employer_id),
            "employer_company_name": e.company_name,
            "cycle_number": c.cycle_number,
            "period_start": c.period_start.isoformat(),
            "period_end": c.period_end.isoformat(),
            "payroll_deduction_date": c.payroll_deduction_date.isoformat(),
            "status": c.status.value,
            "employer_amount_expected": str(c.employer_amount_expected) if c.employer_amount_expected is not None else None,
            "employer_amount_received": str(c.employer_amount_received) if c.employer_amount_received is not None else None,
            "employer_paid_at": c.employer_paid_at.isoformat() if c.employer_paid_at else None,
            "employer_paid_reference": c.employer_paid_reference,
        }
        for c, e in rows
    ]


@router.put("/billing-cycle/{cycle_id}/confirm-employer-paid")
def confirm_employer_paid(
    cycle_id: str,
    payload: EmployerPaymentConfirmRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    cycle = db.query(BillingCycle).filter(BillingCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Billing cycle not found")
    if cycle.status != BillingCycleStatus.PAYROLL_DEDUCTED:
        raise HTTPException(status_code=400, detail="Only a cycle marked PAYROLL_DEDUCTED can be confirmed as employer-paid")

    shortfall = None
    if cycle.employer_amount_expected is not None and payload.amount_received < cycle.employer_amount_expected:
        shortfall = cycle.employer_amount_expected - payload.amount_received

    cycle.status = BillingCycleStatus.EMPLOYER_PAID
    cycle.employer_amount_received = payload.amount_received
    cycle.employer_paid_at = datetime.utcnow()
    cycle.employer_paid_reference = payload.payment_reference

    details = f"received=£{payload.amount_received} reference={payload.payment_reference}"
    if shortfall is not None:
        details += f" SHORTFALL=£{shortfall}"
    log_audit(db, staff, "billing_cycle.confirm_employer_paid", "billing_cycle", cycle.id, details=details)

    db.commit()
    db.refresh(cycle)
    return {
        "id": str(cycle.id),
        "cycle_number": cycle.cycle_number,
        "status": cycle.status.value,
        "shortfall": str(shortfall) if shortfall is not None else None,
    }


@router.get("/accounting/employer-arrears", response_model=List[EmployerArrearsView])
def list_employer_arrears(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    return get_employer_arrears(db)


@router.get("/accounting/at-risk-employers", response_model=List[AtRiskEmployerView])
def list_at_risk_employers(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    """
    Early-warning signal, not automatic action — see
    services.accounting.get_at_risk_employers for the exact logic.
    Suspending an employer (existing PUT /admin/employers/{id}/suspend)
    remains a deliberate, manual decision made with this visibility,
    not something the system triggers on its own.
    """
    return get_at_risk_employers(db)


# --- Transaction oversight + dispute marking ------------------------------

@router.get("/transactions", response_model=List[AdminTransactionView])
def list_all_transactions(
    is_disputed: Optional[bool] = Query(None),
    status: Optional[TransactionStatus] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(Transaction)
    if is_disputed is not None:
        query = query.filter(Transaction.is_disputed == is_disputed)
    if status is not None:
        query = query.filter(Transaction.status == status)
    rows = query.order_by(Transaction.created_at.desc()).limit(500).all()

    results = []
    for txn in rows:
        merchant = db.query(Merchant).filter(Merchant.id == txn.merchant_id).first()
        employee_name = None
        employer_name = None
        if txn.employee_id:
            row = (
                db.query(EmployeeProfile, User, Employer)
                .join(User, EmployeeProfile.user_id == User.id)
                .join(Employer, EmployeeProfile.employer_id == Employer.id)
                .filter(EmployeeProfile.id == txn.employee_id)
                .first()
            )
            if row:
                _profile, user, employer = row
                employee_name = user.full_name
                employer_name = employer.company_name
        cycle_status = None
        if txn.billing_cycle_id:
            cycle = db.query(BillingCycle).filter(BillingCycle.id == txn.billing_cycle_id).first()
            if cycle:
                cycle_status = cycle.status.value

        results.append(AdminTransactionView(
            id=txn.id,
            amount=txn.amount,
            status=txn.status,
            transaction_code=txn.transaction_code,
            business_name=merchant.business_name if merchant else "Unknown",
            employee_full_name=employee_name,
            employer_company_name=employer_name,
            billing_cycle_status=cycle_status,
            location_distance_meters=txn.location_distance_meters,
            is_disputed=txn.is_disputed,
            dispute_reason=txn.dispute_reason,
            disputed_at=txn.disputed_at,
            dispute_resolved_at=txn.dispute_resolved_at,
            dispute_outcome=txn.dispute_outcome,
            resolution_note=txn.resolution_note,
            created_at=txn.created_at,
            approved_at=txn.approved_at,
        ))
    return results


@router.put("/transactions/{transaction_id}/mark-disputed")
def mark_transaction_disputed(
    transaction_id: str,
    payload: DisputeRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn.is_disputed = True
    txn.dispute_reason = payload.reason
    txn.disputed_at = datetime.utcnow()
    txn.dispute_resolved_at = None
    log_audit(db, staff, "transaction.mark_disputed", "transaction", txn.id, details=payload.reason)
    db.commit()
    db.refresh(txn)
    return {"id": str(txn.id), "is_disputed": txn.is_disputed}


@router.put("/transactions/{transaction_id}/resolve-dispute")
def resolve_transaction_dispute(
    transaction_id: str,
    payload: DisputeResolutionRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    """
    Deliberately does NOT touch any balance, cycle total, or settlement
    figure — resolving a dispute here is a record of the decision and
    (for an upheld dispute) what manual action was taken, not a trigger
    for automatic financial adjustment. Any actual correction — excluding
    an amount from a deduction file, arranging a merchant refund — is
    done by hand, by the admin, outside this endpoint; resolution_note is
    where that manual action gets written down for the audit trail.
    """
    if payload.outcome not in ("upheld", "rejected"):
        raise HTTPException(status_code=400, detail="outcome must be 'upheld' or 'rejected'")

    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if not txn.is_disputed:
        raise HTTPException(status_code=400, detail="This transaction isn't currently disputed")

    txn.dispute_resolved_at = datetime.utcnow()
    txn.dispute_outcome = payload.outcome
    txn.resolution_note = payload.resolution_note

    log_audit(db, staff, "transaction.resolve_dispute", "transaction", txn.id, details=f"outcome={payload.outcome} note={payload.resolution_note}")

    db.commit()
    db.refresh(txn)
    return {
        "id": str(txn.id),
        "dispute_resolved_at": txn.dispute_resolved_at.isoformat(),
        "outcome": txn.dispute_outcome,
        "resolution_note": txn.resolution_note,
    }


# --- Accounting summary + cash position (bank reconciliation) ------------

@router.get("/accounting/summary", response_model=AccountingSummaryView)
def accounting_summary(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    return get_accounting_summary(db)


@router.post("/accounting/cash-position", response_model=CashPositionView)
def record_cash_position(
    payload: CashPositionCreateRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(require_platform_staff()),
):
    entry = CashPositionEntry(
        recorded_date=payload.recorded_date or date.today(),
        bank_balance=payload.bank_balance,
        notes=payload.notes,
        recorded_by_user_id=staff.id,
    )
    db.add(entry)
    log_audit(db, staff, "cash_position.record", "cash_position_entry", None, details=f"£{payload.bank_balance} on {entry.recorded_date}")
    db.commit()
    db.refresh(entry)
    return CashPositionView(
        id=str(entry.id),
        recorded_date=entry.recorded_date,
        bank_balance=entry.bank_balance,
        notes=entry.notes,
        recorded_by_email=staff.email,
        created_at=entry.created_at,
    )


@router.get("/accounting/cash-position/history", response_model=List[CashPositionView])
def cash_position_history(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    rows = (
        db.query(CashPositionEntry, User)
        .join(User, CashPositionEntry.recorded_by_user_id == User.id)
        .order_by(CashPositionEntry.recorded_date.desc(), CashPositionEntry.created_at.desc())
        .limit(90)
        .all()
    )
    return [
        CashPositionView(
            id=str(e.id),
            recorded_date=e.recorded_date,
            bank_balance=e.bank_balance,
            notes=e.notes,
            recorded_by_email=u.email,
            created_at=e.created_at,
        )
        for e, u in rows
    ]


# --- Audit log -------------------------------------------------------------

@router.get("/audit-log", response_model=List[AuditLogView])
def list_audit_log(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    query = db.query(AuditLog)
    if action is not None:
        query = query.filter(AuditLog.action == action)
    if entity_type is not None:
        query = query.filter(AuditLog.entity_type == entity_type)
    rows = query.order_by(AuditLog.created_at.desc()).limit(300).all()
    return [
        AuditLogView(
            id=str(a.id),
            actor_email=a.actor_email,
            actor_role=a.actor_role,
            action=a.action,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            details=a.details,
            created_at=a.created_at,
        )
        for a in rows
    ]


# --- Exports (CSV / XLSX / JSON) and PDF reports --------------------------
# Dedicated endpoints rather than a format param bolted onto the existing
# list endpoints above — keeps those endpoints' response_model behaviour
# untouched, and export logic in one predictable place per report.

@router.get("/transactions/export")
def export_transactions(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    is_disputed: Optional[bool] = Query(None),
    status: Optional[TransactionStatus] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    rows = [row.model_dump(mode="json") for row in list_all_transactions(is_disputed=is_disputed, status=status, db=db, _staff=_staff)]
    return export_response(rows, "eeb_transactions", format)


@router.get("/audit-log/export")
def export_audit_log(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    rows = [row.model_dump(mode="json") for row in list_audit_log(action=action, entity_type=entity_type, db=db, _staff=_staff)]
    return export_response(rows, "eeb_audit_log", format)


@router.get("/merchant-settlements/export")
def export_merchant_settlements(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    status: Optional[MerchantSettlementStatus] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    rows = list_all_merchant_settlements(status=status, db=db, _staff=_staff)
    return export_response(rows, "eeb_merchant_settlements", format)


@router.get("/billing-cycles/export")
def export_billing_cycles(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    status: Optional[BillingCycleStatus] = Query(None),
    employer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    rows = list_all_billing_cycles(status=status, employer_id=employer_id, db=db, _staff=_staff)
    return export_response(rows, "eeb_employer_settlements", format)


@router.get("/accounting/summary/pdf")
def export_accounting_summary_pdf(
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    summary = get_accounting_summary(db)
    pdf_bytes = generate_accounting_summary_pdf(summary)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="eeb_accounting_summary_{date.today().isoformat()}.pdf"'},
    )


@router.get("/merchant-settlements/{settlement_id}/statement-pdf")
def export_settlement_statement_pdf(
    settlement_id: str,
    db: Session = Depends(get_db),
    _staff: User = Depends(require_platform_staff()),
):
    settlement = db.query(MerchantSettlement).filter(MerchantSettlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    merchant = db.query(Merchant).filter(Merchant.id == settlement.merchant_id).first()

    start = date(settlement.period_year, settlement.period_month, 1)
    last_day = calendar.monthrange(settlement.period_year, settlement.period_month)[1]
    end = date(settlement.period_year, settlement.period_month, last_day)
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.merchant_id == settlement.merchant_id,
            Transaction.status == TransactionStatus.APPROVED,
            func.date(Transaction.approved_at) >= start,
            func.date(Transaction.approved_at) <= end,
        )
        .order_by(Transaction.approved_at.asc())
        .all()
    )
    txn_rows = [
        {"date": t.approved_at.strftime("%Y-%m-%d") if t.approved_at else "", "code": t.transaction_code, "amount": str(t.amount)}
        for t in txns
    ]

    settlement_dict = {
        "period_year": settlement.period_year,
        "period_month": settlement.period_month,
        "total_amount": str(settlement.total_amount),
        "due_date": settlement.due_date.isoformat(),
        "status": settlement.status.value,
        "paid_at": settlement.paid_at.isoformat() if settlement.paid_at else None,
        "paid_reference": settlement.paid_reference,
    }
    pdf_bytes = generate_settlement_statement_pdf(settlement_dict, merchant.business_name if merchant else "Unknown", txn_rows)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="eeb_settlement_{settlement_id[:8]}.pdf"'},
    )
