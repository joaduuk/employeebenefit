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
from app.services.billing_cycles import get_or_create_open_cycle, close_cycle
from app.services.payroll_export import get_cycle_deduction_breakdown, breakdown_to_csv, breakdown_to_json
from app.services.limits import compute_spending_limit
from app.services.export import export_response
from app.services.audit import log_audit

router = APIRouter(prefix="/employer", tags=["Employer — Employee Approvals"])


def _get_own_employer(current_user: User, db: Session) -> Employer:
    employer = db.query(Employer).filter(Employer.admin_user_id == current_user.id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="No employer account found for this user")
    return employer


def _get_own_cycle(cycle_id: str, employer: Employer, db: Session) -> BillingCycle:
    cycle = db.query(BillingCycle).filter(BillingCycle.id == cycle_id, BillingCycle.employer_id == employer.id).first()
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
    employer = _get_own_employer(current_user, db)
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.id == profile_id, EmployeeProfile.employer_id == employer.id)
        .first()
    )
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
    profile.reviewed_by_user_id = current_user.id
    profile.reviewed_at = datetime.utcnow()
    profile.decision_note = payload.decision_note
    log_audit(db, current_user, "employee.approve", "employee_profile", profile.id, details=f"net_pay=£{payload.monthly_net_pay} pct={payload.spending_limit_percentage}% limit=£{computed_limit}")
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
    log_audit(db, current_user, "employee.reject", "employee_profile", profile.id, details=payload.decision_note)
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
    log_audit(db, current_user, "employee.suspend", "employee_profile", profile.id, details=payload.decision_note)
    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.id == profile.user_id).first()
    return _to_employee_view(profile, user, employer)


@router.get("/billing-cycles")
def list_billing_cycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
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
            "employer_amount_expected": str(c.employer_amount_expected) if c.employer_amount_expected is not None else None,
            "employer_amount_received": str(c.employer_amount_received) if c.employer_amount_received is not None else None,
            "employer_paid_at": c.employer_paid_at.isoformat() if c.employer_paid_at else None,
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
    employer = _get_own_employer(current_user, db)
    cycle = _get_own_cycle(cycle_id, employer, db)
    if cycle.status != BillingCycleStatus.OPEN:
        raise HTTPException(status_code=400, detail="Only an OPEN cycle can be closed")

    close_cycle(db, cycle)
    log_audit(db, current_user, "billing_cycle.close_now", "billing_cycle", cycle.id, details=f"expected=£{cycle.employer_amount_expected}")
    db.commit()
    db.refresh(cycle)
    return {"id": str(cycle.id), "cycle_number": cycle.cycle_number, "status": cycle.status.value}


@router.put("/billing-cycle/{cycle_id}/confirm-payroll-deducted")
def confirm_payroll_deducted(
    cycle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    employer = _get_own_employer(current_user, db)
    cycle = _get_own_cycle(cycle_id, employer, db)
    if cycle.status != BillingCycleStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Only a CLOSED cycle can be confirmed as payroll-deducted")

    cycle.status = BillingCycleStatus.PAYROLL_DEDUCTED
    log_audit(db, current_user, "billing_cycle.confirm_payroll_deducted", "billing_cycle", cycle.id)
    db.commit()
    db.refresh(cycle)
    return {"id": str(cycle.id), "cycle_number": cycle.cycle_number, "status": cycle.status.value}


# --- Exports (CSV / XLSX / JSON) -------------------------------------------

@router.get("/employees/export")
def export_own_employees(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    status: Optional[ApplicationStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    rows = [row.model_dump(mode="json") for row in list_own_employees(status=status, db=db, current_user=current_user)]
    return export_response(rows, "eeb_my_employees", format)


@router.get("/billing-cycles/export")
def export_own_billing_cycles(
    format: str = Query("csv", pattern="^(csv|xlsx|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("employer")),
):
    rows = list_billing_cycles(db=db, current_user=current_user)
    return export_response(rows, "eeb_my_billing_cycles", format)
