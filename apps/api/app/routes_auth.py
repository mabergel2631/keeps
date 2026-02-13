import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password, verify_password, create_access_token
from .config import settings
from .db import get_db
from .email import send_reset_email
from .models import User, PasswordReset
from .schemas import UserCreate, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token(user.id))


# ── Password reset ────────────────────────────────────


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        reset = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(reset)
        db.commit()
        reset_url = f"{settings.app_url}/reset-password?token={token}"
        await send_reset_email(user.email, reset_url)
    # Always return success to prevent email enumeration
    return {"ok": True, "message": "If an account exists with that email, we've sent a reset link."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    reset = db.execute(
        select(PasswordReset).where(
            PasswordReset.token == payload.token,
            PasswordReset.used == False,  # noqa: E712
        )
    ).scalar_one_or_none()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired")

    user = db.get(User, reset.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(payload.password)
    reset.used = True
    db.commit()
    return {"ok": True}
