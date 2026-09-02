# backend/app/models/__init__.py
"""
Importing every model here ensures they're all registered on Base.metadata
before app.main calls Base.metadata.create_all(). Without this, a model
file that's never imported anywhere just silently never gets its table
created — this file exists purely to prevent that.
"""
from app.models.approval import ApplicationStatus, ApprovalAuditMixin
from app.models.user import User, UserRole
from app.models.employer import Employer, PayrollFrequency
from app.models.employee_profile import EmployeeProfile
from app.models.merchant import Merchant, MerchantCategory
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.transaction import Transaction, TransactionMethod, TransactionStatus, TransactionPurchaseTag, generate_transaction_code
from app.models.merchant_settlement import MerchantSettlement, MerchantSettlementStatus

__all__ = [
    "ApplicationStatus", "ApprovalAuditMixin",
    "User", "UserRole",
    "Employer", "PayrollFrequency",
    "EmployeeProfile",
    "Merchant", "MerchantCategory",
    "BillingCycle", "BillingCycleStatus",
    "Transaction", "TransactionMethod", "TransactionStatus", "TransactionPurchaseTag", "generate_transaction_code",
    "MerchantSettlement", "MerchantSettlementStatus",
]