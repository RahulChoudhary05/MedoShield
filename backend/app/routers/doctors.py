"""Doctor workspace: profile, directory, appointment workflow, patient panel.

Security change vs. the old build: there is no "assign any patient" endpoint any
more (it let any doctor grant themselves access to any patient's records). A
care relationship is created only when a doctor accepts the patient's own
appointment request, and either side can end it.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai import analysts
from app.core.audit import audit, notify_doctor, notify_patient
from app.core.deps import Principal, require_any, require_doctor, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, parse_oid, to_json
from app.db.database import get_db
from app.schemas import AppointmentCreate, AppointmentDecision, DoctorUpdate
from app.serializers import doctor_card, doctor_public, patient_card
from app.services.insights import care_snapshot, latest_risk

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.get("/profile")
async def profile(p: Principal = Depends(require_doctor)):
    return doctor_public(p.doc)


@router.patch("/profile")
async def update_profile(body: DoctorUpdate, request: Request, p: Principal = Depends(require_doctor)):
    changes = body.model_dump(exclude_unset=True)
    if changes:
        changes["updated_at"] = utcnow()
        await get_db()["doctors"].update_one({"_id": p.doc["_id"]}, {"$set": changes})
        await audit("doctor.update_profile", actor_id=p.user_id, role="doctor", request=request, meta={"fields": sorted(changes)})
    return doctor_public(await get_db()["doctors"].find_one({"_id": p.doc["_id"]}))


@router.get("/directory")
async def directory(specialty: str | None = Query(None, max_length=60), q: str | None = Query(None, max_length=60),
                    _: Principal = Depends(require_any)):
    import re

    query: dict = {"is_active": True}
    if specialty:
        query["specialty"] = {"$regex": f"^{re.escape(specialty)}$", "$options": "i"}
    docs = await get_db()["doctors"].find(query).sort("created_at", -1).to_list(200)
    if q:
        needle = q.lower()
        docs = [d for d in docs if needle in f"{d.get('first_name', '')} {d.get('last_name', '')} {d.get('specialty', '')} {d.get('clinic_name', '')}".lower()]
    specialties = sorted({d.get("specialty", "") for d in docs if d.get("specialty")})
    return {"doctors": [doctor_card(d) for d in docs], "specialties": specialties}


# ── Appointments ────────────────────────────────────────────────────────
@router.post("/appointments", status_code=201)
@limiter.limit("10/hour")
async def request_appointment(request: Request, body: AppointmentCreate, p: Principal = Depends(require_patient)):
    db = get_db()
    doctor = await db["doctors"].find_one({"_id": parse_oid(body.doctor_id, "doctor"), "is_active": True})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor.get("accepting_patients") is False:
        raise HTTPException(status_code=409, detail="This doctor is not accepting new requests right now")
    dup = await db["appointment_requests"].find_one({"patient_id": p.patient_id, "doctor_id": body.doctor_id, "status": "pending"})
    if dup:
        raise HTTPException(status_code=409, detail="You already have a pending request with this doctor")
    now = utcnow()
    res = await db["appointment_requests"].insert_one({
        "doctor_id": body.doctor_id, "patient_id": p.patient_id,
        "preferred_date": body.preferred_date.isoformat(), "preferred_time": body.preferred_time,
        "meeting_mode": body.meeting_mode, "message": body.message, "status": "pending",
        "appointment_fee": doctor.get("appointment_fee", 0), "created_at": now, "updated_at": now,
    })
    await notify_doctor(body.doctor_id, "New appointment request", f"{full_name(p.doc)} requested {body.preferred_date:%d %b} at {body.preferred_time}", "appointment")
    await audit("appointment.request", actor_id=p.user_id, role="patient", request=request, target=body.doctor_id)
    return {"id": str(res.inserted_id), "status": "pending"}


@router.post("/appointments/{request_id}/cancel")
async def cancel_appointment(request_id: str, p: Principal = Depends(require_patient)):
    db = get_db()
    r = await db["appointment_requests"].find_one({"_id": parse_oid(request_id, "appointment"), "patient_id": p.patient_id})
    if not r:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if r.get("status") not in ("pending", "accepted"):
        raise HTTPException(status_code=409, detail="This appointment can no longer be cancelled")
    await db["appointment_requests"].update_one({"_id": r["_id"]}, {"$set": {"status": "cancelled", "updated_at": utcnow()}})
    await notify_doctor(r["doctor_id"], "Appointment cancelled", f"{full_name(p.doc)} cancelled their request", "appointment")
    return {"status": "cancelled"}


@router.get("/appointments")
async def doctor_appointments(status_filter: str | None = Query(None, alias="status", pattern="^(pending|accepted|rejected|cancelled|completed)$"),
                              p: Principal = Depends(require_doctor)):
    db = get_db()
    query = {"doctor_id": p.user_id}
    if status_filter:
        query["status"] = status_filter
    rows = await db["appointment_requests"].find(query).sort("created_at", -1).to_list(200)
    out = []
    for r in rows:
        pat = await db["patients"].find_one({"_id": parse_oid(r["patient_id"])}) if len(r.get("patient_id", "")) == 24 else None
        out.append({
            "id": str(r["_id"]), "patient_id": r.get("patient_id"),
            "patient": {"full_name": full_name(pat), "age": patient_card(pat).get("age"), "gender": (pat or {}).get("gender")} if pat else None,
            "status": r.get("status"), "preferred_date": r.get("preferred_date"), "preferred_time": r.get("preferred_time"),
            "meeting_mode": r.get("meeting_mode"), "message": r.get("message"), "appointment_fee": r.get("appointment_fee", 0),
            "created_at": r.get("created_at"),
        })
    return to_json({"appointments": out})


async def _decide(request_id: str, p: Principal, accept: bool, note: str, request: Request):
    db = get_db()
    r = await db["appointment_requests"].find_one({"_id": parse_oid(request_id, "appointment")})
    if not r or r.get("doctor_id") != p.user_id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if r.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Request is already {r.get('status')}")
    new_status = "accepted" if accept else "rejected"
    await db["appointment_requests"].update_one({"_id": r["_id"]}, {"$set": {"status": new_status, "doctor_note": note, "updated_at": utcnow()}})
    if accept and not await db["patient_doctor_assignments"].find_one({"patient_id": r["patient_id"], "doctor_id": p.user_id, "is_active": True}):
        await db["patient_doctor_assignments"].insert_one({
            "patient_id": r["patient_id"], "doctor_id": p.user_id, "assigned_at": utcnow(), "is_active": True,
            "is_video_analysis_unlocked": False, "source": "appointment", "appointment_id": str(r["_id"]),
        })
    await notify_patient(r["patient_id"], f"Appointment {new_status}",
                         (f"{full_name(p.doc, 'Dr. ')} accepted your request. You can now message them securely." if accept
                          else f"{full_name(p.doc, 'Dr. ')} couldn't take this request. {note}".strip()), "appointment")
    await audit(f"appointment.{new_status}", actor_id=p.user_id, role="doctor", request=request, target=r["patient_id"])
    return {"status": new_status}


@router.post("/appointments/{request_id}/accept")
async def accept(request_id: str, request: Request, body: AppointmentDecision | None = None, p: Principal = Depends(require_doctor)):
    return await _decide(request_id, p, True, (body.note if body else ""), request)


@router.post("/appointments/{request_id}/reject")
async def reject(request_id: str, request: Request, body: AppointmentDecision | None = None, p: Principal = Depends(require_doctor)):
    return await _decide(request_id, p, False, (body.note if body else ""), request)


# ── Patient panel ────────────────────────────────────────────────────────
@router.get("/patients")
async def my_patients(p: Principal = Depends(require_doctor)):
    db = get_db()
    links = await db["patient_doctor_assignments"].find({"doctor_id": p.user_id, "is_active": True}).to_list(500)
    out = []
    for link in links:
        pid = link.get("patient_id", "")
        if len(pid) != 24:
            continue
        pat = await db["patients"].find_one({"_id": parse_oid(pid)})
        if not pat:
            continue
        risk = await latest_risk(pid)
        unread = await db["chat_messages"].count_documents({"patient_id": pid, "doctor_id": p.user_id, "sender_role": "patient", "read_by_doctor": False})
        out.append({**patient_card(pat), "latest_risk": risk, "video_unlocked": bool(link.get("is_video_analysis_unlocked")),
                    "linked_at": link.get("assigned_at"), "unread_messages": unread})
    order = {"HIGH": 0, "MEDIUM": 1, "CALIBRATING": 2, "LOW": 3, "UNKNOWN": 4}
    out.sort(key=lambda x: order.get(((x.get("latest_risk") or {}).get("level") or "UNKNOWN"), 5))
    return to_json({"patients": out})


@router.get("/patients/{patient_id}/overview")
async def patient_overview(patient_id: str, request: Request, p: Principal = Depends(require_doctor)):
    pat = await resolve_patient(p, patient_id)
    await audit("doctor.view_patient", actor_id=p.user_id, role="doctor", request=request, target=patient_id)
    return to_json({"patient": patient_card(pat), **(await care_snapshot(patient_id))})


@router.post("/patients/{patient_id}/summary")
@limiter.limit("10/hour")
async def ai_summary(patient_id: str, request: Request, p: Principal = Depends(require_doctor)):
    pat = await resolve_patient(p, patient_id)
    snap = await care_snapshot(patient_id)
    lr = snap.get("latest_risk") or {}
    facts = {
        "age": patient_card(pat).get("age"), "conditions": ", ".join(pat.get("conditions") or []),
        "latest_risk_level": lr.get("level"), "latest_risk_score": lr.get("score"),
        "motor_index_trend": [t.get("motor_index") for t in snap.get("trend", []) if t.get("motor_index") is not None],
        "tremor_index_trend": [t.get("tremor_index") for t in snap.get("trend", []) if t.get("tremor_index") is not None],
        "medications": ", ".join(m.get("name", "") for m in snap.get("medications", [])),
        "adherence_14d_pct": snap.get("adherence_14d"),
        "last_video_summary": ((snap.get("last_video") or {}).get("video_analysis") or {}).get("summary"),
        "last_lab_report_risk": (((snap.get("last_report") or {}).get("analysis")) or {}).get("overall_risk"),
    }
    summary = await analysts.clinician_summary(full_name(pat), facts)
    doc = {"patient_id": patient_id, "doctor_id": p.user_id, "kind": "clinician_summary", **summary, "created_at": utcnow()}
    await get_db()["ai_reports"].insert_one(doc)
    return to_json(doc)


@router.post("/patients/{patient_id}/discharge")
async def end_care(patient_id: str, request: Request, p: Principal = Depends(require_doctor)):
    await resolve_patient(p, patient_id)
    await get_db()["patient_doctor_assignments"].update_many({"patient_id": patient_id, "doctor_id": p.user_id, "is_active": True},
                                                             {"$set": {"is_active": False, "ended_at": utcnow()}})
    await notify_patient(patient_id, "Care link ended", f"{full_name(p.doc, 'Dr. ')} has closed your care link.", "appointment")
    await audit("doctor.discharge", actor_id=p.user_id, role="doctor", request=request, target=patient_id)
    return {"status": "ended"}
