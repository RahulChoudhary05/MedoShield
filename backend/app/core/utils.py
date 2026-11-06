"""Small shared helpers: ObjectId parsing, Mongo-safe values, JSON serialisation."""
from __future__ import annotations

import math
import re
from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

_OID_RE = re.compile(r"^[0-9a-fA-F]{24}$")


def parse_oid(value: str, what: str = "resource") -> ObjectId:
    """Strictly parse a 24-hex ObjectId; invalid ids are a 404 (no info leak, no 500)."""
    if not isinstance(value, str) or not _OID_RE.match(value):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{what.capitalize()} not found")
    return ObjectId(value)


def is_oid(value: Any) -> bool:
    return isinstance(value, str) and bool(_OID_RE.match(value))


def mongo_safe(value: Any) -> Any:
    """Convert numpy scalars/arrays, NaN/inf and sets into BSON-encodable values."""
    try:  # numpy is optional at import time
        import numpy as np

        if isinstance(value, np.generic):
            value = value.item()
        elif isinstance(value, np.ndarray):
            value = value.tolist()
    except ImportError:  # pragma: no cover
        pass
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    if isinstance(value, dict):
        return {str(k): mongo_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [mongo_safe(v) for v in value]
    return value


def to_json(value: Any) -> Any:
    """Recursively make Mongo documents JSON friendly (ObjectId -> str, datetimes -> ISO-8601Z)."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {("id" if k == "_id" else k): to_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json(v) for v in value]
    return mongo_safe(value)


def full_name(doc: dict | None, prefix: str = "") -> str:
    if not doc:
        return ""
    name = f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip()
    return f"{prefix}{name}".strip() if name else ""


def age_from_dob(dob: Any) -> int | None:
    if not dob:
        return None
    try:
        if isinstance(dob, str):
            dob = datetime.fromisoformat(dob[:10]).date()
        elif isinstance(dob, datetime):
            dob = dob.date()
        today = date.today()
        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return years if 0 <= years <= 130 else None
    except Exception:
        return None


def clean_text(value: str | None, max_len: int = 2000) -> str:
    """Strip control characters (keeps newlines/tabs) and clamp length."""
    if not value:
        return ""
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    return value.strip()[:max_len]
