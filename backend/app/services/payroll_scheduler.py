# backend/app/services/payroll_scheduler.py
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.models.employer import Employer
from app.models.user import User
from app.services.billing_cycles import close_cycle
from app.core.email import send_billing_cycle_closed_email

_scheduler = None


def close_due_billing_cycles():
    """
    Finds every OPEN cycle whose payroll_deduction_date has arrived and
    closes it, snapshotting the expected employer payment amount at that
    moment (see services.billing_cycles.close_cycle). Does NOT clear
    employee balances or assume payroll actually ran — it only freezes
    the cycle so a fresh one starts for new spending, and makes it
    eligible for the employer to download a deduction file and later
    confirm payroll deduction — see routers/employer.py.

    Notifies the employer once the cycle is safely committed — same
    notification as the manual "Close Now" button, so it fires
    consistently regardless of which path closed the cycle.
    """
    db = SessionLocal()
    try:
        today = date.today()
        due_cycles = (
            db.query(BillingCycle)
            .filter(BillingCycle.status == BillingCycleStatus.OPEN, BillingCycle.payroll_deduction_date <= today)
            .all()
        )
        for cycle in due_cycles:
            close_cycle(db, cycle)
            print(
                f"[payroll_scheduler] Closed billing cycle {cycle.id} "
                f"(employer {cycle.employer_id}, cycle #{cycle.cycle_number}) — "
                f"expected £{cycle.employer_amount_expected}, deduction file now available."
            )
        if due_cycles:
            db.commit()
            for cycle in due_cycles:
                employer = db.query(Employer).filter(Employer.id == cycle.employer_id).first()
                admin_user = db.query(User).filter(User.id == employer.admin_user_id).first() if employer else None
                if admin_user:
                    try:
                        send_billing_cycle_closed_email(
                            admin_user.email, admin_user.full_name, cycle.cycle_number,
                            cycle.period_start.isoformat(), cycle.period_end.isoformat(), cycle.employer_amount_expected,
                        )
                    except Exception as e:
                        print(f"[EMAIL] cycle closed notification failed: {e}")
    finally:
        db.close()


def start_scheduler():
    """
    Called once from main.py's startup event. Guarded against double-start
    (uvicorn --reload can re-run startup code on every file change during
    development). Runs once immediately so testing doesn't require waiting
    up to 24 hours, then checks daily thereafter.
    """
    global _scheduler
    if _scheduler is not None:
        return

    close_due_billing_cycles()

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(close_due_billing_cycles, "interval", hours=24, id="close_due_billing_cycles")
    _scheduler.start()
