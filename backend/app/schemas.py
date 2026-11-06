"""Request/response contracts. Every request model forbids unknown fields and
bounds every string/list, which also blocks Mongo operator injection
(e.g. {"email": {"$ne": null}}) because only primitives are accepted."""
from __future__ import annotations

import re
from datetime import date
from typing import Annotated, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


Name = Annotated[str, StringConstraints(min_length=1, max_length=60, pattern=r"^[\w .,'\-]+$")]
ShortText = Annotated[str, StringConstraints(max_length=200)]
Phone = Annotated[str, StringConstraints(pattern=r"^\+?[0-9 ()\-]{7,20}$")]
Time = Annotated[str, StringConstraints(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]


def _email(v: str) -> str:
    return v.strip().lower()


# ── Auth ──────────────────────────────────────────────────────────────
class PatientRegister(Strict):
    first_name: Name
    last_name: Name
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    date_of_birth: Optional[date] = None
    gender: Optional[Literal["M", "F", "O", "N"]] = None
    phone: Optional[Phone] = None
    accept_terms: bool = True

    _e = field_validator("email")(lambda cls, v: _email(v))

    @field_validator("date_of_birth")
    @classmethod
    def _dob(cls, v: Optional[date]) -> Optional[date]:
        if v and not (date(1900, 1, 1) <= v <= date.today()):
            raise ValueError("Enter a valid date of birth")
        return v


class DoctorRegister(Strict):
    first_name: Name
    last_name: Name
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    license_number: Annotated[str, StringConstraints(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9\-/]+$")]
    specialty: Annotated[str, StringConstraints(min_length=2, max_length=60)]
    clinic_name: Optional[Annotated[str, StringConstraints(max_length=120)]] = None
    appointment_fee: float = Field(default=0, ge=0, le=100000)
    experience_years: Optional[int] = Field(default=None, ge=0, le=70)
    bio: Optional[Annotated[str, StringConstraints(max_length=600)]] = None

    _e = field_validator("email")(lambda cls, v: _email(v))


class LoginRequest(Strict):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    role: Literal["patient", "doctor"] = "patient"

    _e = field_validator("email")(lambda cls, v: _email(v))


class ChangePassword(Strict):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class ConfirmPassword(Strict):
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    user: Dict


# ── Profiles ──────────────────────────────────────────────────────────
class PatientUpdate(Strict):
    first_name: Optional[Name] = None
    last_name: Optional[Name] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Literal["M", "F", "O", "N"]] = None
    phone: Optional[Phone] = None
    medical_history: Optional[Annotated[str, StringConstraints(max_length=1500)]] = None
    conditions: Optional[List[Annotated[str, StringConstraints(max_length=60)]]] = Field(default=None, max_length=20)
    allergies: Optional[List[Annotated[str, StringConstraints(max_length=60)]]] = Field(default=None, max_length=20)
    current_medications: Optional[List[Annotated[str, StringConstraints(max_length=80)]]] = Field(default=None, max_length=30)
    emergency_contact_name: Optional[Annotated[str, StringConstraints(max_length=80)]] = None
    emergency_contact_phone: Optional[Phone] = None


class DoctorUpdate(Strict):
    clinic_name: Optional[Annotated[str, StringConstraints(max_length=120)]] = None
    appointment_fee: Optional[float] = Field(default=None, ge=0, le=100000)
    bio: Optional[Annotated[str, StringConstraints(max_length=600)]] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=70)
    accepting_patients: Optional[bool] = None


# ── Appointments ─────────────────────────────────────────────────────
class AppointmentCreate(Strict):
    doctor_id: Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{24}$")]
    preferred_date: date
    preferred_time: Time
    meeting_mode: Literal["video_call", "in_person", "phone"] = "video_call"
    message: Annotated[str, StringConstraints(max_length=600)] = ""

    @field_validator("preferred_date")
    @classmethod
    def _future(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Choose today or a future date")
        return v


class AppointmentDecision(Strict):
    note: Annotated[str, StringConstraints(max_length=400)] = ""


# ── Analysis (pose) ──────────────────────────────────────────────────
class PoseFrame(Strict):
    t: float = Field(ge=0, le=600)
    k: List[List[float]] = Field(min_length=33, max_length=33)

    @field_validator("k")
    @classmethod
    def _landmarks(cls, v: List[List[float]]) -> List[List[float]]:
        for p in v:
            if not 3 <= len(p) <= 4:
                raise ValueError("each landmark needs [x, y, z] or [x, y, z, visibility]")
            if any(abs(c) > 10 for c in p):
                raise ValueError("landmark coordinates out of range")
        return v


class PoseSession(Strict):
    task: Literal["walk", "stand", "hands"] = "walk"
    frames: List[PoseFrame] = Field(min_length=20, max_length=1800)
    device: Optional[ShortText] = None


# ── Assistant ─────────────────────────────────────────────────────────
class AssistantMessage(Strict):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{24}$")]] = None


# ── Medications ──────────────────────────────────────────────────────
class MedicationGuidanceRequest(Strict):
    symptoms: str = Field(min_length=2, max_length=600)
    age: Optional[int] = Field(default=None, ge=0, le=120)


class MedicationItem(Strict):
    name: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    dosage: Annotated[str, StringConstraints(max_length=60)] = ""
    frequency: Annotated[str, StringConstraints(max_length=60)] = "once daily"
    time_slots: List[Time] = Field(default_factory=list, max_length=8)
    duration_days: Optional[int] = Field(default=None, ge=1, le=3650)
    instructions: Annotated[str, StringConstraints(max_length=300)] = ""
    side_effects: List[Annotated[str, StringConstraints(max_length=60)]] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def _slots(self) -> "MedicationItem":
        if not self.time_slots:
            f = self.frequency.lower()
            self.time_slots = (["08:00", "14:00", "20:00"] if "three" in f or "8 hours" in f
                               else ["08:00", "20:00"] if "twice" in f or "12 hours" in f
                               else ["08:00", "12:00", "16:00", "20:00"] if "four" in f or "6 hours" in f
                               else ["21:00"] if "night" in f or "bed" in f else ["08:00"])
        self.time_slots = sorted(set(self.time_slots))
        return self


class MedicationTaken(Strict):
    medication_name: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    time_slot: Optional[Time] = None
    status: Literal["taken", "skipped"] = "taken"


# ── Fitness ──────────────────────────────────────────────────────────
class FitnessRecord(Strict):
    date: date
    bmi: Optional[float] = Field(default=None, ge=10, le=80)
    weight_kg: Optional[float] = Field(default=None, ge=2, le=400)
    stress_level: Optional[int] = Field(default=None, ge=1, le=10)
    walking_distance: Optional[float] = Field(default=None, ge=0, le=100)
    heart_rate: Optional[int] = Field(default=None, ge=25, le=230)
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    notes: Annotated[str, StringConstraints(max_length=300)] = ""

    @field_validator("date")
    @classmethod
    def _not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Date cannot be in the future")
        return v


# ── Chat ──────────────────────────────────────────────────────────────
class ChatSend(Strict):
    content: str = Field(min_length=1, max_length=2000)


# ── Video review ─────────────────────────────────────────────────────
class VideoReview(Strict):
    doctor_notes: Annotated[str, StringConstraints(max_length=2000)]


# ── SOS ───────────────────────────────────────────────────────────────
class SOSRequest(Strict):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    accuracy_m: Optional[float] = Field(default=None, ge=0, le=100000)
    message: Annotated[str, StringConstraints(max_length=200)] = ""


def strip_html(v: str) -> str:
    return re.sub(r"<[^>]*>", "", v or "")
