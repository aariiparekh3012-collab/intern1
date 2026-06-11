"""Authentication endpoints — register, login, refresh, logout, me.

Replaces the dev-only token endpoint with production-ready auth flow.
Dev-token endpoint is kept for backward compatibility in non-production envs.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import DomainError
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    generate_verification_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.infrastructure.db.models_auth import (
    EmailVerificationTokenModel,
    RefreshTokenModel,
    UserModel,
)

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_ROLES = {"compliance", "rm", "investor"}


# ── Schemas ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "investor"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 64:
            raise ValueError("Password must be at most 64 characters")
        return v

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    email_verified: bool
    created_at: str
    last_login_at: str | None


class SessionResponse(BaseModel):
    id: str
    device_info: str | None
    ip_address: str | None
    created_at: str
    is_current: bool = False


class DevTokenRequest(BaseModel):
    subject: str = "demo.user"
    role: str = "compliance"


class DevTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Helpers ───────────────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _issue_tokens(
    user: UserModel,
    db: Session,
    request: Request,
) -> TokenResponse:
    """Create access + refresh token pair."""
    settings = get_settings()
    now = dt.datetime.now(dt.timezone.utc)

    # Access token
    access_token = create_access_token(
        subject=user.email,
        role=user.role,
        user_id=str(user.id),
    )

    # Refresh token
    raw_refresh = generate_refresh_token()
    refresh_model = RefreshTokenModel(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        device_info=request.headers.get("user-agent", "")[:256],
        ip_address=_get_client_ip(request),
        expires_at=now + dt.timedelta(days=settings.jwt_refresh_ttl_days),
        created_at=now,
    )
    db.add(refresh_model)

    # Update last login
    user.last_login_at = now
    user.updated_at = now
    db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_ttl_minutes * 60,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Create a new user account and return tokens."""
    now = dt.datetime.now(dt.timezone.utc)

    # Check if email already taken
    existing = db.scalars(
        select(UserModel).where(UserModel.email == body.email)
    ).first()
    if existing:
        raise DomainError("Email already registered", code="conflict")

    user = UserModel(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.flush()

    # Create email verification token
    raw_token = generate_verification_token()
    verification = EmailVerificationTokenModel(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=now + dt.timedelta(hours=48),
        created_at=now,
    )
    db.add(verification)

    # TODO: send verification email with raw_token

    return _issue_tokens(user, db, request)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email + password, returns token pair."""
    user = db.scalars(
        select(UserModel).where(UserModel.email == body.email)
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise DomainError("Invalid email or password", code="unauthorized")

    if not user.is_active:
        raise DomainError("Account is deactivated", code="forbidden")

    return _issue_tokens(user, db, request)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    """Rotate refresh token — old token is revoked, new pair issued."""
    token_hash = hash_token(body.refresh_token)
    now = dt.datetime.now(dt.timezone.utc)

    token_record = db.scalars(
        select(RefreshTokenModel).where(RefreshTokenModel.token_hash == token_hash)
    ).first()

    if not token_record:
        raise DomainError("Invalid refresh token", code="unauthorized")

    if token_record.is_revoked:
        # Possible token reuse attack — revoke ALL tokens for this user
        db.execute(
            RefreshTokenModel.__table__.update()
            .where(RefreshTokenModel.user_id == token_record.user_id)
            .values(is_revoked=True)
        )
        db.flush()
        raise DomainError("Token reuse detected — all sessions revoked", code="unauthorized")

    if token_record.expires_at < now:
        raise DomainError("Refresh token expired", code="unauthorized")

    # Revoke old token
    token_record.is_revoked = True

    # Load user
    user = db.get(UserModel, token_record.user_id)
    if not user or not user.is_active:
        raise DomainError("Account not found or deactivated", code="unauthorized")

    return _issue_tokens(user, db, request)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    db: Session = Depends(get_db),
):
    """Revoke the current refresh token (sent in body or from last session)."""
    from app.api.dependencies import get_current_user as _get_user

    # Try to get current user from access token
    try:
        from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token_str = auth_header[7:]
            payload = decode_access_token(token_str)
            user_id = payload.get("uid")
            if user_id:
                # Revoke all refresh tokens for this user on this device
                db.execute(
                    RefreshTokenModel.__table__.update()
                    .where(
                        RefreshTokenModel.user_id == uuid.UUID(user_id),
                        RefreshTokenModel.is_revoked == False,
                    )
                    .values(is_revoked=True)
                )
    except Exception:
        pass  # Best effort — token may already be expired

    return None


@router.get("/me", response_model=UserResponse)
def get_me(request: Request, db: Session = Depends(get_db)):
    """Get current user profile from access token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise DomainError("Missing bearer token", code="unauthorized")

    payload = decode_access_token(auth_header[7:])
    user_id = payload.get("uid")

    if not user_id:
        # Legacy dev-token: return basic info from token claims
        return UserResponse(
            id="",
            email=payload.get("sub", ""),
            full_name=payload.get("sub", ""),
            role=payload.get("role", ""),
            is_active=True,
            email_verified=False,
            created_at="",
            last_login_at=None,
        )

    user = db.get(UserModel, uuid.UUID(user_id))
    if not user:
        raise DomainError("User not found", code="not_found")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at.isoformat(),
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
    )


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(request: Request, db: Session = Depends(get_db)):
    """List active sessions for the current user."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise DomainError("Missing bearer token", code="unauthorized")

    payload = decode_access_token(auth_header[7:])
    user_id = payload.get("uid")
    if not user_id:
        return []

    now = dt.datetime.now(dt.timezone.utc)
    tokens = db.scalars(
        select(RefreshTokenModel)
        .where(
            RefreshTokenModel.user_id == uuid.UUID(user_id),
            RefreshTokenModel.is_revoked == False,
            RefreshTokenModel.expires_at > now,
        )
        .order_by(RefreshTokenModel.created_at.desc())
    ).all()

    return [
        SessionResponse(
            id=str(t.id),
            device_info=t.device_info,
            ip_address=t.ip_address,
            created_at=t.created_at.isoformat(),
        )
        for t in tokens
    ]


@router.delete("/sessions/{session_id}", status_code=204)
def revoke_session(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Revoke a specific session (refresh token)."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise DomainError("Missing bearer token", code="unauthorized")

    payload = decode_access_token(auth_header[7:])
    user_id = payload.get("uid")
    if not user_id:
        raise DomainError("Cannot manage sessions with dev token", code="forbidden")

    token = db.get(RefreshTokenModel, uuid.UUID(session_id))
    if not token or str(token.user_id) != user_id:
        raise DomainError("Session not found", code="not_found")

    token.is_revoked = True
    return None


# ── Dev-only (backward compat) ────────────────────────────────────────────

@router.post("/dev-token", response_model=DevTokenResponse)
def dev_token(body: DevTokenRequest) -> DevTokenResponse:
    """Issue a dev token (disabled in production)."""
    if get_settings().is_production:
        raise DomainError("Dev token endpoint is disabled in production", code="forbidden")
    return DevTokenResponse(access_token=create_access_token(body.subject, body.role))
