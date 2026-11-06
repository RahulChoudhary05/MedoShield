"""Fitness/lifestyle logs + AI coach, notifications, and SOS."""

from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai import analysts
from app.core.audit import audit, notify_doctor, notify_patient
from app.core.config import settings
from app.core.deps import Principal, require_any, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, mongo_safe, parse_oid, to_json
from app.db.database import get_db
from app.schemas import FitnessRecord, SOSRequest

router = APIRouter(prefix="/api", tags=["wellbeing"])


# ── Fitness ──────────────────────────────────────────────────────────────
@router.post("/fitness/records", status_code=201)
@limiter.limit("60/hour")
async def add_record(request: Request, body: FitnessRecord, p: Principal = Depends(require_patient)):
    rec = body.model_dump()
    rec["date"] = body.date.isoformat()
    if rec.get("bmi") is None and rec.get("weight_kg"):
        rec["bmi"] = None  # height not stored; client computes BMI
    db = get_db()
    await db["fitness_records"].update_one({"patient_id": p.patient_id, "date": rec["date"]},
                                           {"$set": mongo_safe({**rec, "patient_id": p.patient_id, "updated_at": utcnow()}),
                                            "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
    return to_json(await db["fitness_records"].find_one({"patient_id": p.patient_id, "date": rec["date"]}))


@router.get("/fitness/records")
async def records(patient_id: Optional[str] = None, limit: int = Query(60, ge=1, le=365), p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    rows = await get_db()["fitness_records"].find({"patient_id": str(pat["_id"])}).sort("date", -1).to_list(limit)
    return to_json({"records": rows})


@router.delete("/fitness/records/{record_id}", status_code=204)
async def delete_record(record_id: str, p: Principal = Depends(require_patient)):
    await get_db()["fitness_records"].delete_one({"_id": parse_oid(record_id, "record"), "patient_id": p.patient_id})


@router.post("/fitness/coach")
@limiter.limit("12/hour")
async def coach(request: Request, patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    rows = await get_db()["fitness_records"].find({"patient_id": str(pat["_id"])}).sort("date", -1).to_list(21)
    if len(rows) < 3:
        raise HTTPException(status_code=422, detail="Log at least 3 days to unlock your AI coach")
    result = await analysts.coach_fitness(rows)
    await get_db()["fitness_analyses"].insert_one(mongo_safe({"patient_id": str(pat["_id"]), "result": result, "created_at": utcnow()}))
    return result


# ── Notifications ────────────────────────────────────────────────────────
def _notif_query(p: Principal) -> tuple[str, dict]:
    return ("notifications", {"patient_id": p.patient_id}) if p.is_patient else ("doctor_notifications", {"doctor_id": p.user_id})


@router.get("/notifications")
async def notifications(p: Principal = Depends(require_any)):
    coll, q = _notif_query(p)
    db = get_db()
    rows = await db[coll].find(q).sort("created_at", -1).to_list(40)
    unread = await db[coll].count_documents({**q, "is_read": False})
    return to_json({"notifications": rows, "unread": unread})


@router.post("/notifications/read")
async def mark_read(p: Principal = Depends(require_any)):
    coll, q = _notif_query(p)
    await get_db()[coll].update_many({**q, "is_read": False}, {"$set": {"is_read": True}})
    return {"ok": True}


# ── SOS ──────────────────────────────────────────────────────────────────
async def _send_sms(to: str, body: str) -> tuple[bool, str]:
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        return False, "SMS gateway not configured"
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, data={"To": to, "From": settings.TWILIO_FROM_NUMBER, "Body": body},
                                  auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN))
        return (r.status_code in (200, 201)), ("" if r.status_code in (200, 201) else f"SMS provider error {r.status_code}")
    except httpx.HTTPError:
        return False, "SMS provider unreachable"


@router.post("/sos")
@limiter.limit("5/hour")
async def sos(request: Request, body: SOSRequest, p: Principal = Depends(require_patient)):
    doc = p.doc or {}
    contact = doc.get("emergency_contact_phone") or settings.SOS_DEFAULT_NUMBER
    maps = f"https://maps.google.com/?q={body.latitude:.6f},{body.longitude:.6f}" if body.latitude is not None and body.longitude is not None else ""
    now = utcnow()
    text = (f"SOS - MedoShield\n{full_name(doc) or 'A patient'} needs help.\nTime: {now:%d %b %Y %H:%M} UTC\n"
            + (f"Location: {maps}\n" if maps else "Location: unavailable\n") + (f"Note: {body.message}\n" if body.message else ""))
    sent, err = (await _send_sms(contact, text)) if contact else (False, "No emergency contact saved")
    db = get_db()
    await db["sos_alerts"].insert_one(mongo_safe({"patient_id": p.patient_id, "latitude": body.latitude, "longitude": body.longitude,
                                                  "accuracy_m": body.accuracy_m, "maps_link": maps, "message": body.message,
                                                  "contact": contact, "sms_sent": sent, "error": err, "created_at": now}))
    for l in await db["patient_doctor_assignments"].find({"patient_id": p.patient_id, "is_active": True}).to_list(10):
        await notify_doctor(l["doctor_id"], "SOS alert", f"{full_name(doc)} triggered SOS. {maps}".strip(), "sos")
    await notify_patient(p.patient_id, "SOS alert recorded", "Your care team has been notified." + (" SMS sent to your emergency contact." if sent else ""), "sos")
    await audit("sos.trigger", actor_id=p.user_id, role="patient", request=request, meta={"sms_sent": sent})
    masked = (contact[:3] + "•••" + contact[-3:]) if contact and len(contact) > 6 else None
    return to_json({"ok": True, "sms_sent": sent, "contact": masked, "maps_link": maps, "detail": err or "Alert sent", "created_at": now,
                    "care_team_notified": True})
