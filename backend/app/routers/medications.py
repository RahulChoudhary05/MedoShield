"""Medication plan (doctor-prescribed or self-tracked), reminders, adherence and OTC guidance."""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai import analysts
from app.ai import guardrails as g
from app.core.audit import audit, notify_patient
from app.core.deps import Principal, require_any, require_doctor, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import age_from_dob, full_name, to_json
from app.db.database import get_db
from app.schemas import MedicationGuidanceRequest, MedicationItem, MedicationTaken
from app.services import medication_engine

router = APIRouter(prefix="/api/medications", tags=["medications"])


async def _plan(pid: str) -> dict:
    db = get_db()
    r = await db["medication_reminders"].find_one({"patient_id": pid, "is_active": True})
    if not r:
        r = {"patient_id": pid, "medications": [], "is_active": True, "created_at": utcnow(), "updated_at": utcnow()}
        res = await db["medication_reminders"].insert_one(r)
        r["_id"] = res.inserted_id
    return r


def _schedule(meds: list) -> dict:
    sched: dict = {}
    for m in meds:
        for slot in m.get("time_slots") or []:
            sched.setdefault(slot, []).append(m.get("name"))
    return dict(sorted(sched.items()))


@router.get("/plan")
async def get_plan(patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    plan = await _plan(pid)
    db = get_db()
    start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = await db["medication_logs"].find({"patient_id": pid, "taken_at": {"$gte": start}}).to_list(200)
    since = utcnow() - timedelta(days=14)
    taken = await db["medication_logs"].count_documents({"patient_id": pid, "taken_at": {"$gte": since}, "status": {"$ne": "skipped"}})
    expected = sum(len(m.get("time_slots") or []) for m in plan["medications"]) * 14
    return to_json({
        "patient_id": pid, "medications": plan["medications"], "schedule": _schedule(plan["medications"]),
        "today": [{"medication_name": l.get("medication_name"), "time_slot": l.get("time_slot"), "status": l.get("status", "taken"),
                   "taken_at": l.get("taken_at")} for l in today_logs],
        "adherence_14d": round(min(100.0, 100 * taken / expected), 1) if expected else None,
    })


@router.post("/plan", status_code=201)
async def add_medication(body: MedicationItem, request: Request, patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    """Patients can track their own medicines; doctors can prescribe for patients under their care."""
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    plan = await _plan(pid)
    item = body.model_dump()
    item.update({"added_by": p.role, "added_by_name": full_name(p.doc, "Dr. ") if p.is_doctor else "You", "added_at": utcnow(), "active": True})
    meds = [m for m in plan["medications"] if (m.get("name") or "").lower() != body.name.lower()] + [item]
    await get_db()["medication_reminders"].update_one({"_id": plan["_id"]}, {"$set": {"medications": meds, "updated_at": utcnow()}})
    if p.is_doctor:
        await notify_patient(pid, "New medication added", f"{full_name(p.doc, 'Dr. ')} added {body.name} ({body.dosage or 'see notes'}) to your plan.", "medication")
    await audit("medication.add", actor_id=p.user_id, role=p.role, request=request, target=pid, meta={"name": body.name})
    return to_json({"medications": meds, "schedule": _schedule(meds)})


@router.delete("/plan/{name}")
async def remove_medication(name: str, request: Request, patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    plan = await _plan(pid)
    target = next((m for m in plan["medications"] if (m.get("name") or "").lower() == name.lower()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Medication not found")
    if p.is_patient and target.get("added_by") == "doctor":
        raise HTTPException(status_code=403, detail="Medicines prescribed by your doctor can only be changed by them")
    meds = [m for m in plan["medications"] if m is not target]
    await get_db()["medication_reminders"].update_one({"_id": plan["_id"]}, {"$set": {"medications": meds, "updated_at": utcnow()}})
    await audit("medication.remove", actor_id=p.user_id, role=p.role, request=request, target=pid, meta={"name": name})
    return to_json({"medications": meds, "schedule": _schedule(meds)})


@router.post("/log", status_code=201)
@limiter.limit("60/hour")
async def log_dose(request: Request, body: MedicationTaken, p: Principal = Depends(require_patient)):
    plan = await _plan(p.patient_id)
    if not any((m.get("name") or "").lower() == body.medication_name.lower() for m in plan["medications"]):
        raise HTTPException(status_code=404, detail="That medication is not in your plan")
    db = get_db()
    start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    dup = await db["medication_logs"].find_one({"patient_id": p.patient_id, "medication_name": body.medication_name,
                                               "time_slot": body.time_slot, "taken_at": {"$gte": start}})
    if dup:
        await db["medication_logs"].update_one({"_id": dup["_id"]}, {"$set": {"status": body.status, "taken_at": utcnow()}})
    else:
        await db["medication_logs"].insert_one({"patient_id": p.patient_id, "medication_name": body.medication_name,
                                                "time_slot": body.time_slot, "status": body.status, "taken_at": utcnow()})
    return {"ok": True}


@router.post("/guidance")
@limiter.limit("20/hour")
async def guidance(request: Request, body: MedicationGuidanceRequest, p: Principal = Depends(require_patient)):
    doc = p.doc or {}
    symptoms = g.normalize_untrusted(body.symptoms, 600)
    if g.scan_for_injection(symptoms).blocked:
        raise HTTPException(status_code=400, detail="Please describe your symptoms in plain words.")
    plan = await _plan(p.patient_id)
    current = [m.get("name", "") for m in plan["medications"]] + list(doc.get("current_medications") or [])
    age = body.age if body.age is not None else age_from_dob(doc.get("date_of_birth"))
    result = medication_engine.recommend(symptoms, age, doc.get("conditions"), doc.get("allergies"), current)
    emergency = g.detect_emergency(symptoms)
    if emergency:
        result["red_flags"].insert(0, "Your description includes possible emergency symptoms - call your local emergency number now.")
        result["see_doctor"] = True
    result["ai_insight"] = await analysts.medication_insight(symptoms, age, doc.get("medical_history") or "")
    await get_db()["medication_guidance"].insert_one({"patient_id": p.patient_id, "symptoms": symptoms, "result": result, "created_at": utcnow()})
    return to_json(result)
