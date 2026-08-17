# backend/app/core/config.py
"""
Central place for environment-driven settings.
Mirrors the pattern used in RoscaApp: values come from a .env file
locally, and from real environment variables on the VPS.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- Database ---
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://eeb_user:eeb_password@localhost:5432/eeb_db",
    )

    # --- Auth / JWT ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-.env")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # --- Frontend origin (for password reset / verification links) ---
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173"
    ).split(",")

    # --- Transaction code settings (merchant/employee approval flow) ---
    TRANSACTION_CODE_LENGTH: int = int(os.getenv("TRANSACTION_CODE_LENGTH", "5"))
    DYNAMIC_QR_TTL_SECONDS: int = int(os.getenv("DYNAMIC_QR_TTL_SECONDS", "45"))

    # --- Location matching tolerance for QR approval (metres) ---
    LOCATION_MATCH_RADIUS_METERS: int = int(os.getenv("LOCATION_MATCH_RADIUS_METERS", "150"))


settings = Settings()
