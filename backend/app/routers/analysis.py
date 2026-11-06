"""Movement checks from on-device pose keypoints (privacy-first: no video stored)."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai_engine import analyze, build_baseline, classify, deviation, features_dict, motor_index
from app.core.audit import audit, notify_doctor
from app.core.config import settings
from app.core.deps import Principal, require_any, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, mongo_safe, parse_oid, to_json
from app.db.database import get_db
from app.schemas import PoseSession
from app.services.insights import latest_risk, patient_trends

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_EXPLAIN = {
    "tremor": "Rhythmic 4-12 Hz hand oscillation",
    "speed": "Speed of limb movement",
    "symmetry": "Left/right step balance",
    "balance": "Trunk steadiness",
    "rhythm": "Step-timing regularity",
    "arm_swing": "Arm-swing balance",
    "cadence": "Steps per minute",
}


def _recommendations(f: dict, mi: dict, level: str, q_notes: list) -> list[str]:
    recs = []
    if mi.get("tremor", 100) < 60:
        recs.append(f"A {f.get('tremor_frequency') or ''} Hz tremor pattern was detected on the {f.get('tremor_side') or 'hand'} side - mention it to your neurologist.".replace("  ", " "))
    if mi.get("balance", 100) < 60:
        recs.append("Trunk sway was higher than typical - consider supervised balance exercises and clear walkways at home.")
    if mi.get("symmetry", 100) < 60 or mi.get("arm_swing", 100) < 55:
        recs.append("Left/right movement looked uneven - a physiotherapy gait review can help.")
    if mi.get("speed", 100) < 55 or mi.get("cadence", 100) < 55:
        recs.append("Movement was slower than typical. Note whether this varies with medication timing.")
    if level == "HIGH":
        recs.insert(0, "Your result differs notably from expected ranges. Please share this check with your doctor soon.")
    recs.extend(q_notes[:2])
    return recs or ["Movement looked steady. Repeat this 2-3 times a week at a similar time of day to strengthen your baseline."]


@router.post("/sessions", status_code=201)
@limiter.limit("30/hour")
async def submit_session(request: Request, body: PoseSession, p: Principal = Depends(require_patient)):
    frames = [f.model_dump() for f in body.frames][: settings.MAX_POSE_FRAMES]
    # CPU-bound numpy/scipy work runs off the event loop.
    feats, quality = await asyncio.to_thread(analyze, frames)
    if not quality.usable:
        raise HTTPException(status_code=422, detail={"message": "Recording quality too low to analyse", "notes": quality.notes,
                                                     "quality": to_json(quality.__dict__)})
    f = features_dict(feats)
    mi = motor_index(feats)

    db = get_db()
    pid = p.patient_id
    baseline = await db["baselines"].find_one({"patient_id": pid})
    dev = deviation(f, baseline.get("model") if baseline and baseline.get("is_calibrated") else None)
    risk = classify(mi, dev["score"], quality.score)

    now = utcnow()
    session = mongo_safe({
        "patient_id": pid, "user_id": p.user_id, "task": body.task, "device": body.device,
        "video_duration": quality.duration_s, "frame_count": quality.frames,
        "extracted_features": {**f, "deviation_from_baseline": dev["score"], "risk_score": risk["score"], "risk_level": risk["classification"]},
        "quality": {**quality.__dict__, "score": quality.score},
        "created_at": now, "updated_at": now,
    })
    res = await db["analysis_sessions"].insert_one(session)
    sid = str(res.inserted_id)
    await db["risk_assessments"].insert_one(mongo_safe({
        "patient_id": pid, "session_id": sid,
        "risk_score": {**risk, "motor_index": mi, "deviation": dev},
        "flagged_for_review": risk["should_flag"], "created_at": now,
    }))

    # (Re)build the personal baseline from the first N good sessions.
    if not (baseline and baseline.get("is_calibrated")):
        good = await db["analysis_sessions"].find({"patient_id": pid, "quality.score": {"$gte": 0.55}}, {"extracted_features": 1}).sort("created_at", 1).to_list(settings.BASELINE_SESSIONS)
        if len(good) >= settings.BASELINE_SESSIONS:
            model = build_baseline([g["extracted_features"] for g in good])
            await db["baselines"].update_one({"patient_id": pid}, {"$set": mongo_safe({"patient_id": pid, "model": model, "is_calibrated": True,
                                                                                      "calibrated_at": now})}, upsert=True)

    if risk["should_flag"]:
        for link in await db["patient_doctor_assignments"].find({"patient_id": pid, "is_active": True}).to_list(10):
            await notify_doctor(link["doctor_id"], f"{risk['classification'].title()} movement-risk check",
                                f"{full_name(p.doc)}: motor index {mi['overall']:.0f}/100", "risk")
    await audit("analysis.session", actor_id=p.user_id, role="patient", request=request, target=sid, meta={"level": risk["classification"]})

    return to_json({
        "session_id": sid,
        "features": f,
        "motor_index": mi,
        "components": [{"key": k, "label": _EXPLAIN[k], "score": v} for k, v in mi.items() if k != "overall"],
        "risk": risk,
        "deviation": dev,
        "quality": {**quality.__dict__, "score": quality.score},
        "recommendations": _recommendations(f, mi, risk["classification"], quality.notes),
        "baseline": (await latest_risk(pid) or {}).get("baseline"),
        "created_at": now,
    })


@router.get("/sessions")
async def list_sessions(patient_id: str | None = None, limit: int = Query(30, ge=1, le=200), p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    rows = await get_db()["analysis_sessions"].find({"patient_id": pid}, {"pose_frames": 0}).sort("created_at", -1).to_list(limit)
    return to_json({"sessions": rows})


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, p: Principal = Depends(require_any)):
    db = get_db()
    s = await db["analysis_sessions"].find_one({"_id": parse_oid(session_id, "session")}, {"pose_frames": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    await resolve_patient(p, s["patient_id"])
    r = await db["risk_assessments"].find_one({"session_id": session_id})
    return to_json({"session": s, "risk": (r or {}).get("risk_score")})


@router.get("/summary")
async def summary(patient_id: str | None = None, days: int = Query(90, ge=7, le=365), p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    return to_json({"latest": await latest_risk(pid), "trend": await patient_trends(pid, days)})
