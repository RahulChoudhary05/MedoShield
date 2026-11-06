"""Password hashing and token primitives.

* Passwords: Argon2id (OWASP recommended). Legacy bcrypt hashes from the old
  build still verify and are transparently upgraded on next login.
* Access tokens: short-lived JWT (HS256) with iss/aud/iat/nbf/jti/type claims.
* Refresh tokens: opaque random strings; only their SHA-256 digest is stored,
  rotated on every use with family-wide revocation on reuse.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)
# Pre-computed hash used to equalise timing when an account does not exist.
_DUMMY_HASH = _ph.hash(secrets.token_urlsafe(16))

COMMON_PASSWORDS = {
    "password", "password1", "password123", "123456789", "12345678", "qwerty123",
    "letmein", "welcome1", "iloveyou", "admin123", "abc12345", "passw0rd",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Passwords ───────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, stored_hash: Optional[str]) -> Tuple[bool, bool]:
    """Return (is_valid, needs_rehash). Always spends comparable time."""
    if not stored_hash:
        try:
            _ph.verify(_DUMMY_HASH, password)
        except Exception:
            pass
        return False, False

    if stored_hash.startswith("$argon2"):
        try:
            _ph.verify(stored_hash, password)
            return True, _ph.check_needs_rehash(stored_hash)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False, False

    if stored_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            ok = bcrypt.checkpw(password.encode("utf-8")[:72], stored_hash.encode("utf-8"))
        except ValueError:
            ok = False
        return ok, ok  # always migrate bcrypt -> argon2

    return False, False


def password_policy_errors(password: str, *, email: str = "", name: str = "") -> list[str]:
    errors = []
    if len(password) < 10:
        errors.append("at least 10 characters")
    if len(password) > 128:
        errors.append("at most 128 characters")
    if not re.search(r"[a-z]", password):
        errors.append("a lowercase letter")
    if not re.search(r"[A-Z]", password):
        errors.append("an uppercase letter")
    if not re.search(r"\d", password):
        errors.append("a number")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("a symbol")
    lowered = password.lower()
    if lowered in COMMON_PASSWORDS:
        errors.append("not be a commonly used password")
    local = (email or "").split("@")[0].lower()
    if local and len(local) >= 4 and local in lowered:
        errors.append("not contain your email")
    if name and len(name) >= 4 and name.lower() in lowered:
        errors.append("not contain your name")
    return errors


# ── JWT access tokens ───────────────────────────────────────────────────
def create_access_token(subject: str, role: str, session_id: str, extra: Optional[Dict[str, Any]] = None) -> Tuple[str, int]:
    now = utcnow()
    ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    claims: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "sid": session_id,
        "type": "access",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(seconds=ttl),
        "jti": uuid.uuid4().hex,
    }
    if extra:
        claims.update(extra)
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM), ttl


def decode_access_token(token: str) -> Dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],  # pinned: blocks alg=none / alg confusion
        audience=settings.JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
        options={"require": ["exp", "iat", "nbf", "sub", "role", "type", "jti", "sid"]},
        leeway=10,
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    if payload.get("role") not in ("patient", "doctor"):
        raise jwt.InvalidTokenError("unknown role")
    return payload


# ── Opaque refresh tokens ───────────────────────────────────────────────
def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def digest_token(token: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), token.encode(), hashlib.sha256).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
