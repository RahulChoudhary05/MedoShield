"""Append-only audit trail and in-app notifications."""
from __future__ import annotations

import logging
from typing import Any, Optional

from starlette.requests import Request

from app.core.net import client_ip
from app.core.security import utcnow
from app.core.utils import mongo_safe
from app.db.database import get_db

log = logging.getLogger("medoshield.audit")


def _client_ip(request: Optional[Request]) -> Optional[str]:
    return client_ip(request) if request is not None else None


async def audit(action: str, *, actor_id: str | None, role: str | None, request: Request | None = None,
                target: str | None = None, meta: dict[str, Any] | None = None, outcome: str = "success") -> None:
    try:
        await get_db()["audit_log"].insert_one(mongo_safe({
            "action": action,
            "actor_id": actor_id,
            "role": role,
            "target": target,
            "outcome": outcome,
            "ip": _client_ip(request),
            "user_agent": (request.headers.get("user-agent", "")[:200] if request else None),
            "request_id": getattr(getattr(request, "state", None), "request_id", None),
            "meta": meta or {},
            "created_at": utcnow(),
        }))
    except Exception as exc:  # auditing must never break the request
        log.warning("audit write failed: %s", exc)


async def security_event(kind: str, request: Request | None, detail: dict[str, Any]) -> None:
    try:
        await get_db()["security_events"].insert_one(mongo_safe({
            "kind": kind, "ip": _client_ip(request), "detail": detail, "created_at": utcnow(),
        }))
    except Exception:
        pass


async def notify_patient(patient_id: str, title: str, message: str, category: str) -> None:
    await get_db()["notifications"].insert_one({
        "patient_id": patient_id, "title": title[:120], "message": message[:400],
        "category": category, "is_read": False, "created_at": utcnow(),
    })


async def notify_doctor(doctor_id: str, title: str, message: str, category: str) -> None:
    await get_db()["doctor_notifications"].insert_one({
        "doctor_id": doctor_id, "title": title[:120], "message": message[:400],
        "category": category, "is_read": False, "created_at": utcnow(),
    })
