# backend/app/routers/profile.py
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileView, ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["Profile"])

# Relative to wherever uvicorn is run from (backend/), matching the rest
# of the project's convention. Created on import so the static mount in
# main.py always has a real directory to serve, even before any upload.
UPLOAD_DIR = Path("uploads/profile_photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def _to_view(user: User) -> ProfileView:
    photo_url = f"/static/profile_photos/{user.profile_photo_filename}" if user.profile_photo_filename else None
    return ProfileView(
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role.value,
        photo_url=photo_url,
    )


@router.get("/me", response_model=ProfileView)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return _to_view(current_user)


@router.put("/me", response_model=ProfileView)
def update_my_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.full_name = payload.full_name
    current_user.phone = payload.phone
    db.commit()
    db.refresh(current_user)
    return _to_view(current_user)


@router.post("/photo", response_model=ProfileView)
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Photo must be a JPEG, PNG, or WEBP image")

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be smaller than 5MB")

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    filename = f"{uuid.uuid4()}.{extension}"

    # Remove the previous photo file, if any, so replacing a photo doesn't
    # leave orphaned files accumulating on disk.
    if current_user.profile_photo_filename:
        old_path = UPLOAD_DIR / current_user.profile_photo_filename
        if old_path.exists():
            old_path.unlink()

    with open(UPLOAD_DIR / filename, "wb") as f:
        f.write(contents)

    current_user.profile_photo_filename = filename
    db.commit()
    db.refresh(current_user)
    return _to_view(current_user)


@router.delete("/photo", response_model=ProfileView)
def delete_profile_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.profile_photo_filename:
        old_path = UPLOAD_DIR / current_user.profile_photo_filename
        if old_path.exists():
            old_path.unlink()
        current_user.profile_photo_filename = None
        db.commit()
        db.refresh(current_user)
    return _to_view(current_user)
