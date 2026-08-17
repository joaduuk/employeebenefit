# backend/app/core/email.py
"""
Placeholder email functions — mirrors the interface used in RoscaApp
(app/core/email.py) so the auth router can call these directly.
Wire up real SMTP/provider credentials here when ready; until then
these just print to the console so the auth flow is testable locally.
"""
from app.core.config import settings


def send_welcome_email(to_email: str, full_name: str) -> None:
    print(f"[EMAIL] Welcome email → {to_email} ({full_name})")


def send_verification_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    print(f"[EMAIL] Verification email → {to_email}\nLink: {link}")


def send_password_reset_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    print(f"[EMAIL] Password reset email → {to_email}\nLink: {link}")
