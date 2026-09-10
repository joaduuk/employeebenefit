# backend/app/core/email.py
"""
Sends real email via SMTP (Hostinger mailbox for admin@eebapp.com) when
settings.EMAIL_ENABLED is true. Otherwise falls back to printing to the
console, exactly like the original placeholder — so local development
needs no real SMTP credentials and can never accidentally send real email.
"""
import html
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


def _send(to_email: str, subject: str, html_body: str, reply_to: str | None = None) -> None:
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL] (disabled — would send) → {to_email} | {subject}")
        print(html_body)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(html_body, "html"))

    # Port 465 = implicit SSL from the start of the connection (Hostinger's
    # setup). Port 587 = plain connection upgraded via STARTTLS instead —
    # kept as a fallback in case the mailbox config ever changes.
    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1B3A5C; margin-top: 0;">{title}</h2>
      {body_html}
      <p style="color: #8A94A0; font-size: 0.8rem; margin-top: 32px; border-top: 1px solid #E5E9ED; padding-top: 16px;">
        — The EEB Team
      </p>
    </div>
    """


def send_welcome_email(to_email: str, full_name: str) -> None:
    body = _wrap(
        f"Welcome, {full_name}!",
        "<p>Your EEB account is ready. You can now sign in and get started.</p>",
    )
    _send(to_email, "Welcome to EEB", body)


def send_verification_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    body = _wrap(
        "Verify your email",
        f"""
        <p>Hi {full_name}, please confirm your email address to activate your EEB account.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="{link}" style="background: #2F9E6E; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Verify Email</a>
        </p>
        <p style="color: #8A94A0; font-size: 0.8rem;">If the button doesn't work, copy and paste this link: {link}</p>
        """,
    )
    _send(to_email, "Verify your EEB email address", body)


def send_password_reset_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    body = _wrap(
        "Reset your password",
        f"""
        <p>Hi {full_name}, click below to reset your EEB password. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="{link}" style="background: #2F9E6E; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #8A94A0; font-size: 0.8rem;">If you didn't request this, you can safely ignore this email.</p>
        """,
    )
    _send(to_email, "Reset your EEB password", body)


def send_contact_form_email(name: str, email: str, message: str, category: str = "general", transaction_reference: str = None) -> None:
    """
    Sent to EEB's own inbox (settings.SMTP_FROM_EMAIL), not to the person
    who submitted the form — Reply-To is set to their address so replying
    goes straight to them. name/message are HTML-escaped since they're
    unauthenticated user input being embedded in an HTML email body.

    category/transaction_reference let any party (employee, merchant, or
    employer) report a dispute through this same shared form rather than
    needing a separate authenticated submission flow — a platform admin
    reviews it and uses the existing mark-disputed tooling on the actual
    transaction once they've identified it.
    """
    safe_name = html.escape(name)
    safe_message = html.escape(message).replace("\n", "<br>")
    category_labels = {"dispute": "Dispute", "technical": "Technical Issue", "other": "Other", "general": "General Inquiry"}
    category_label = category_labels.get(category, "General Inquiry")

    reference_line = ""
    if category == "dispute" and transaction_reference:
        reference_line = f"<p><strong>Transaction reference given:</strong> {html.escape(transaction_reference)}</p>"

    body = _wrap(
        f"New contact form submission — {category_label}",
        f"""
        <p><strong>From:</strong> {safe_name} ({html.escape(email)})</p>
        <p><strong>Category:</strong> {category_label}</p>
        {reference_line}
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: #F5F7F9; padding: 12px; border-radius: 6px;">{safe_message}</p>
        """,
    )
    subject_prefix = "[DISPUTE] " if category == "dispute" else ""
    _send(settings.SMTP_FROM_EMAIL, f"{subject_prefix}New contact form message from {safe_name}", body, reply_to=email)
