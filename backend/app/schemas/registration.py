# backend/app/schemas/registration.py
"""
One schema per registration form, matching the onboarding design:
each role captures different details at signup, and the resulting
account starts PENDING with capability turned off until a reviewer
approves it. See app/models/approval.py for the shared status model.
"""
from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional
from decimal import Decimal
from datetime import date

from app.models.employer import PayrollFrequency
from app.models.merchant import MerchantCategory


# --- Shared account fields every registration form needs ---
class _AccountFields(BaseModel):
    email: EmailStr          # login email
    password: str
    full_name: str
    phone: Optional[str] = None
    # Must be explicitly True to register — checked server-side in the
    # endpoint itself, not just enforced by a disabled frontend button.
    # Recorded as a ConsentRecord (see app/services/consent.py) alongside
    # the account it belongs to, in the same transaction.
    agreed_to_terms: bool = False


# --- Employer registration ---
class EmployerRegisterRequest(_AccountFields):
    company_name: str
    registration_number: Optional[str] = None
    payroll_frequency: PayrollFrequency
    payroll_day: int  # day-of-month (1-31) for MONTHLY, weekday (0=Mon..6=Sun) for WEEKLY/FORTNIGHTLY


class EmployerRegisterResponse(BaseModel):
    user_id: UUID4
    employer_id: UUID4
    company_name: str
    application_status: str
    message: str = "Application submitted. You'll be notified once a platform admin reviews it."


# --- Merchant registration ---
class MerchantRegisterRequest(_AccountFields):
    business_name: str
    owner_name: Optional[str] = None
    business_address: Optional[str] = None
    category: MerchantCategory = MerchantCategory.OTHER
    registration_number: Optional[str] = None
    payout_account_name: Optional[str] = None
    payout_account_number: Optional[str] = None
    payout_sort_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MerchantRegisterResponse(BaseModel):
    user_id: UUID4
    merchant_id: UUID4
    business_name: str
    application_status: str
    message: str = "Application submitted. You'll be notified once approved to start accepting payments."


# --- Employee registration ---
class EmployerLookupResult(BaseModel):
    id: UUID4
    company_name: str


class EmployeeRegisterRequest(_AccountFields):
    # The employee picks a real, approved employer from the lookup
    # endpoint rather than typing a free-text company name — this is
    # what actually links them to Employer.id.
    employer_id: UUID4
    work_email: EmailStr
    employee_number: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


class EmployeeRegisterResponse(BaseModel):
    user_id: UUID4
    employee_profile_id: UUID4
    employer_id: UUID4
    application_status: str
    message: str = "Application submitted to your employer for approval."
