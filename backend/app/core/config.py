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
    # CRITICAL for production: must be https://eebapp.com on the server's
    # .env, or every verification/reset link sent by email will point at
    # localhost and be broken for real users.
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

    # --- Email / SMTP (Hostinger mailbox for admin@eebapp.com) ---
    # EMAIL_ENABLED defaults to false so local development keeps printing
    # to console like before, with no risk of accidentally sending real
    # email while testing — only the production .env sets this to true.
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.hostinger.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "admin@eebapp.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "EEB")

    # --- Address lookup (Homedata — https://homedata.co.uk) ---
    # Free tier: 100 calls/month, no card required. Kept server-side —
    # see services/address_lookup.py — never exposed to the frontend.
    HOMEDATA_API_KEY: str = os.getenv("HOMEDATA_API_KEY", "")


settings = Settings()
