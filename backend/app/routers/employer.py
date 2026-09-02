# backend/app/routers/employer.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.employee_profile import EmployeeProfile
from app.models.employer import Employer
from app.models.user import User
from app.models.approval import ApplicationStatus
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.schemas.employee import EmployeeAdminView, EmployeeApprovalRequest
from app.services.billing_cycles import get_or_create_open_cycle
from app.services.payroll_export import get_cycle_deduction_breakdown, breakdown_to_csv, breakdown_to_json

router = APIRouter(prefix="/employer", tags=["Employer"])


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


def _get_own_cycle(cycle_id: str, employer: Employer, db: Session) -> BillingCycle:
    cycle = (
        db.query(BillingCycle)
        .filter(BillingCycle.id == cycle_id, BillingCycle.employer_id == employer.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="Billing cycle not found")
    return cycle


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


# --- Employee approvals ------------------------------------------------

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


# --- Billing cycles / payroll deduction ---------------------------------

@router.get("/billing-cycles")
def list_billing_cycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    """
    Every billing cycle for this employer, most recent first — including
    the currently OPEN one. Ensures at least one OPEN cycle exists so the
    list is never empty for a newly-approved employer.
    """
    employer = _get_own_employer(current_user, db)
    get_or_create_open_cycle(db, employer)
    db.commit()

    cycles = (
        db.query(BillingCycle)
        .filter(BillingCycle.employer_id == employer.id)
        .order_by(BillingCycle.cycle_number.desc())
        .all()
    )
    return [
        {
            "id": str(c.id),
            "cycle_number": c.cycle_number,
            "period_start": c.period_start.isoformat(),
            "period_end": c.period_end.isoformat(),
            "payroll_deduction_date": c.payroll_deduction_date.isoformat(),
            "status": c.status.value,
        }
        for c in cycles
    ]


@router.get("/billing-cycle/{cycle_id}/deduction-file")
def download_deduction_file(
    cycle_id: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    """
    Generates the per-employee payroll deduction file for this cycle on
    demand — nothing is pre-generated or stored, so this always reflects
    current data. Available for any cycle regardless of status, so an
    employer can preview an OPEN cycle's running total, not just a
    CLOSED one.
    """
    employer = _get_own_employer(current_user, db)
    cycle = _get_own_cycle(cycle_id, employer, db)
    breakdown = get_cycle_deduction_breakdown(db, cycle, employer)

    filename_base = f"EEB_Payroll_{employer.company_name.replace(' ', '_')}_Cycle{cycle.cycle_number}"

    if format == "csv":
        content = breakdown_to_csv(breakdown)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
        )

    content = breakdown_to_json(breakdown)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.json"'},
    )


@router.put("/billing-cycle/{cycle_id}/close-now")
def close_cycle_now(
    cycle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    """
    Manual override so testing doesn't require waiting for the payroll
    date or restarting the backend. Only valid on an OPEN cycle — in
    normal operation this happens automatically via the scheduler once
    payroll_deduction_date arrives (see services/payroll_scheduler.py).
    """
    employer = _get_own_employer(current_user, db)
    cycle = _get_own_cycle(cycle_id, employer, db)
    if cycle.status != BillingCycleStatus.OPEN:
        raise HTTPException(status_code=400, detail="Only an OPEN cycle can be closed")

    cycle.status = BillingCycleStatus.CLOSED
    db.commit()
    db.refresh(cycle)
    return {"id": str(cycle.id), "cycle_number": cycle.cycle_number, "status": cycle.status.value}


@router.put("/billing-cycle/{cycle_id}/confirm-payroll-deducted")
def confirm_payroll_deducted(
    cycle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    """
    The real "money has actually been deducted" confirmation — only valid
    on a CLOSED cycle (i.e. its cutoff has passed and it's no longer
    accepting new transactions). This is the status transition that
    services/limits.py reads as "cleared" — employee outstanding balances
    for this cycle drop to zero the next time their balance is checked.
    """
    employer = _get_own_employer(current_user, db)
    cycle = _get_own_cycle(cycle_id, employer, db)
    if cycle.status != BillingCycleStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Only a CLOSED cycle can be confirmed as payroll-deducted")

    cycle.status = BillingCycleStatus.PAYROLL_DEDUCTED
    db.commit()
    db.refresh(cycle)
    return {"id": str(cycle.id), "cycle_number": cycle.cycle_number, "status": cycle.status.value}
