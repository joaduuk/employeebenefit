# backend/app/schemas/contact.py
from pydantic import BaseModel, EmailStr
from typing import Optional


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    category: str = "general"  # "general", "dispute", "technical", "other"
    transaction_reference: Optional[str] = None  # only meaningful when category == "dispute"
    message: str
    # Honeypot — a hidden field on the frontend that real users never see
    # or fill in. If it arrives non-empty, the submission is from a bot;
    # we silently pretend success rather than revealing the trap.
    honeypot: Optional[str] = None
