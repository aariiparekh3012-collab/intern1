"""Auth & PII protection primitives.

- JWT access tokens (short-lived) + opaque refresh tokens (long-lived, rotatable).
- Symmetric field-level encryption (Fernet) for PII at rest.
- Password hashing via bcrypt.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import secrets

import jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_fernet = Fernet(settings.pii_encryption_key.encode())


# ── passwords ──────────────────────────────────────────────────────────────

def hash_password(raw: str) -> str:
    if len(raw.encode("utf-8")) > 72:
        raw = raw[:72]
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    if len(raw.encode("utf-8")) > 72:
        raw = raw[:72]
    return _pwd.verify(raw, hashed)


# ── JWT access tokens ──────────────────────────────────────────────────────

def create_access_token(subject: str, role: str, user_id: str | None = None) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + dt.timedelta(minutes=settings.jwt_access_ttl_minutes),
    }
    if user_id:
        payload["uid"] = user_id
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])


# ── Refresh tokens ─────────────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """Generate a cryptographically secure random refresh token (64 bytes, hex)."""
    return secrets.token_hex(64)


def hash_token(token: str) -> str:
    """SHA-256 hash of a token for DB storage (never store raw tokens)."""
    return hashlib.sha256(token.encode()).hexdigest()


# ── Email verification / password reset tokens ─────────────────────────────

def generate_verification_token() -> str:
    """Generate a URL-safe token for email verification / password reset."""
    return secrets.token_urlsafe(48)


# ── PII field encryption ──────────────────────────────────────────────────

def encrypt_pii(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_pii(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()
