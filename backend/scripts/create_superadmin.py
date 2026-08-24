# backend/scripts/create_superadmin.py
"""
One-off bootstrap script: creates the very first platform_super_admin.

/auth/register now requires an existing platform_super_admin to call it
(platform staff shouldn't be self-registerable), which creates a
chicken-and-egg problem for the first one. Run this script directly
instead — it talks to the database straight, bypassing the API.

Usage (from backend/, with the venv active):
    python scripts/create_superadmin.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from getpass import getpass

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app import models  # noqa: F401 — ensures all tables exist


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("=== Create the first platform_super_admin ===")
    email = input("Email: ").strip()
    full_name = input("Full name: ").strip()
    password = getpass("Password: ")
    confirm = getpass("Confirm password: ")

    if password != confirm:
        print("Passwords don't match. Aborting.")
        return

    if len(password) < 8:
        print("Password must be at least 8 characters. Aborting.")
        return

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"A user with email {email} already exists. Aborting.")
        return

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=UserRole.PLATFORM_SUPER_ADMIN,
        is_verified=True,
        email_valid=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"\nCreated platform_super_admin: {email}")
    print("You can now log in and use it to create further platform staff via POST /auth/register.")


if __name__ == "__main__":
    main()
