# backend/app/routers/employer.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.user import User
from app.models.approval import ApplicationStatus
from app.schemas.employee import EmployeeAdminView, EmployeeApprovalRequest

router = APIRouter(prefix="/employer", tags=["Employer — Employee Approvals"])


def _get_own_employer(current_user: User, db: Session) -> Employer:
    """
    Resolves the Employer row this employer-role user administers.
    Role alone ("employer") isn't enough to scope access — this ties
    every query below to that specific company so one employer admin
    can never see or approve another employer's applicants.
    """
    employer = db.query(Employer).filter(Employer.admin_user_id == current_user.id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="No employer account found for this user")
    return employer


def _to_employee_view(profile: EmployeeProfile, user: User, employer: Employer) -> EmployeeAdminView:
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
def list_own_employees(
    status: Optional[ApplicationStatus] = Query(None, description="Filter by application status; omit for all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    employer = _get_own_employer(current_user, db)
    query = (
        db.query(EmployeeProfile, User)
        .join(User, EmployeeProfile.user_id == User.id)
        .filter(EmployeeProfile.employer_id == employer.id)
    )
    if status is not None:
        query = query.filter(EmployeeProfile.application_status == status)
    rows = query.order_by(EmployeeProfile.submitted_at.asc()).all()
    return [_to_employee_view(profile, user, employer) for profile, user in rows]


@router.get("/employees/{profile_id}", response_model=EmployeeAdminView)
def get_own_employee(
    profile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    employer = _get_own_employer(current_user, db)
    row = (
        db.query(EmployeeProfile, User)
        .join(User, EmployeeProfile.user_id == User.id)
        .filter(EmployeeProfile.id == profile_id, EmployeeProfile.employer_id == employer.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found")
    profile, user = row
    return _to_employee_view(profile, user, employer)


@router.put("/employees/{profile_id}/approve", response_model=EmployeeAdminView)
def approve_employee(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    """
    Sets both layers at once: application_status -> APPROVED, plus every
    limit field from the form. Any limit left blank stays NULL on the
    profile — the spending-check logic should read a NULL as "fall back
    to Employer.default_employee_monthly_limit," not "unlimited."
    """
    employer = _get_own_employer(current_user, db)
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.id == profile_id, EmployeeProfile.employer_id == employer.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile.application_status = ApplicationStatus.APPROVED
    profile.monthly_limit = payload.monthly_limit
    profile.max_transaction_amount = payload.max_transaction_amount
    profile.daily_limit = payload.daily_limit
    profile.weekly_limit = payload.weekly_limit
    profile.eligible_categories_override = payload.eligible_categories_override
    profile.benefit_start_date = payload.benefit_start_date
    profile.reviewed_by_user_id = current_user.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    return _to_employee_view(profile, user, employer)


@router.put("/employees/{profile_id}/reject", response_model=EmployeeAdminView)
def reject_employee(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    employer = _get_own_employer(current_user, db)
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.id == profile_id, EmployeeProfile.employer_id == employer.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile.application_status = ApplicationStatus.REJECTED
    profile.reviewed_by_user_id = current_user.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    return _to_employee_view(profile, user, employer)


@router.put("/employees/{profile_id}/suspend", response_model=EmployeeAdminView)
def suspend_employee(
    profile_id: str,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    employer = _get_own_employer(current_user, db)
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.id == profile_id, EmployeeProfile.employer_id == employer.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")
    if profile.application_status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only an approved employee can be suspended")

    profile.application_status = ApplicationStatus.SUSPENDED
    profile.reviewed_by_user_id = current_user.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    return _to_employee_view(profile, user, employer)