"""Validated file intake. Files are typed by magic bytes (not by the client's
filename/Content-Type), size-capped, and stored under random names outside any
public static mount. They are served only through authorised endpoints."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Iterable, Tuple

import filetype
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

AUDIO_TYPES = {"audio/webm", "video/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "video/mp4", "audio/x-wav", "audio/wav", "audio/aac", "audio/x-m4a"}
VIDEO_TYPES = {"video/webm", "video/mp4", "video/quicktime", "video/x-matroska"}
DOC_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/webp"}
PDF_TYPES = {"application/pdf"}


async def read_limited(upload: UploadFile, max_mb: int) -> bytes:
    limit = max_mb * 1024 * 1024
    chunks, size = [], 0
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > limit:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File too large (max {max_mb} MB)")
        chunks.append(chunk)
    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The file is empty")
    return data


def sniff(data: bytes, allowed: Iterable[str]) -> Tuple[str, str]:
    """Return (mime, extension) or raise 415. WebM audio is reported as video/webm by libmagic-style sniffers."""
    kind = filetype.guess(data[:8192])
    if kind is None and data[:4] == b"%PDF":
        mime, ext = "application/pdf", "pdf"
    elif kind is None:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported or unrecognised file type")
    else:
        mime, ext = kind.mime, kind.extension
    if mime not in set(allowed):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=f"File type {mime} is not allowed here")
    return mime, ext


def save_private(data: bytes, folder: str, ext: str) -> str:
    base = Path(settings.UPLOAD_DIR).resolve() / folder
    base.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    (base / name).write_bytes(data)
    return f"{folder}/{name}"


def resolve_private(rel: str) -> Path:
    base = Path(settings.UPLOAD_DIR).resolve()
    path = (base / rel).resolve()
    if base not in path.parents or not path.is_file():  # blocks ../ traversal
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return path


def safe_display_name(name: str | None, fallback: str) -> str:
    import re

    name = (name or fallback).replace("\\", "/").split("/")[-1]
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name)[:80]
    return name or fallback


# ── Media stored inside MongoDB ─────────────────────────────────────────
# Render's free tier wipes the local disk on every restart/redeploy, so chat media
# lives in Atlas instead (BSON binary, <= MAX_MEDIA_MB, well under the 16 MB doc limit).
async def save_media(data: bytes, mime: str, owner: str) -> str:
    from bson import Binary

    from app.core.security import utcnow
    from app.db.database import get_db

    res = await get_db()["media_files"].insert_one({"data": Binary(data), "mime": mime, "size": len(data), "owner": owner, "created_at": utcnow()})
    return str(res.inserted_id)


async def load_media(media_id: str) -> Tuple[bytes, str]:
    from app.core.utils import parse_oid
    from app.db.database import get_db

    doc = await get_db()["media_files"].find_one({"_id": parse_oid(media_id, "file")})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return bytes(doc["data"]), doc.get("mime") or "application/octet-stream"
