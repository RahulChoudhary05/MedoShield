"""FastAPI dependencies for authentication and object-level authorisation."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token, utcnow
from app.core.utils import is_oid, parse_oid
from app.db.database import get_db

bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


@dataclass(frozen=True)
class Principal:
    user_id: str          # patients: user_id field, doctors: str(_id)
    role: str             # "patient" | "doctor"
    session_id: str
    patient_id: Optional[str] = None  # str(_id) of the patient document
    doc: Optional[dict] = None

    @property
    def is_patient(self) -> bool:
        return self.role == "patient"

    @property
    def is_doctor(self) -> bool:
        return self.role == "doctor"


async def get_principal(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Principal:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise _UNAUTHORIZED
    try:
        claims = decode_access_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired", headers={"WWW-Authenticate": 'Bearer error="invalid_token"'})
    except jwt.PyJWTError:
        raise _UNAUTHORIZED

    db = get_db()
    # Server-side session check: logout / password change / reuse detection revoke instantly.
    session = await db["auth_sessions"].find_one({"session_id": claims["sid"], "revoked": False})
    if not session or session.get("user_id") != claims["sub"]:
        raise _UNAUTHORIZED
    exp = session.get("expires_at")
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=utcnow().tzinfo)
    if exp is not None and exp < utcnow():
        raise _UNAUTHORIZED

    role, sub = claims["role"], claims["sub"]
    if role == "patient":
        doc = await db["patients"].find_one({"user_id": sub})
        if not doc or not doc.get("is_active", True):
            raise _UNAUTHORIZED
        principal = Principal(user_id=sub, role=role, session_id=claims["sid"], patient_id=str(doc["_id"]), doc=doc)
    else:
        if not is_oid(sub):
            raise _UNAUTHORIZED
        doc = await db["doctors"].find_one({"_id": parse_oid(sub)})
        if not doc or not doc.get("is_active", True):
            raise _UNAUTHORIZED
        principal = Principal(user_id=sub, role=role, session_id=claims["sid"], doc=doc)

    request.state.principal = principal
    return principal


def require_roles(*roles: str):
    allowed = set(roles)

    async def guard(principal: Principal = Depends(get_principal)) -> Principal:
        if principal.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this resource")
        return principal

    return guard


require_patient = require_roles("patient")
require_doctor = require_roles("doctor")
require_any = require_roles("patient", "doctor")


async def doctor_has_patient(doctor_id: str, patient_id: str) -> Optional[dict]:
    return await get_db()["patient_doctor_assignments"].find_one(
        {"patient_id": patient_id, "doctor_id": doctor_id, "is_active": True}
    )


async def resolve_patient(principal: Principal, patient_id: Optional[str] = None) -> dict:
    """Return the patient document the caller is allowed to act on (object-level authz).

    * patient: always themselves - a foreign patient_id is rejected.
    * doctor:  only patients with an active care assignment.
    """
    db = get_db()
    if principal.is_patient:
        if patient_id and patient_id not in (principal.patient_id, principal.user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own records")
        return principal.doc  # type: ignore[return-value]

    if not patient_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="patient_id is required")
    oid = parse_oid(patient_id, "patient")
    if not await doctor_has_patient(principal.user_id, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This patient is not under your care")
    patient = await db["patients"].find_one({"_id": oid})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


def ensure_roles(principal: Principal, roles: Iterable[str]) -> None:
    if principal.role not in set(roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this resource")
