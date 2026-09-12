# backend/app/routers/registration.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import secrets
from typing import List

from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.email import send_verification_email
from app.models.user import User, UserRole
from app.models.employer import Employer
from app.models.merchant import Merchant
from app.models.employee_profile import EmployeeProfile
from app.models.approval import ApplicationStatus
from app.services.consent import record_consent
from app.schemas.registration import (
    EmployerRegisterRequest, EmployerRegisterResponse,
    MerchantRegisterRequest, MerchantRegisterResponse,
    EmployeeRegisterRequest, EmployeeRegisterResponse,
    EmployerLookupResult,
)

router = APIRouter(prefix="/register", tags=["Registration"])

VERIFICATION_TOKEN_EXPIRE_MINUTES = 30


def _create_base_user(db: Session, email: str, password: str, full_name: str, phone: str | None, role: UserRole) -> tuple[User, str]:
    """
    Shared first step for every registration form: create the User row
    and a verification token. Raises 400 if the email is already taken.
    Does NOT commit — the caller commits once the role-specific row is
    also added, so a failure partway through doesn't leave an orphaned
    User with no matching Employer/Merchant/EmployeeProfile.
    """
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = secrets.token_urlsafe(32)
    user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        hashed_password=get_password_hash(password),
        role=role,
        is_verified=False,
        email_valid=True,
        verification_token=token,
        verification_token_expires=datetime.utcnow() + timedelta(minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES),
        verification_sent_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()  # assigns user.id without committing yet
    return user, token


@router.post("/employer", response_model=EmployerRegisterResponse)
def register_employer(payload: EmployerRegisterRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the Employer Agreement and Privacy Policy to register")

    user, token = _create_base_user(
        db, payload.email, payload.password, payload.full_name, payload.phone, UserRole.EMPLOYER
    )

    employer = Employer(
        admin_user_id=user.id,
        company_name=payload.company_name,
        registration_number=payload.registration_number,
        payroll_frequency=payload.payroll_frequency,
        payroll_day=payload.payroll_day,
        application_status=ApplicationStatus.PENDING,
        benefit_active=False,
    )
    db.add(employer)

    ip = request.client.host if request.client else None
    record_consent(db, user.id, "employer_agreement", ip)
    record_consent(db, user.id, "privacy_policy", ip)

    db.commit()
    db.refresh(user)
    db.refresh(employer)

    try:
        send_verification_email(user.email, user.full_name, token)
    except Exception as e:
        print(f"[EMAIL] Verification email failed: {e}")

    return EmployerRegisterResponse(
        user_id=user.id,
        employer_id=employer.id,
        company_name=employer.company_name,
        application_status=employer.application_status.value,
    )


@router.post("/merchant", response_model=MerchantRegisterResponse)
def register_merchant(payload: MerchantRegisterRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the Merchant Agreement and Privacy Policy to register")

    user, token = _create_base_user(
        db, payload.email, payload.password, payload.full_name, payload.phone, UserRole.MERCHANT
    )

    merchant = Merchant(
        user_id=user.id,
        business_name=payload.business_name,
        owner_name=payload.owner_name,
        business_address=payload.business_address,
        postcode=payload.postcode,
        category=payload.category,
        registration_number=payload.registration_number,
        payout_account_name=payload.payout_account_name,
        payout_account_number=payload.payout_account_number,
        payout_sort_code=payload.payout_sort_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        application_status=ApplicationStatus.PENDING,
        payments_enabled=False,
        payouts_enabled=False,
    )
    db.add(merchant)

    ip = request.client.host if request.client else None
    record_consent(db, user.id, "merchant_agreement", ip)
    record_consent(db, user.id, "privacy_policy", ip)

    db.commit()
    db.refresh(user)
    db.refresh(merchant)

    try:
        send_verification_email(user.email, user.full_name, token)
    except Exception as e:
        print(f"[EMAIL] Verification email failed: {e}")

    return MerchantRegisterResponse(
        user_id=user.id,
        merchant_id=merchant.id,
        business_name=merchant.business_name,
        application_status=merchant.application_status.value,
    )


@router.get("/employers/lookup", response_model=List[EmployerLookupResult])
def lookup_employers(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """
    Powers the employer picker on the employee registration form. Only
    returns APPROVED employers — an employee can't accidentally (or
    deliberately) attach themselves to a still-pending or rejected
    employer application.
    """
    results = (
        db.query(Employer)
        .filter(Employer.application_status == ApplicationStatus.APPROVED)
        .filter(Employer.company_name.ilike(f"%{q}%"))
        .limit(10)
        .all()
    )
    return [EmployerLookupResult(id=e.id, company_name=e.company_name) for e in results]


@router.post("/employee", response_model=EmployeeRegisterResponse)
def register_employee(payload: EmployeeRegisterRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the Employee Terms and Privacy Policy to register")

    employer = db.query(Employer).filter(Employer.id == payload.employer_id).first()
    if not employer or employer.application_status != ApplicationStatus.APPROVED:
        # Deliberately vague — don't reveal whether the employer_id exists
        # but is unapproved vs. doesn't exist at all.
        raise HTTPException(status_code=400, detail="Selected employer is not available for registration")

    user, token = _create_base_user(
        db, payload.email, payload.password, payload.full_name, payload.phone, UserRole.EMPLOYEE
    )

    profile = EmployeeProfile(
        user_id=user.id,
        employer_id=employer.id,
        work_email=payload.work_email,
        employee_number=payload.employee_number,
        department=payload.department,
        job_title=payload.job_title,
        application_status=ApplicationStatus.PENDING,
    )
    db.add(profile)

    ip = request.client.host if request.client else None
    record_consent(db, user.id, "employee_terms", ip)
    record_consent(db, user.id, "privacy_policy", ip)

    db.commit()
    db.refresh(user)
    db.refresh(profile)

    try:
        send_verification_email(user.email, user.full_name, token)
    except Exception as e:
        print(f"[EMAIL] Verification email failed: {e}")

    return EmployeeRegisterResponse(
        user_id=user.id,
        employee_profile_id=profile.id,
        employer_id=employer.id,
        application_status=profile.application_status.value,
    )
