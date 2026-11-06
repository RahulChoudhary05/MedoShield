"""Secure doctor <-> patient messaging.

Threads are keyed by (patient_id, doctor_id) - in the old build every doctor of a
patient could read every other doctor's conversation. Media (voice notes, files)
is stored privately and streamed only to the two participants.
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response

from app.core.audit import notify_doctor, notify_patient
from app.core.config import settings
from app.core.deps import Principal, doctor_has_patient, require_any
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, is_oid, parse_oid, to_json
from app.db.database import get_db
from app.schemas import ChatSend
from app.services.storage import AUDIO_TYPES, DOC_TYPES, load_media, read_limited, resolve_private, safe_display_name, save_media, sniff
from fastapi import UploadFile

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _thread(p: Principal, other_id: str) -> tuple[str, str]:
    """Resolve (patient_id, doctor_id) for the caller and the counterpart, enforcing an active care link."""
    if not is_oid(other_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    if p.is_patient:
        patient_id, doctor_id = p.patient_id, other_id
    else:
        patient_id, doctor_id = other_id, p.user_id
    if not await doctor_has_patient(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="Messaging opens once a doctor accepts your appointment")
    return patient_id, doctor_id


def _public(m: dict) -> dict:
    out = {k: m.get(k) for k in ("_id", "patient_id", "doctor_id", "sender_role", "content", "msg_type", "file_name", "created_at")}
    if m.get("media_id") or m.get("media_path"):
        out["media_url"] = f"/api/chat/media/{m['_id']}"
    return to_json(out)


@router.get("/threads")
async def threads(p: Principal = Depends(require_any)):
    db = get_db()
    key = "patient_id" if p.is_patient else "doctor_id"
    me = p.patient_id if p.is_patient else p.user_id
    links = await db["patient_doctor_assignments"].find({key: me, "is_active": True}).to_list(200)
    out = []
    for l in links:
        other = l["doctor_id"] if p.is_patient else l["patient_id"]
        if not is_oid(other):
            continue
        coll = "doctors" if p.is_patient else "patients"
        person = await db[coll].find_one({"_id": parse_oid(other)})
        if not person:
            continue
        last = await db["chat_messages"].find_one({"patient_id": l["patient_id"], "doctor_id": l["doctor_id"]}, sort=[("created_at", -1)])
        unread_field = "read_by_patient" if p.is_patient else "read_by_doctor"
        other_role = "doctor" if p.is_patient else "patient"
        unread = await db["chat_messages"].count_documents({"patient_id": l["patient_id"], "doctor_id": l["doctor_id"],
                                                            "sender_role": other_role, unread_field: False})
        out.append({"id": other, "name": full_name(person, "Dr. " if p.is_patient else ""),
                    "subtitle": person.get("specialty") if p.is_patient else person.get("email"),
                    "last_message": (last or {}).get("content") or ("Attachment" if last else None),
                    "last_at": (last or {}).get("created_at"), "unread": unread})
    out.sort(key=lambda t: str(t.get("last_at") or ""), reverse=True)
    return to_json({"threads": out})


@router.get("/{other_id}/messages")
async def messages(other_id: str, before: Optional[str] = None, limit: int = Query(60, ge=1, le=200), p: Principal = Depends(require_any)):
    patient_id, doctor_id = await _thread(p, other_id)
    db = get_db()
    q: dict = {"patient_id": patient_id, "doctor_id": doctor_id}
    if before and is_oid(before):
        q["_id"] = {"$lt": parse_oid(before)}
    rows = await db["chat_messages"].find(q).sort("created_at", -1).to_list(limit)
    other_role = "doctor" if p.is_patient else "patient"
    await db["chat_messages"].update_many({"patient_id": patient_id, "doctor_id": doctor_id, "sender_role": other_role},
                                          {"$set": {"read_by_patient" if p.is_patient else "read_by_doctor": True}})
    return {"messages": [_public(m) for m in reversed(rows)]}


async def _store(p: Principal, patient_id: str, doctor_id: str, doc: dict) -> dict:
    doc.update({"patient_id": patient_id, "doctor_id": doctor_id, "sender_id": p.user_id, "sender_role": p.role,
                "created_at": utcnow(), "read_by_patient": p.is_patient, "read_by_doctor": p.is_doctor})
    res = await get_db()["chat_messages"].insert_one(doc)
    doc["_id"] = res.inserted_id
    preview = (doc.get("content") or "Sent an attachment")[:90]
    if p.is_doctor:
        await notify_patient(patient_id, f"Message from {full_name(p.doc, 'Dr. ')}", preview, "chat")
    else:
        await notify_doctor(doctor_id, f"Message from {full_name(p.doc)}", preview, "chat")
    return _public(doc)


@router.post("/{other_id}/messages", status_code=201)
@limiter.limit("60/minute")
async def send(request: Request, other_id: str, body: ChatSend, p: Principal = Depends(require_any)):
    patient_id, doctor_id = await _thread(p, other_id)
    return await _store(p, patient_id, doctor_id, {"content": body.content, "msg_type": "text"})


@router.post("/{other_id}/media", status_code=201)
@limiter.limit("20/hour")
async def send_media(request: Request, other_id: str, file: UploadFile = File(...), kind: str = Form("voice", pattern="^(voice|file)$"),
                     p: Principal = Depends(require_any)):
    patient_id, doctor_id = await _thread(p, other_id)
    data = await read_limited(file, settings.MAX_MEDIA_MB)
    mime, ext = sniff(data, AUDIO_TYPES if kind == "voice" else DOC_TYPES)
    # Stored in MongoDB (not on disk): Render's free instances have an ephemeral filesystem.
    media_id = await save_media(data, mime, owner=patient_id)
    return await _store(p, patient_id, doctor_id, {"content": "", "msg_type": kind, "media_id": media_id, "mime": mime,
                                                   "file_name": safe_display_name(file.filename, f"{kind}.{ext}")})


@router.get("/media/{message_id}")
async def media(message_id: str, p: Principal = Depends(require_any)):
    m = await get_db()["chat_messages"].find_one({"_id": parse_oid(message_id, "file")})
    if not m or not (m.get("media_id") or m.get("media_path")):
        raise HTTPException(status_code=404, detail="File not found")
    mine = (p.is_patient and m["patient_id"] == p.patient_id) or (p.is_doctor and m["doctor_id"] == p.user_id)
    if not mine or not await doctor_has_patient(m["doctor_id"], m["patient_id"]):
        raise HTTPException(status_code=404, detail="File not found")
    name = m.get("file_name") or "attachment"
    headers = {"Cache-Control": "private, no-store", "Content-Disposition": f'inline; filename="{name}"', "X-Content-Type-Options": "nosniff"}
    if m.get("media_id"):
        data, mime = await load_media(m["media_id"])
        return Response(content=data, media_type=mime, headers=headers)
    path = resolve_private(m["media_path"])  # legacy files saved on disk by older builds
    return FileResponse(path, filename=name, headers=headers)
