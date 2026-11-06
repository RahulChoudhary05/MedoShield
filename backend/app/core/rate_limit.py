"""Rate limiting (slowapi). Keys on authenticated user when known, else client IP."""
from __future__ import annotations

from slowapi import Limiter
from app.core.net import client_ip
from starlette.requests import Request

from app.core.config import settings


def _key(request: Request) -> str:
    principal = getattr(request.state, "principal", None)
    if principal is not None:
        return f"user:{principal.role}:{principal.user_id}"
    return f"ip:{client_ip(request)}"


limiter = Limiter(
    key_func=_key,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
    headers_enabled=False,
    enabled=settings.ENVIRONMENT != "test",
)

def ip_key(request: Request) -> str:
    return client_ip(request)
