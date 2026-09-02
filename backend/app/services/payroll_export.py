# backend/app/services/payroll_export.py
import csv
import io
import json
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.billing_cycle import BillingCycle
from app.models.transaction import Transaction, TransactionStatus
from app.models.employee_profile import EmployeeProfile
from app.models.user import User
from app.models.employer import Employer


def get_cycle_deduction_breakdown(db: Session, cycle: BillingCycle, employer: Employer) -> dict:
    """
    Per-employee totals for one billing cycle — every APPROVED transaction
    assigned to this cycle, grouped by employee. Shape follows the
    EEB-payroll-file structure discussed with the payroll consultant:
    a canonical dict that CSV/JSON/Excel exports are all derived from.
    """
    rows = (
        db.query(EmployeeProfile, User, Transaction)
        .join(User, EmployeeProfile.user_id == User.id)
        .join(Transaction, Transaction.employee_id == EmployeeProfile.id)
        .filter(
            Transaction.billing_cycle_id == cycle.id,
            Transaction.status == TransactionStatus.APPROVED,
        )
        .all()
    )

    totals: dict = {}
    for profile, user, txn in rows:
        key = str(profile.id)
        if key not in totals:
            totals[key] = {
                "employee_reference": profile.employee_number or str(profile.id),
                "employee_name": user.full_name,
                "eeb_reference": f"EEB-{cycle.cycle_number}-{profile.employee_number or str(profile.id)[:8]}",
                "amount": Decimal("0.00"),
            }
        totals[key]["amount"] += txn.amount

    deductions = list(totals.values())
    total = sum((d["amount"] for d in deductions), Decimal("0.00"))

    return {
        "employer_reference": employer.company_name,
        "cycle_number": cycle.cycle_number,
        "payroll_period": f"{cycle.period_start.isoformat()} to {cycle.period_end.isoformat()}",
        "currency": "GBP",
        "deductions": deductions,
        "total": total,
    }


def breakdown_to_csv(breakdown: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["EmployerReference", "EmployeeReference", "EmployeeName", "PayrollPeriod", "DeductionAmount", "EEBReference"])
    for d in breakdown["deductions"]:
        writer.writerow([
            breakdown["employer_reference"],
            d["employee_reference"],
            d["employee_name"],
            breakdown["payroll_period"],
            f"{d['amount']:.2f}",
            d["eeb_reference"],
        ])
    writer.writerow([])
    writer.writerow(["", "", "", "TOTAL", f"{breakdown['total']:.2f}", ""])
    return output.getvalue()


def breakdown_to_json(breakdown: dict) -> str:
    serializable = {
        **breakdown,
        "deductions": [
            {**d, "amount": float(d["amount"])} for d in breakdown["deductions"]
        ],
        "total": float(breakdown["total"]),
    }
    return json.dumps(serializable, indent=2)
