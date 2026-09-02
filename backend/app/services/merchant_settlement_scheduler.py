# backend/app/services/merchant_settlement_scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.services.merchant_settlements import generate_due_settlements

_scheduler = None


def _run_generation():
    db = SessionLocal()
    try:
        created = generate_due_settlements(db)
        for s in created:
            print(
                f"[merchant_settlement_scheduler] Generated settlement for merchant "
                f"{s.merchant_id}, period {s.period_month}/{s.period_year}: £{s.total_amount}, "
                f"due {s.due_date}."
            )
    finally:
        db.close()


def start_scheduler():
    """
    Mirrors payroll_scheduler.start_scheduler — guarded against double-start
    under uvicorn --reload, runs once immediately (so testing doesn't
    require waiting for a real month boundary), then checks daily.
    """
    global _scheduler
    if _scheduler is not None:
        return

    _run_generation()

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(_run_generation, "interval", hours=24, id="generate_due_merchant_settlements")
    _scheduler.start()
