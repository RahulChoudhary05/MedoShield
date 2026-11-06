"""Authentication for patients and doctors.

* Access token (15 min JWT) returned in the body and kept in memory by the SPA.
* Refresh token (opaque, 7 days) in an httpOnly + Secure + SameSite cookie, scoped
  to /api/auth. Rotated on every refresh; re-use of a rotated token revokes the
  whole token family (stolen-token detection).
* Refresh/logout require the `X-CSRF-Guard` header: a custom header forces a CORS
  preflight, so cross-site forms/images cannot ride the cookie.
* Brute force: per-IP rate limits + per-account progressive lockout, generic
  error messages and constant-time verification (no account enumeration).
"""

import uuid
from datetime import timedelta
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pymongo.errors import DuplicateKeyError

from app.core.audit import audit, security_event
from app.core.config import settings
from app.core.deps import Principal, get_principal
from app.core.net import client_ip
from app.core.rate_limit import ip_key, limiter
from app.core.security import (create_access_token, digest_token, hash_password, new_refresh_token,
                               password_policy_errors, utcnow, verify_password)
from app.db.database import get_db
from app.schemas import ChangePassword, DoctorRegister, LoginRequest, PatientRegister, TokenResponse
from app.serializers import doctor_public, patient_public

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_PATH = "/api/auth"
CSRF_HEADER = "x-csrf-guard"


def _require_csrf(request: Request) -> None:
    if request.headers.get(CSRF_HEADER) != "1":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CSRF guard header")


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME, token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True, secure=bool(settings.COOKIE_SECURE), samesite=settings.COOKIE_SAMESITE,
        path=COOKIE_PATH, domain=settings.COOKIE_DOMAIN,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=COOKIE_PATH, domain=settings.COOKIE_DOMAIN,
                           secure=bool(settings.COOKIE_SECURE), httponly=True, samesite=settings.COOKIE_SAMESITE)


async def _issue_session(response: Response, request: Request, *, user_id: str, role: str, user_doc: dict,
                         family: Optional[str] = None) -> TokenResponse:
    db = get_db()
    session_id = uuid.uuid4().hex
    refresh = new_refresh_token()
    now = utcnow()
    await db["auth_sessions"].insert_one({
        "session_id": session_id,
        "family": family or uuid.uuid4().hex,
        "token_hash": digest_token(refresh),
        "user_id": user_id,
        "role": role,
        "revoked": False,
        "rotated": False,
        "created_at": now,
        "expires_at": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "ip": client_ip(request),
        "user_agent": request.headers.get("user-agent", "")[:200],
    })
    access, ttl = create_access_token(user_id, role, session_id)
    _set_refresh_cookie(response, refresh)
    user = patient_public(user_doc) if role == "patient" else doctor_public(user_doc)
    return TokenResponse(access_token=access, expires_in=ttl, role=role, user=user)


# ── Lockout helpers ──────────────────────────────────────────────────────
async def _locked_until(key: str):
    rec = await get_db()["login_attempts"].find_one({"key": key})
    until = rec.get("locked_until") if rec else None
    if until is not None and until.tzinfo is None:
        until = until.replace(tzinfo=utcnow().tzinfo)
    return until if until and until > utcnow() else None


async def _record_failure(key: str) -> None:
    db = get_db()
    rec = await db["login_attempts"].find_one_and_update(
        {"key": key}, {"$inc": {"count": 1}, "$set": {"updated_at": utcnow()}}, upsert=True, return_document=True)
    count = (rec or {}).get("count", 1)
    if count >= settings.MAX_FAILED_LOGINS:
        # progressive: 15, 30, 60 ... minutes, capped at 24h
        factor = 2 ** max(0, (count - settings.MAX_FAILED_LOGINS) // settings.MAX_FAILED_LOGINS)
        minutes = min(settings.LOCKOUT_MINUTES * factor, 1440)
        await db["login_attempts"].update_one({"key": key}, {"$set": {"locked_until": utcnow() + timedelta(minutes=minutes)}})


async def _clear_failures(key: str) -> None:
    await get_db()["login_attempts"].delete_one({"key": key})


def _policy_or_422(password: str, email: str, name: str) -> None:
    errors = password_policy_errors(password, email=email, name=name)
    if errors:
        raise HTTPException(status_code=422, detail="Password must have " + ", ".join(errors) + ".")


# ── Routes ───────────────────────────────────────────────────────────────
@router.post("/patient/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/hour", key_func=ip_key)
async def register_patient(request: Request, response: Response, body: PatientRegister):
    _policy_or_422(body.password, body.email, body.first_name)
    if not body.accept_terms:
        raise HTTPException(status_code=422, detail="Please accept the terms to continue")
    db = get_db()
    now = utcnow()
    doc = {
        "user_id": str(ObjectId()),
        "first_name": body.first_name, "last_name": body.last_name, "email": body.email,
        "date_of_birth": body.date_of_birth.isoformat() if body.date_of_birth else None,
        "gender": body.gender, "phone": body.phone,
        "medical_history": None, "conditions": [], "allergies": [], "current_medications": [],
        "hashed_password": hash_password(body.password),
        "is_active": True, "created_at": now, "updated_at": now, "consent_at": now,
    }
    try:
        res = await db["patients"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if await db["patients"].count_documents({"email": body.email}) > 1:  # in-memory DB has no unique index guarantees
        await db["patients"].delete_one({"_id": res.inserted_id})
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    doc["_id"] = res.inserted_id
    await audit("patient.register", actor_id=doc["user_id"], role="patient", request=request)
    return await _issue_session(response, request, user_id=doc["user_id"], role="patient", user_doc=doc)


@router.post("/doctor/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/hour", key_func=ip_key)
async def register_doctor(request: Request, response: Response, body: DoctorRegister):
    _policy_or_422(body.password, body.email, body.first_name)
    db = get_db()
    if await db["doctors"].find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    now = utcnow()
    doc = {
        "doctor_id": f"DOC-{ObjectId()}",
        "first_name": body.first_name, "last_name": body.last_name, "email": body.email,
        "password_hash": hash_password(body.password),
        "specialty": body.specialty, "clinic_name": body.clinic_name, "license_number": body.license_number.upper(),
        "appointment_fee": body.appointment_fee, "experience_years": body.experience_years, "bio": body.bio,
        "rating": None, "accepting_patients": True,
        # Licence verification is a manual/ops step; the badge is shown to patients.
        "license_verified": False,
        "is_active": True, "created_at": now, "updated_at": now,
    }
    try:
        res = await db["doctors"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    doc["_id"] = res.inserted_id
    await audit("doctor.register", actor_id=str(res.inserted_id), role="doctor", request=request)
    return await _issue_session(response, request, user_id=str(res.inserted_id), role="doctor", user_doc=doc)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute;60/hour", key_func=ip_key)
async def login(request: Request, response: Response, body: LoginRequest):
    db = get_db()
    key = f"{body.role}:{body.email}"
    if await _locked_until(key):
        await security_event("login.locked", request, {"key": key})
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later or reset your password.")

    coll, hash_field = ("patients", "hashed_password") if body.role == "patient" else ("doctors", "password_hash")
    user = await db[coll].find_one({"email": body.email})
    ok, needs_rehash = verify_password(body.password, (user or {}).get(hash_field))
    if not ok or not user:
        await _record_failure(key)
        await audit("auth.login", actor_id=None, role=body.role, request=request, outcome="failure", meta={"email_hash": digest_token(body.email)[:16]})
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="This account is disabled")

    await _clear_failures(key)
    if needs_rehash:
        await db[coll].update_one({"_id": user["_id"]}, {"$set": {hash_field: hash_password(body.password), "updated_at": utcnow()}})
    await db[coll].update_one({"_id": user["_id"]}, {"$set": {"last_login_at": utcnow()}})

    user_id = user["user_id"] if body.role == "patient" else str(user["_id"])
    await audit("auth.login", actor_id=user_id, role=body.role, request=request)
    return await _issue_session(response, request, user_id=user_id, role=body.role, user_doc=user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute", key_func=ip_key)
async def refresh(request: Request, response: Response):
    _require_csrf(request)
    token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No active session")
    db = get_db()
    session = await db["auth_sessions"].find_one({"token_hash": digest_token(token)})
    if not session:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired")

    if session.get("rotated") or session.get("revoked"):
        # A rotated token was replayed -> assume theft, kill the whole family.
        await db["auth_sessions"].update_many({"family": session["family"]}, {"$set": {"revoked": True}})
        await security_event("refresh.reuse", request, {"family": session["family"], "user_id": session.get("user_id")})
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session revoked. Please sign in again.")

    exp = session.get("expires_at")
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=utcnow().tzinfo)
    if exp is not None and exp < utcnow():
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired")

    role, user_id = session["role"], session["user_id"]
    if role == "patient":
        user = await db["patients"].find_one({"user_id": user_id})
    else:
        user = await db["doctors"].find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Session expired")

    await db["auth_sessions"].update_one({"_id": session["_id"]}, {"$set": {"rotated": True, "revoked": True, "rotated_at": utcnow()}})
    return await _issue_session(response, request, user_id=user_id, role=role, user_doc=user, family=session["family"])


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response):
    _require_csrf(request)
    token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if token:
        db = get_db()
        session = await db["auth_sessions"].find_one({"token_hash": digest_token(token)})
        if session:
            await db["auth_sessions"].update_many({"family": session["family"]}, {"$set": {"revoked": True}})
    _clear_refresh_cookie(response)
    response.status_code = 204
    return response


@router.post("/logout-all", status_code=204)
async def logout_all(request: Request, response: Response, principal: Principal = Depends(get_principal)):
    _require_csrf(request)
    await get_db()["auth_sessions"].update_many({"user_id": principal.user_id, "role": principal.role}, {"$set": {"revoked": True}})
    _clear_refresh_cookie(response)
    await audit("auth.logout_all", actor_id=principal.user_id, role=principal.role, request=request)
    response.status_code = 204
    return response


@router.get("/me")
async def me(principal: Principal = Depends(get_principal)):
    user = patient_public(principal.doc) if principal.is_patient else doctor_public(principal.doc)
    return {"role": principal.role, "user": user}


@router.post("/change-password", status_code=204)
@limiter.limit("5/hour")
async def change_password(request: Request, response: Response, body: ChangePassword, principal: Principal = Depends(get_principal)):
    db = get_db()
    coll, field = ("patients", "hashed_password") if principal.is_patient else ("doctors", "password_hash")
    ok, _ = verify_password(body.current_password, principal.doc.get(field))
    if not ok:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    _policy_or_422(body.new_password, principal.doc.get("email", ""), principal.doc.get("first_name", ""))
    await db[coll].update_one({"_id": principal.doc["_id"]}, {"$set": {field: hash_password(body.new_password), "updated_at": utcnow()}})
    # Revoke every other session.
    await db["auth_sessions"].update_many({"user_id": principal.user_id, "role": principal.role, "session_id": {"$ne": principal.session_id}},
                                          {"$set": {"revoked": True}})
    await audit("auth.change_password", actor_id=principal.user_id, role=principal.role, request=request)
    response.status_code = 204
    return response


@router.get("/sessions")
async def list_sessions(principal: Principal = Depends(get_principal)):
    rows = await get_db()["auth_sessions"].find(
        {"user_id": principal.user_id, "role": principal.role, "revoked": False}
    ).sort("created_at", -1).to_list(20)
    return {"sessions": [{"current": r["session_id"] == principal.session_id, "created_at": r["created_at"],
                          "ip": r.get("ip"), "user_agent": r.get("user_agent")} for r in rows]}


Role = Literal["patient", "doctor"]
