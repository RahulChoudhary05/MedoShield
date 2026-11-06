"""Lab-report (PDF) explainer and the unified health timeline."""

import asyncio
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile

from app.ai import analysts
from app.core.audit import audit, notify_doctor
from app.core.config import settings
from app.core.deps import Principal, require_any, require_patient, resolve_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import full_name, mongo_safe, parse_oid, to_json
from app.db.database import get_db
from app.services.storage import PDF_TYPES, read_limited, safe_display_name, sniff

router = APIRouter(prefix="/api", tags=["reports"])


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            return ""
        parts = []
        for i, page in enumerate(reader.pages):
            if i >= 30:
                break
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    except Exception:
        return ""


@router.post("/reports/analyze", status_code=201)
@limiter.limit("10/hour")
async def analyze_pdf(request: Request, file: UploadFile = File(...), p: Principal = Depends(require_patient)):
    data = await read_limited(file, settings.MAX_PDF_MB)
    sniff(data, PDF_TYPES)
    text = await asyncio.to_thread(_pdf_text, data)
    result = await analysts.analyze_report_text(text)
    doc = mongo_safe({"patient_id": p.patient_id, "file_name": safe_display_name(file.filename, "report.pdf"),
                      "pages_text_chars": len(text), "analysis": result.model_dump(), "created_at": utcnow()})
    res = await get_db()["report_analyses"].insert_one(doc)
    if result.overall_risk in ("High", "Critical"):
        for l in await get_db()["patient_doctor_assignments"].find({"patient_id": p.patient_id, "is_active": True}).to_list(10):
            await notify_doctor(l["doctor_id"], "Lab report flagged", f"{full_name(p.doc)} uploaded a report rated {result.overall_risk}", "report")
    await audit("report.analyze", actor_id=p.user_id, role="patient", request=request, target=str(res.inserted_id))
    doc["_id"] = res.inserted_id
    return to_json(doc)


@router.get("/reports")
async def list_reports(patient_id: Optional[str] = None, p: Principal = Depends(require_any)):
    pat = await resolve_patient(p, patient_id)
    rows = await get_db()["report_analyses"].find({"patient_id": str(pat["_id"])}).sort("created_at", -1).to_list(50)
    return to_json({"reports": rows})


@router.get("/reports/{report_id}")
async def get_report(report_id: str, p: Principal = Depends(require_any)):
    r = await get_db()["report_analyses"].find_one({"_id": parse_oid(report_id, "report")})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    await resolve_patient(p, r["patient_id"])
    return to_json(r)


@router.get("/timeline")
async def timeline(patient_id: Optional[str] = None, limit: int = Query(100, ge=1, le=300), p: Principal = Depends(require_any)):
    """Everything that happened in one chronological feed."""
    pat = await resolve_patient(p, patient_id)
    pid = str(pat["_id"])
    db = get_db()
    items = []
    for s in await db["analysis_sessions"].find({"patient_id": pid}, {"pose_frames": 0}).sort("created_at", -1).to_list(limit):
        f = s.get("extracted_features") or {}
        items.append({"id": str(s["_id"]), "type": "movement_check", "title": "Movement check",
                      "summary": f"Risk {f.get('risk_level', '—')} · symmetry {round(100 * (f.get('gait_symmetry') or 0))}%",
                      "level": f.get("risk_level"), "created_at": s.get("created_at")})
    for v in await db["video_analyses"].find({"patient_id": pid}).sort("created_at", -1).to_list(limit):
        va = v.get("video_analysis") or {}
        items.append({"id": str(v["_id"]), "type": "video_review", "title": "AI video review",
                      "summary": va.get("summary") or v.get("analysis_text") or v.get("report_content") or "",
                      "reviewed": v.get("is_reviewed", False), "has_pdf": True, "created_at": v.get("created_at") or v.get("analysis_date"),
                      "detail": va})
    for r in await db["report_analyses"].find({"patient_id": pid}).sort("created_at", -1).to_list(limit):
        a = r.get("analysis") or {}
        items.append({"id": str(r["_id"]), "type": "lab_report", "title": a.get("report_type") or "Lab report",
                      "summary": a.get("short_description", ""), "level": a.get("overall_risk"), "created_at": r.get("created_at"), "detail": a})
    for c in await db["ai_reports"].find({"patient_id": pid}).sort("created_at", -1).to_list(limit):
        items.append({"id": str(c["_id"]), "type": "clinician_summary", "title": "Clinician summary",
                      "summary": c.get("summary") or c.get("content", "")[:300], "created_at": c.get("created_at"),
                      "detail": {k: c.get(k) for k in ("key_findings", "recommendations")}})
    for a in await db["appointment_requests"].find({"patient_id": pid}).sort("created_at", -1).to_list(limit):
        items.append({"id": str(a["_id"]), "type": "appointment", "title": f"Appointment {a.get('status')}",
                      "summary": f"{a.get('preferred_date')} at {a.get('preferred_time')} · {a.get('meeting_mode', '').replace('_', ' ')}",
                      "created_at": a.get("created_at")})
    items = [i for i in items if i.get("created_at")]
    items.sort(key=lambda i: i["created_at"], reverse=True)
    counts = {}
    for i in items:
        counts[i["type"]] = counts.get(i["type"], 0) + 1
    return to_json({"patient_id": pid, "items": items[:limit], "counts": counts})
