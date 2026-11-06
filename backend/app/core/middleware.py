"""HTTP hardening middleware: security headers, request ids, body size cap."""
from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings
from app.core.net import from_trusted_proxy

log = logging.getLogger("medoshield.http")

_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
# Swagger UI needs its CDN assets; only used when docs are enabled (non-production).
_DOCS_CSP = (
    "default-src 'self'; img-src 'self' data: https://fastapi.tiangolo.com; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Optional origin lock: only accept API traffic that came through the Cloudflare proxy.
        if settings.REQUIRE_PROXY_SECRET and request.url.path.startswith("/api/") and not from_trusted_proxy(request):
            return JSONResponse({"detail": "Direct access is not allowed"}, status_code=403)
        request_id = request.headers.get("x-request-id", "")[:64] or uuid.uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000

        path = request.url.path
        h = response.headers
        h["X-Request-ID"] = request_id
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "DENY"
        h["Referrer-Policy"] = "no-referrer"
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        h["Cross-Origin-Opener-Policy"] = "same-origin"
        h["Cross-Origin-Resource-Policy"] = "same-site"
        h["X-Permitted-Cross-Domain-Policies"] = "none"
        h["Content-Security-Policy"] = _DOCS_CSP if path in ("/docs", "/redoc") else _API_CSP
        if settings.is_production:
            h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        if path.startswith("/api/"):
            h.setdefault("Cache-Control", "no-store")
        if "server" in h:
            del h["server"]

        log.info("%s %s -> %s %.0fms rid=%s", request.method, path, response.status_code, elapsed_ms, request_id)
        return response


class BodySizeLimitMiddleware:
    """Reject bodies above MAX_REQUEST_BYTES, including chunked uploads without Content-Length."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = dict(scope.get("headers") or {}).get(b"content-length")
        if declared is not None:
            try:
                if int(declared) > self.max_bytes:
                    await JSONResponse({"detail": "Request body too large"}, status_code=413)(scope, receive, send)
                    return
            except ValueError:
                await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, send)
                return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await JSONResponse({"detail": "Request body too large"}, status_code=413)(scope, receive, send)


class _BodyTooLarge(Exception):
    pass
