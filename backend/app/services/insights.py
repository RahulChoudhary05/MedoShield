"""Read-side aggregations shared by patient and doctor views."""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.core.security import utcnow
from app.core.utils import to_json
from app.db.database import get_db

LEVEL_ALIASES = {"LOW": "LOW", "Low": "LOW", "MEDIUM": "MEDIUM", "Moderate": "MEDIUM", "Medium": "MEDIUM",
                 "HIGH": "HIGH", "High": "HIGH", "Critical": "HIGH", "BASELINE_LEARNING": "CALIBRATING"}


def _level(v: Any) -> str:
    return LEVEL_ALIASES.get(str(v), "UNKNOWN")


async def latest_risk(patient_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    r = await db["risk_assessments"].find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
    if not r:
        return None
    rs = r.get("risk_score") or {}
    baseline = await db["baselines"].find_one({"patient_id": patient_id})
    count = await db["analysis_sessions"].count_documents({"patient_id": patient_id})
    from app.core.config import settings

    return to_json({
        "level": _level(rs.get("classification")),
        "score": rs.get("score"),
        "confidence": rs.get("confidence"),
        "motor_index": rs.get("motor_index"),
        "basis": rs.get("basis"),
        "flagged": r.get("flagged_for_review", False),
        "session_id": r.get("session_id"),
        "created_at": r.get("created_at"),
        "baseline": {"calibrated": bool(baseline and baseline.get("is_calibrated")), "sessions": count,
                     "required": settings.BASELINE_SESSIONS},
    })


async def patient_trends(patient_id: str, days: int = 90) -> List[Dict[str, Any]]:
    db = get_db()
    since = utcnow() - timedelta(days=days)
    sessions = await db["analysis_sessions"].find(
        {"patient_id": patient_id, "created_at": {"$gte": since}}, {"pose_frames": 0}
    ).sort("created_at", 1).to_list(500)
    risks = await db["risk_assessments"].find({"patient_id": patient_id, "created_at": {"$gte": since}}).to_list(500)
    by_session = {r.get("session_id"): r for r in risks}
    points = []
    for s in sessions:
        f = s.get("extracted_features") or {}
        r = (by_session.get(str(s["_id"])) or {}).get("risk_score") or {}
        mi = r.get("motor_index") or {}
        points.append({
            "session_id": str(s["_id"]), "date": s.get("created_at"), "task": s.get("task", "walk"),
            "motor_index": mi.get("overall") if isinstance(mi, dict) else None,
            "risk_score": r.get("score"), "risk_level": _level(r.get("classification")),
            "tremor_index": f.get("tremor_index"), "tremor_frequency": f.get("tremor_frequency"),
            "gait_symmetry": f.get("gait_symmetry"), "bradykinesia_score": f.get("bradykinesia_score"),
            "cadence": f.get("cadence"), "postural_sway": f.get("postural_sway"), "step_time_cv": f.get("step_time_cv"),
            "quality": (s.get("quality") or {}).get("score"),
        })
    return to_json(points)


async def care_snapshot(patient_id: str) -> Dict[str, Any]:
    """Compact clinical facts used by the doctor overview and AI clinician summary."""
    db = get_db()
    reminder = await db["medication_reminders"].find_one({"patient_id": patient_id, "is_active": True})
    last_video = await db["video_analyses"].find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
    last_report = await db["report_analyses"].find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
    since = utcnow() - timedelta(days=14)
    logs = await db["medication_logs"].count_documents({"patient_id": patient_id, "taken_at": {"$gte": since}, "status": {"$ne": "skipped"}})
    expected = sum(len(m.get("time_slots") or []) for m in (reminder or {}).get("medications", [])) * 14
    fitness = await db["fitness_records"].find({"patient_id": patient_id}).sort("date", -1).to_list(14)
    return {
        "latest_risk": await latest_risk(patient_id),
        "trend": (await patient_trends(patient_id, days=90))[-12:],
        "medications": (reminder or {}).get("medications", []),
        "adherence_14d": round(min(100.0, 100 * logs / expected), 1) if expected else None,
        "last_video": to_json({k: last_video.get(k) for k in ("_id", "created_at", "video_analysis", "is_reviewed", "doctor_notes")}) if last_video else None,
        "last_report": to_json({k: last_report.get(k) for k in ("_id", "created_at", "file_name", "analysis")}) if last_report else None,
        "fitness_recent": to_json([{k: f.get(k) for k in ("date", "sleep_hours", "stress_level", "walking_distance", "heart_rate")} for f in fitness]),
    }
