# backend/scripts/create_test_accounts.py
"""
Creates the employer / merchant / employee test accounts in one pass.

- Bypasses email verification (is_verified=True) so you can log straight
  in without clicking a link — this is just removing friction from
  ACCOUNT CREATION.
- Deliberately leaves application_status = PENDING on all three, so you
  can still exercise the real approval UI (/admin/employers,
  /admin/merchants, /employer/employees) exactly as a real applicant
  would go through it.
- The employee row is attached to the employer created in this same run,
  regardless of the employer's approval status — that FK link is set
  directly here, bypassing the "employer must be APPROVED" check that
  only applies to the live self-registration endpoint.

Run from backend/ with your venv active:
    python scripts/create_test_accounts.py
"""
import sys
import os
from getpass import getpass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.employer import Employer, PayrollFrequency
from app.models.merchant import Merchant, MerchantCategory
from app.models.employee_profile import EmployeeProfile
from app.models.approval import ApplicationStatus


def prompt_password(label: str) -> str:
    while True:
        pw = getpass(f"{label} password: ")
        if len(pw) < 8:
            print("Password must be at least 8 characters.")
            continue
        confirm = getpass(f"{label} password (confirm): ")
        if pw != confirm:
            print("Passwords don't match.")
            continue
        return pw


def make_user(db, email: str, full_name: str, password: str, role: UserRole) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"  User {email} already exists — reusing it.")
        return existing
    user = User(
        email=email,
        full_name=full_name,
        phone=None,
        hashed_password=get_password_hash(password),
        role=role,
        is_verified=True,
        email_valid=True,
    )
    db.add(user)
    db.flush()
    return user


def main():
    db = SessionLocal()
    try:
        print("=== Creating EEB test accounts (employer, merchant, employee) ===\n")

        # --- Employer ---
        print("Employer: admin@roscaapp.com")
        employer_password = prompt_password("Employer")
        employer_user = make_user(db, "admin@roscaapp.com", "Test Employer Admin", employer_password, UserRole.EMPLOYER)

        employer = db.query(Employer).filter(Employer.admin_user_id == employer_user.id).first()
        if not employer:
            employer = Employer(
                admin_user_id=employer_user.id,
                company_name="RoscaApp Ltd (Test)",
                registration_number=None,
                payroll_frequency=PayrollFrequency.MONTHLY,
                payroll_day=25,
                application_status=ApplicationStatus.PENDING,
                benefit_active=False,
            )
            db.add(employer)
            db.flush()
        print(f"  Employer record: {employer.company_name} (status: {employer.application_status.value})\n")

        # --- Merchant ---
        print("Merchant: jackadu80@gmail.com")
        merchant_password = prompt_password("Merchant")
        merchant_user = make_user(db, "jackadu80@gmail.com", "Test Merchant Owner", merchant_password, UserRole.MERCHANT)

        merchant = db.query(Merchant).filter(Merchant.user_id == merchant_user.id).first()
        if not merchant:
            merchant = Merchant(
                user_id=merchant_user.id,
                business_name="Test Corner Shop",
                owner_name="Jack Adu",
                business_address="1 Test Street, London",
                category=MerchantCategory.CONVENIENCE_STORE,
                registration_number=None,
                payout_account_name=None,
                payout_account_number=None,
                payout_sort_code=None,
                latitude=None,
                longitude=None,
                application_status=ApplicationStatus.PENDING,
                payments_enabled=False,
                payouts_enabled=False,
            )
            db.add(merchant)
            db.flush()
        print(f"  Merchant record: {merchant.business_name} (status: {merchant.application_status.value})\n")

        # --- Employee ---
        print("Employee: joaduuk@gmail.com")
        employee_password = prompt_password("Employee")
        employee_user = make_user(db, "joaduuk@gmail.com", "Test Employee", employee_password, UserRole.EMPLOYEE)

        profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == employee_user.id).first()
        if not profile:
            profile = EmployeeProfile(
                user_id=employee_user.id,
                employer_id=employer.id,
                work_email="joaduuk@gmail.com",
                employee_number="TEST-001",
                department="Testing",
                job_title="QA",
                application_status=ApplicationStatus.PENDING,
            )
            db.add(profile)
            db.flush()
        print(f"  Employee record: attached to {employer.company_name} (status: {profile.application_status.value})\n")

        db.commit()
        print("Done. All three are PENDING — approve them through the normal UI:")
        print("  1. Log in as super admin -> /admin/employers -> approve RoscaApp Ltd (Test)")
        print("  2. Log in as super admin -> /admin/merchants -> approve Test Corner Shop")
        print("  3. Log in as admin@roscaapp.com -> /employer/employees -> approve the employee with limits")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()