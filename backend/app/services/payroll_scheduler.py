# backend/app/services/payroll_scheduler.py
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.models.billing_cycle import BillingCycle, BillingCycleStatus
from app.services.billing_cycles import close_cycle

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
