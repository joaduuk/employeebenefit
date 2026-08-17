# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app import models  # noqa: F401 — registers all tables on Base.metadata
from app.routers import auth

# Day 1: create tables directly. Once the schema starts changing
# (Employer, Merchant, Employee, Transaction models), switch to
# Alembic migrations instead of relying on create_all — the alembic/
# folder is already scaffolded and ready for `alembic revision --autogenerate`.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EEB — Employee Essential Benefit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "eeb-api"}
