"""MedoShield AI - FastAPI application factory."""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.ai import llm
from app.core.config import settings
from app.core.middleware import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.db.database import Database
from app.routers import ALL_ROUTERS

# UTF-8 safe logging (the old build crashed on Windows consoles printing emoji).
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
for noisy in ("httpx", "httpcore", "pymongo", "multipart"):
    logging.getLogger(noisy).setLevel(logging.WARNING)
log = logging.getLogger("medoshield")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Database.connect()
    Database.start_heartbeat()
    if settings.SEED_DEMO_DATA or (Database.in_memory and settings.ENVIRONMENT == "development"):
        from app.seed import seed_demo

        await seed_demo()
    log.info("MedoShield API ready (env=%s, ai=%s, db=%s)", settings.ENVIRONMENT, llm.model_name(),
             "in-memory" if Database.in_memory else "mongodb")
    yield
    await Database.stop_heartbeat()
    await llm.close()
    await Database.close()


app = FastAPI(
    title="MedoShield AI API",
    version=settings.APP_VERSION,
    description="Privacy-first neuro-motor monitoring platform: on-device pose analytics, guarded clinical AI and secure care-team collaboration.",
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)

# Middleware order: outermost first in execution = last added.
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Guard", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Content-Disposition"],
    max_age=600,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.MAX_REQUEST_BYTES)
if settings.trusted_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

for r in ALL_ROUTERS:
    app.include_router(r)


# ── Error handling: consistent JSON, no stack traces / internals leaked ──
@app.exception_handler(RateLimitExceeded)
async def _rate_limited(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"detail": "Too many requests - please slow down and try again shortly."}, status_code=429,
                        headers={"Retry-After": "60"})


@app.exception_handler(RequestValidationError)
async def _validation(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors()[:10]:
        loc = ".".join(str(x) for x in e.get("loc", []) if x not in ("body", "query", "path"))
        errors.append({"field": loc, "message": str(e.get("msg", "Invalid value")).replace("Value error, ", "")})
    first = errors[0] if errors else {"field": "", "message": "Invalid request"}
    detail = f"{first['field'].replace('_', ' ').capitalize()}: {first['message']}" if first["field"] else first["message"]
    return JSONResponse({"detail": detail, "errors": errors}, status_code=422)


@app.exception_handler(HTTPException)
async def _http(request: Request, exc: HTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", None)
    log.exception("Unhandled error rid=%s", rid)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again.", "request_id": rid}, status_code=500)


@app.get("/", include_in_schema=False)
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}


@app.get("/health", tags=["system"])
async def health():
    # Each health check (e.g. from the Cloudflare keep-alive cron) also exercises the DB connection.
    db_ok = await Database.ping() or (await Database.reconnect() and await Database.ping())
    return {"status": "ok" if db_ok else "degraded", "database": "ok" if db_ok else "unavailable",
            "storage": "in-memory" if Database.in_memory else "mongodb", "ai": llm.primary() or "rules-only", "ai_model": llm.model_name(), "video_ai": llm.supports_video(),
            "version": settings.APP_VERSION}


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG, server_header=False)
