# backend/app/core/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: str):
    """
    Usage: Depends(require_roles("platform_super_admin", "employer"))
    Gates an endpoint to specific modules (Platform Admin / Platform Super
    Admin / Employer / Merchant / Employee).
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource",
            )
        return current_user
    return checker


def require_platform_staff():
    """
    Shortcut for endpoints any platform staff member can hit — both
    platform_admin and platform_super_admin. Endpoints that need to be
    restricted to super_admin only (e.g. managing other platform staff
    accounts) should use require_roles("platform_super_admin") directly
    instead of this.
    """
    return require_roles("platform_admin", "platform_super_admin")
