# backend/app/routers/contact.py
from fastapi import APIRouter, HTTPException

from app.schemas.contact import ContactFormRequest
from app.core.email import send_contact_form_email

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("")
def submit_contact_form(payload: ContactFormRequest):
    # Honeypot tripped — this is a bot. Pretend success so it doesn't
    # learn the trap exists, but don't actually send anything.
    if payload.honeypot:
        return {"message": "Thanks — we'll be in touch."}

    try:
        send_contact_form_email(
            payload.name, payload.email, payload.message,
            category=payload.category, transaction_reference=payload.transaction_reference,
        )
    except Exception as e:
        print(f"[EMAIL] Contact form email failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send your message. Please try again or email us directly.",
        )

    return {"message": "Thanks — we'll be in touch."}
