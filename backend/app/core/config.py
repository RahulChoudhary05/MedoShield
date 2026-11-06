"""Application settings.

Every secret comes from the environment (or backend/.env). Nothing sensitive is
hard-coded here: production refuses to boot with weak or missing secrets.
"""
from __future__ import annotations

import logging
import secrets
from functools import lru_cache
from pathlib import Path
from typing import List, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

log = logging.getLogger("medoshield.config")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Runtime ────────────────────────────────────────────────────────────
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    DEBUG: bool = False
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    APP_NAME: str = "MedoShield AI"
    APP_VERSION: str = "3.0.0"

    # ── Database ───────────────────────────────────────────────────────────
    MONGODB_URL: str = ""
    MONGODB_DB: str = "neuro_shield"
    # In dev/test the API falls back to an in-memory Mongo when Atlas is unreachable.
    ALLOW_INMEMORY_DB: bool = True

    # ── Auth / tokens ──────────────────────────────────────────────────────
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "medoshield-api"
    JWT_AUDIENCE: str = "medoshield-web"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_NAME: str = "ms_refresh"
    COOKIE_SECURE: bool | None = None  # default: True outside development
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_DOMAIN: str | None = None
    MAX_FAILED_LOGINS: int = 5
    LOCKOUT_MINUTES: int = 15

    # ── HTTP hardening ─────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    TRUSTED_HOSTS: str = "*"
    MAX_REQUEST_BYTES: int = 60 * 1024 * 1024
    RATE_LIMIT_DEFAULT: str = "240/minute"
    RATE_LIMIT_STORAGE_URI: str = "memory://"
    ENABLE_DOCS: bool | None = None  # default: off in production
    # Cloudflare Pages Function -> Render: the proxy signs requests with this shared secret so the
    # API can trust the real visitor IP it forwards (rate limits, lockouts, audit) and, optionally,
    # refuse traffic that bypassed Cloudflare.
    PROXY_SHARED_SECRET: str = ""
    REQUIRE_PROXY_SECRET: bool = False

    # ── Database keep-alive ────────────────────────────────────────────────
    DB_HEARTBEAT_SECONDS: int = 240   # ping Atlas regularly; reconnect automatically if it drops

    # ── AI ─────────────────────────────────────────────────────────────────
    # "auto" = Grok when XAI_API_KEY is set, else Gemini. The other provider (if keyed) is the fallback.
    LLM_PROVIDER: Literal["auto", "grok", "gemini"] = "auto"
    XAI_API_KEY: str = ""
    XAI_BASE_URL: str = "https://api.x.ai/v1"
    GROK_MODEL: str = "grok-4.7"
    GROK_REASONING_EFFORT: str = "low"  # "" to omit; lower = faster replies
    GEMINI_API_KEY: str = ""            # optional: also enables AI *video* review (Grok has no video input)
    GEMINI_MODEL: str = "gemini-2.5-flash"
    LLM_TIMEOUT_SECONDS: float = 60.0
    AI_MAX_INPUT_CHARS: int = 2000
    AI_MAX_HISTORY_TURNS: int = 12

    # ── Signal processing ─────────────────────────────────────────────────
    FFT_SAMPLE_RATE: float = 30.0
    BASELINE_SESSIONS: int = 5
    DEVIATION_THRESHOLD: float = 2.5
    MAX_POSE_FRAMES: int = 1800

    # ── Files ──────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    MAX_PDF_MB: int = 15
    MAX_VIDEO_MB: int = 40
    MAX_MEDIA_MB: int = 10
    HEALTHCARE_DATASET_CSV: str = str(PROJECT_ROOT / "healthcare_dataset.csv")

    # ── SOS / SMS (optional) ──────────────────────────────────────────────
    SOS_DEFAULT_NUMBER: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # ── Seeding ────────────────────────────────────────────────────────────
    SEED_DEMO_DATA: bool = False
    DEMO_PASSWORD: str = Field(default="", description="Password for seeded demo accounts")

    # ------------------------------------------------------------------
    @field_validator("GEMINI_MODEL")
    @classmethod
    def _upgrade_retired_models(cls, v: str) -> str:
        # gemini-1.0/1.5 endpoints are retired; quietly move to the supported family.
        if v.startswith(("gemini-1.0", "gemini-1.5", "gemini-pro")):
            return "gemini-2.5-flash"
        return v

    @model_validator(mode="after")
    def _derive_and_guard(self) -> "Settings":
        prod = self.ENVIRONMENT == "production"
        if self.COOKIE_SECURE is None:
            self.COOKIE_SECURE = self.ENVIRONMENT not in ("development", "test")
        if self.ENABLE_DOCS is None:
            self.ENABLE_DOCS = not prod
        if self.COOKIE_SAMESITE == "none":
            self.COOKIE_SECURE = True  # browsers reject SameSite=None without Secure

        weak = {"", "your-secret-key-change-in-production", "changeme", "secret"}
        if self.SECRET_KEY in weak or len(self.SECRET_KEY) < 32:
            if prod:
                raise ValueError("SECRET_KEY must be set to a random value of at least 32 characters in production")
            # Ephemeral key keeps dev usable; tokens simply die on restart.
            self.SECRET_KEY = secrets.token_urlsafe(48)
            log.warning("SECRET_KEY missing/weak - generated an ephemeral development key")
        if prod and not self.MONGODB_URL:
            raise ValueError("MONGODB_URL is required in production")
        if prod:
            self.ALLOW_INMEMORY_DB = False
        return self

    # ------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cors_origins(self) -> List[str]:
        origins = []
        for raw in [*self.ALLOWED_ORIGINS.split(","), self.FRONTEND_URL]:
            o = (raw or "").strip().strip("\"'[] ").rstrip("/")
            if o and o != "*" and o not in origins:
                origins.append(o)
        return origins

    @property
    def trusted_hosts(self) -> List[str]:
        return [h.strip() for h in self.TRUSTED_HOSTS.split(",") if h.strip()] or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
