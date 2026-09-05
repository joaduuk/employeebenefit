# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app import models  # noqa: F401 — registers all tables on Base.metadata
from app.routers import auth, registration, admin, profile, contact
from app.routers import employer as employer_router
from app.routers import merchant as merchant_router, employee as employee_router
from app.services.payroll_scheduler import start_scheduler as start_payroll_scheduler
from app.services.merchant_settlement_scheduler import start_scheduler as start_merchant_settlement_scheduler



# Day 1: create tables directly. Once the schema starts changing
# (Employer, Merchant, Employee, Transaction models), switch to
# Alembic migrations instead of relying on create_all — the alembic/
# folder is already scaffolded and ready for `alembic revision --autogenerate`.

#  Base.metadata.create_all(bind=engine)

app = FastAPI(title="EEB — Employee Essential Benefit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves uploaded profile photos — directory is created on import by
# routers/profile.py, so it always exists by the time this mount runs.
Path("uploads/profile_photos").mkdir(parents=True, exist_ok=True)
app.mount("/static/profile_photos", StaticFiles(directory="uploads/profile_photos"), name="profile_photos")

app.include_router(auth.router)
app.include_router(registration.router)
app.include_router(admin.router)
app.include_router(employer_router.router)
app.include_router(merchant_router.router)
app.include_router(employee_router.router)
app.include_router(profile.router)
app.include_router(contact.router)


@app.on_event("startup")
def _on_startup():
    # Automatically closes billing cycles whose payroll_deduction_date has
    # arrived, and generates due merchant settlements for completed
    # calendar months — see services/payroll_scheduler.py and
    # services/merchant_settlement_scheduler.py. Note: under
    # `uvicorn --reload`, this can re-run on every code change during
    # development; both schedulers guard against double-starting
    # themselves, and the "run once immediately" checks are idempotent.
    start_payroll_scheduler()
    start_merchant_settlement_scheduler()


@app.get("/")
def root():
    return {"status": "ok", "service": "eeb-api"}