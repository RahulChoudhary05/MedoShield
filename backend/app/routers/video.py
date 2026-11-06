"""Doctor-gated AI video review (Gemini multimodal), PDF export and clinician notes.
Video bytes are analysed in memory and discarded - only the structured result is stored."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile

from app.ai import analysts, llm
from app.core.audit import audit, notify_doctor, notify_patient
from app.core.config import settings
from app.core.deps import Principal, doctor_has_patient, require_any, require_doctor, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, mongo_safe, parse_oid, to_json
from app.db.database import get_db
from app.schemas import VideoReview
from app.services.pdf_report import report_builder
from app.services.storage import VIDEO_TYPES, read_limited, safe_display_name, sniff

router = APIRouter(prefix="/api/video", tags=["video"])


@router.get("/access")
async def access(patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    db = get_db()
    links = await db["patient_doctor_assignments"].find({"patient_id": pid, "is_active": True}).to_list(20)
    unlocked = next((l for l in links if l.get("is_video_analysis_unlocked")), None)
    doctor = None
    if unlocked and len(unlocked.get("doctor_id", "")) == 24:
        doctor = await db["doctors"].find_one({"_id": parse_oid(unlocked["doctor_id"])})
    return to_json({
        "is_unlocked": unlocked is not None,
        "has_care_team": bool(links),
        "unlocked_by": full_name(doctor, "Dr. ") if doctor else None,
        "unlocked_at": (unlocked or {}).get("video_unlocked_at"),
    })


async def _toggle(patient_id: str, p: Principal, unlock: bool, request: Request):
    link = await doctor_has_patient(p.user_id, patient_id)
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not under your care")
    await get_db()["patient_doctor_assignments"].update_one({"_id": link["_id"]}, {"$set": {
        "is_video_analysis_unlocked": unlock, "video_unlocked_at": utcnow() if unlock else None}})
    if unlock:
        await notify_patient(patient_id, "AI video review unlocked", f"{full_name(p.doc, 'Dr. ')} enabled AI video movement review for you.", "video")
    await audit("video.unlock" if unlock else "video.lock", actor_id=p.user_id, role="doctor", request=request, target=patient_id)
    return {"is_unlocked": unlock}


@router.post("/unlock/{patient_id}")
async def unlock(patient_id: str, request: Request, p: Principal = Depends(require_doctor)):
    return await _toggle(patient_id, p, True, request)


@router.post("/lock/{patient_id}")
async def lock(patient_id: str, request: Request, p: Principal = Depends(require_doctor)):
    return await _toggle(patient_id, p, False, request)


@router.post("/analyze", status_code=201)
@limiter.limit("6/hour")
async def analyze_video(request: Request, file: UploadFile = File(...), pose_metrics: str = Form(""),
                        p: Principal = Depends(require_patient)):
    db = get_db()
    links = await db["patient_doctor_assignments"].find({"patient_id": p.patient_id, "is_active": True}).to_list(20)
    if not any(l.get("is_video_analysis_unlocked") for l in links):
        raise HTTPException(status_code=403, detail="AI video review hasn't been enabled by your doctor yet")

    data = await read_limited(file, settings.MAX_VIDEO_MB)
    mime, _ = sniff(data, VIDEO_TYPES)
    metrics = None
    if pose_metrics:
        try:
            raw = json.loads(pose_metrics[:4000])
            metrics = {k: float(v) for k, v in raw.items() if isinstance(k, str) and len(k) < 40 and isinstance(v, (int, float))} if isinstance(raw, dict) else None
        except (ValueError, TypeError):
            metrics = None

    result = await analysts.analyze_movement_video(data, mime, metrics)
    del data  # never persisted
    now = utcnow()
    doc = mongo_safe({
        "patient_id": p.patient_id, "analysis_type": "video_gait_analysis",
        "file_name": safe_display_name(file.filename, "recording.webm"), "mime": mime,
        "video_analysis": result.model_dump(), "pose_metrics": metrics,
        "ai_model": settings.GEMINI_MODEL if result.source == "model" else "MedoShield pose engine",
        "report_content": result.summary, "is_reviewed": False, "doctor_notes": "",
        "created_at": now, "analysis_date": now,
    })
    res = await db["video_analyses"].insert_one(doc)
    for l in links:
        await notify_doctor(l["doctor_id"], "New AI video review", f"{full_name(p.doc)} uploaded a movement video", "video")
    await audit("video.analyze", actor_id=p.user_id, role="patient", request=request, target=str(res.inserted_id))
    doc["_id"] = res.inserted_id
    return to_json(doc)


@router.get("/history")
async def history(patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    rows = await get_db()["video_analyses"].find({"patient_id": str(pat["_id"])}).sort("created_at", -1).to_list(50)
    return to_json({"analyses": rows})


@router.post("/{analysis_id}/review")
async def review(analysis_id: str, body: VideoReview, request: Request, p: Principal = Depends(require_doctor)):
    db = get_db()
    a = await db["video_analyses"].find_one({"_id": parse_oid(analysis_id, "analysis")})
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await resolve_patient(p, a["patient_id"])
    await db["video_analyses"].update_one({"_id": a["_id"]}, {"$set": {"doctor_notes": body.doctor_notes, "is_reviewed": True,
                                                                        "reviewed_by": p.user_id, "reviewed_at": utcnow()}})
    await notify_patient(a["patient_id"], "Your doctor reviewed a video", f"{full_name(p.doc, 'Dr. ')} added notes to your movement review.", "video")
    await audit("video.review", actor_id=p.user_id, role="doctor", request=request, target=analysis_id)
    return {"is_reviewed": True}


@router.get("/{analysis_id}/pdf")
async def pdf(analysis_id: str, request: Request, p: Principal = Depends(require_any)):
    db = get_db()
    a = await db["video_analyses"].find_one({"_id": parse_oid(analysis_id, "analysis")})
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    pat = await resolve_patient(p, a["patient_id"])
    content = report_builder.movement_report(pat, a, a.get("pose_metrics"))
    await audit("video.pdf", actor_id=p.user_id, role=p.role, request=request, target=analysis_id)
    return Response(content=content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="medoshield-movement-{analysis_id[-6:]}.pdf"'})
