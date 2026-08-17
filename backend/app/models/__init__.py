# backend/app/models/__init__.py
"""
Importing every model here ensures they're all registered on Base.metadata
before app.main calls Base.metadata.create_all(). Without this, a model
file that's never imported anywhere just silently never gets its table
created — this file exists purely to prevent that.
"""
from app.models.user import User, UserRole
from app.models.employer import Employer, PayrollFrequency, EmployerStatus
from app.models.employee_profile import EmployeeProfile, EmployeeStatus
from app.models.merchant import Merchant, MerchantCategory, MerchantStatus
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.transaction import Transaction, TransactionMethod, TransactionStatus, generate_transaction_code

__all__ = [
    "User", "UserRole",
    "Employer", "PayrollFrequency", "EmployerStatus",
    "EmployeeProfile", "EmployeeStatus",
    "Merchant", "MerchantCategory", "MerchantStatus",
    "BillingCycle", "BillingCycleStatus",
    "Transaction", "TransactionMethod", "TransactionStatus", "generate_transaction_code",
]
