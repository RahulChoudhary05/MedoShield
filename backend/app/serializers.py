"""Public projections of stored documents. Secrets never leave the server."""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.utils import age_from_dob, full_name, to_json

_PATIENT_FIELDS = ("user_id", "first_name", "last_name", "email", "date_of_birth", "gender", "phone",
                   "medical_history", "conditions", "allergies", "current_medications",
                   "emergency_contact_name", "emergency_contact_phone", "is_active", "created_at", "updated_at")
_DOCTOR_FIELDS = ("doctor_id", "first_name", "last_name", "email", "specialty", "clinic_name", "license_number",
                  "appointment_fee", "experience_years", "bio", "rating", "accepting_patients", "license_verified",
                  "is_active", "created_at")


def patient_public(doc: Optional[dict]) -> Dict[str, Any]:
    if not doc:
        return {}
    out = {k: doc.get(k) for k in _PATIENT_FIELDS}
    out["id"] = str(doc["_id"])
    out["full_name"] = full_name(doc)
    out["age"] = age_from_dob(doc.get("date_of_birth"))
    out["conditions"] = out.get("conditions") or []
    out["allergies"] = out.get("allergies") or []
    out["current_medications"] = out.get("current_medications") or []
    return to_json(out)


def patient_card(doc: Optional[dict]) -> Dict[str, Any]:
    """Minimal view shared with a treating doctor."""
    if not doc:
        return {}
    return to_json({
        "id": str(doc["_id"]), "first_name": doc.get("first_name"), "last_name": doc.get("last_name"),
        "full_name": full_name(doc), "email": doc.get("email"), "gender": doc.get("gender"),
        "date_of_birth": doc.get("date_of_birth"), "age": age_from_dob(doc.get("date_of_birth")),
        "conditions": doc.get("conditions") or [], "allergies": doc.get("allergies") or [],
        "current_medications": doc.get("current_medications") or [], "medical_history": doc.get("medical_history"),
    })


def doctor_public(doc: Optional[dict]) -> Dict[str, Any]:
    if not doc:
        return {}
    out = {k: doc.get(k) for k in _DOCTOR_FIELDS}
    out["id"] = str(doc["_id"])
    out["full_name"] = full_name(doc, "Dr. ")
    if out.get("experience_years") is None and isinstance(doc.get("experience"), str):
        digits = "".join(ch for ch in doc["experience"] if ch.isdigit())
        out["experience_years"] = int(digits) if digits else None
    return to_json(out)


def doctor_card(doc: Optional[dict]) -> Dict[str, Any]:
    """What patients see in the directory (no email / licence number)."""
    if not doc:
        return {}
    pub = doctor_public(doc)
    for k in ("email", "license_number", "doctor_id", "is_active"):
        pub.pop(k, None)
    return pub
