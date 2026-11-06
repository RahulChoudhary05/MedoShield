"""Patient self-service: profile, dashboard, trends, privacy (export / delete)."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from app.core.audit import audit
from app.core.deps import Principal, require_patient
from app.core.security import utcnow, verify_password
from app.core.utils import parse_oid, to_json
from app.db.database import get_db
from app.schemas import ConfirmPassword, PatientUpdate
from app.serializers import doctor_card, patient_public
from app.services.insights import latest_risk, patient_trends

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("/me")
async def get_me(p: Principal = Depends(require_patient)):
    return patient_public(p.doc)


@router.patch("/me")
async def update_me(body: PatientUpdate, request: Request, p: Principal = Depends(require_patient)):
    changes = body.model_dump(exclude_unset=True)
    if "date_of_birth" in changes and changes["date_of_birth"] is not None:
        changes["date_of_birth"] = changes["date_of_birth"].isoformat()
    if not changes:
        return patient_public(p.doc)
    changes["updated_at"] = utcnow()
    db = get_db()
    await db["patients"].update_one({"_id": p.doc["_id"]}, {"$set": changes})
    await audit("patient.update_profile", actor_id=p.user_id, role="patient", request=request, meta={"fields": sorted(changes)})
    return patient_public(await db["patients"].find_one({"_id": p.doc["_id"]}))


@router.get("/dashboard")
async def dashboard(p: Principal = Depends(require_patient)):
    db = get_db()
    pid = p.patient_id
    since = utcnow() - timedelta(days=14)
    sessions_total = await db["analysis_sessions"].count_documents({"patient_id": pid})
    videos_total = await db["video_analyses"].count_documents({"patient_id": pid})
    reports_total = await db["report_analyses"].count_documents({"patient_id": pid})
    unread = await db["notifications"].count_documents({"patient_id": pid, "is_read": False})
    reminder = await db["medication_reminders"].find_one({"patient_id": pid, "is_active": True})
    meds = (reminder or {}).get("medications", [])
    taken_30 = await db["medication_logs"].count_documents({"patient_id": pid, "status": {"$ne": "skipped"}, "taken_at": {"$gte": since}})
    expected_30 = sum(len(m.get("time_slots") or []) for m in meds) * 14
    assignments = await db["patient_doctor_assignments"].find({"patient_id": pid, "is_active": True}).to_list(20)
    care_team = []
    for a in assignments:
        if a.get("doctor_id") and len(a["doctor_id"]) == 24:
            d = await db["doctors"].find_one({"_id": parse_oid(a["doctor_id"])})
            if d:
                care_team.append({**doctor_card(d), "video_unlocked": bool(a.get("is_video_analysis_unlocked"))})
    upcoming = await db["appointment_requests"].find({"patient_id": pid, "status": {"$in": ["pending", "accepted"]}}).sort("preferred_date", 1).to_list(5)
    fitness = await db["fitness_records"].find({"patient_id": pid}).sort("date", -1).to_list(7)

    return to_json({
        "patient": patient_public(p.doc),
        "stats": {
            "movement_checks": sessions_total,
            "video_analyses": videos_total,
            "report_analyses": reports_total,
            "active_medications": len(meds),
            "unread_notifications": unread,
            "adherence_14d": round(min(100.0, 100 * taken_30 / expected_30), 1) if expected_30 else None,
        },
        "latest_risk": await latest_risk(pid),
        "trends": await patient_trends(pid, days=60),
        "medications": meds,
        "care_team": care_team,
        "upcoming_appointments": [{"id": str(a["_id"]), "doctor_id": a.get("doctor_id"), "status": a.get("status"),
                                   "preferred_date": a.get("preferred_date"), "preferred_time": a.get("preferred_time"),
                                   "meeting_mode": a.get("meeting_mode")} for a in upcoming],
        "fitness_recent": [{k: f.get(k) for k in ("date", "sleep_hours", "stress_level", "walking_distance", "heart_rate", "bmi")} for f in fitness],
    })


@router.get("/trends")
async def trends(days: int = Query(90, ge=7, le=365), p: Principal = Depends(require_patient)):
    return {"patient_id": p.patient_id, "points": await patient_trends(p.patient_id, days=days)}


@router.get("/appointments")
async def my_appointments(p: Principal = Depends(require_patient)):
    db = get_db()
    rows = await db["appointment_requests"].find({"patient_id": p.patient_id}).sort("created_at", -1).to_list(100)
    out = []
    for r in rows:
        d = await db["doctors"].find_one({"_id": parse_oid(r["doctor_id"])}) if len(r.get("doctor_id", "")) == 24 else None
        out.append({
            "id": str(r["_id"]), "doctor": doctor_card(d) if d else None, "status": r.get("status"),
            "preferred_date": r.get("preferred_date"), "preferred_time": r.get("preferred_time"),
            "meeting_mode": r.get("meeting_mode"), "message": r.get("message"), "doctor_note": r.get("doctor_note"),
            "appointment_fee": r.get("appointment_fee", 0), "created_at": r.get("created_at"),
        })
    return to_json({"appointments": out})


@router.get("/me/export")
async def export_my_data(request: Request, p: Principal = Depends(require_patient)):
    """GDPR-style data portability: everything stored about the caller, as JSON."""
    db = get_db()
    pid = p.patient_id
    collections = ["analysis_sessions", "risk_assessments", "video_analyses", "report_analyses", "assistant_conversations",
                   "medication_reminders", "medication_logs", "fitness_records", "notifications", "appointment_requests",
                   "chat_messages", "sos_alerts"]
    data = {"profile": patient_public(p.doc), "exported_at": utcnow()}
    for c in collections:
        data[c] = await db[c].find({"patient_id": pid}, {"pose_frames": 0}).to_list(5000)
    await audit("patient.export", actor_id=p.user_id, role="patient", request=request)
    return Response(content=__import__("json").dumps(to_json(data), indent=2), media_type="application/json",
                    headers={"Content-Disposition": 'attachment; filename="medoshield-my-data.json"'})


@router.post("/me/delete", status_code=204)
async def delete_my_account(request: Request, response: Response, body: ConfirmPassword, p: Principal = Depends(require_patient)):
    ok, _ = verify_password(body.password, p.doc.get("hashed_password"))
    if not ok:
        raise HTTPException(status_code=400, detail="Password is incorrect")
    db = get_db()
    pid = p.patient_id
    for c in ["analysis_sessions", "risk_assessments", "baselines", "video_analyses", "report_analyses", "assistant_conversations",
              "medication_reminders", "medication_logs", "fitness_records", "notifications", "appointment_requests",
              "chat_messages", "patient_doctor_assignments", "sos_alerts"]:
        await db[c].delete_many({"patient_id": pid})
    await db["media_files"].delete_many({"owner": pid})
    await db["auth_sessions"].update_many({"user_id": p.user_id}, {"$set": {"revoked": True}})
    await db["patients"].delete_one({"_id": p.doc["_id"]})
    await audit("patient.delete_account", actor_id=p.user_id, role="patient", request=request)
    response.status_code = 204
    return response
