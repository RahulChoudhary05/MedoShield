import jwt
import pytest

from app.ai_engine.synthetic import make_frames
from tests.conftest import PASSWORD, auth, register_doctor, register_patient

pytestmark = pytest.mark.asyncio


async def test_security_headers_and_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    for h in ("x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy", "x-request-id"):
        assert h in r.headers
    assert "server" not in {k.lower() for k in r.headers if r.headers[k].lower().startswith("uvicorn")}


async def test_weak_password_rejected(client):
    r = await client.post("/api/auth/patient/register", json={"first_name": "A", "last_name": "B", "email": "a@b.com", "password": "password123"})
    assert r.status_code == 422


async def test_unknown_fields_and_nosql_operators_rejected(client):
    r = await client.post("/api/auth/login", json={"email": {"$ne": None}, "password": {"$ne": None}})
    assert r.status_code == 422
    r = await client.post("/api/auth/patient/register", json={"first_name": "A", "last_name": "B", "email": "x@y.com", "password": PASSWORD, "is_admin": True})
    assert r.status_code == 422


async def test_login_no_enumeration_and_lockout(client):
    await register_patient(client)
    r1 = await client.post("/api/auth/login", json={"email": "pat@example.com", "password": "Wrong!Pass123"})
    r2 = await client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "Wrong!Pass123"})
    assert r1.status_code == r2.status_code == 401 and r1.json() == r2.json()
    for _ in range(5):
        await client.post("/api/auth/login", json={"email": "pat@example.com", "password": "Wrong!Pass123"})
    r = await client.post("/api/auth/login", json={"email": "pat@example.com", "password": PASSWORD})
    assert r.status_code == 429  # locked even with the right password


async def test_tokens_cookie_refresh_rotation_and_reuse_detection(client):
    _, reg = await register_patient(client)
    cookie = reg.cookies.get("ms_refresh")
    assert cookie and "httponly" in reg.headers["set-cookie"].lower()
    # CSRF guard header required
    assert (await client.post("/api/auth/refresh")).status_code == 403
    r = await client.post("/api/auth/refresh", headers={"X-CSRF-Guard": "1"})
    assert r.status_code == 200
    new_access = r.json()["access_token"]
    # replay the old (rotated) refresh token -> whole family revoked
    client.cookies.set("ms_refresh", cookie, path="/api/auth")
    assert (await client.post("/api/auth/refresh", headers={"X-CSRF-Guard": "1"})).status_code == 401
    assert (await client.get("/api/auth/me", headers=auth(new_access))).status_code == 401


async def test_tampered_and_alg_none_tokens_rejected(client):
    token, _ = await register_patient(client)
    claims = jwt.decode(token, options={"verify_signature": False})
    forged = jwt.encode({**claims, "role": "doctor"}, "wrong-key", algorithm="HS256")
    assert (await client.get("/api/auth/me", headers=auth(forged))).status_code == 401
    none_tok = jwt.encode({**claims}, None, algorithm="none") if hasattr(jwt, "encode") else ""
    assert (await client.get("/api/auth/me", headers=auth(none_tok))).status_code == 401


async def test_logout_revokes_access_token(client):
    token, _ = await register_patient(client)
    assert (await client.post("/api/auth/logout", headers={"X-CSRF-Guard": "1"})).status_code == 204
    assert (await client.get("/api/auth/me", headers=auth(token))).status_code == 401


async def test_object_level_authorization(client):
    a, _ = await register_patient(client, "a@example.com")
    client.cookies.clear()
    b, _ = await register_patient(client, "b@example.com", "Bela")
    client.cookies.clear()
    d, _ = await register_doctor(client)
    me_a = (await client.get("/api/patients/me", headers=auth(a))).json()
    # Patient B cannot read A's records
    for path in (f"/api/analysis/sessions?patient_id={me_a['id']}", f"/api/timeline?patient_id={me_a['id']}", f"/api/medications/plan?patient_id={me_a['id']}"):
        assert (await client.get(path, headers=auth(b))).status_code == 403, path
    # Doctor without an accepted appointment cannot read A, cannot unlock video
    assert (await client.get(f"/api/doctors/patients/{me_a['id']}/overview", headers=auth(d))).status_code == 403
    assert (await client.post(f"/api/video/unlock/{me_a['id']}", headers=auth(d))).status_code == 403
    # Role separation
    assert (await client.get("/api/doctors/patients", headers=auth(a))).status_code == 403
    # Old self-assign endpoint is gone
    assert (await client.post(f"/api/doctors/assign-patient/{me_a['id']}", headers=auth(d))).status_code in (404, 405)


async def test_care_link_flow_unlocks_access(client):
    a, _ = await register_patient(client)
    client.cookies.clear()
    d, _ = await register_doctor(client)
    doc_id = (await client.get("/api/doctors/profile", headers=auth(d))).json()["id"]
    import datetime as dt
    r = await client.post("/api/doctors/appointments", headers=auth(a), json={"doctor_id": doc_id, "preferred_date": dt.date.today().isoformat(), "preferred_time": "10:30"})
    assert r.status_code == 201, r.text
    appt = r.json()["id"]
    assert (await client.post(f"/api/doctors/appointments/{appt}/accept", headers=auth(d))).status_code == 200
    pats = (await client.get("/api/doctors/patients", headers=auth(d))).json()["patients"]
    assert len(pats) == 1
    pid = pats[0]["id"]
    assert (await client.get(f"/api/doctors/patients/{pid}/overview", headers=auth(d))).status_code == 200
    # chat both directions
    assert (await client.post(f"/api/chat/{doc_id}/messages", headers=auth(a), json={"content": "Hello doctor"})).status_code == 201
    msgs = (await client.get(f"/api/chat/{pid}/messages", headers=auth(d))).json()["messages"]
    assert msgs[-1]["content"] == "Hello doctor"


async def test_invalid_object_ids_are_404_not_500(client):
    a, _ = await register_patient(client)
    for path in ("/api/analysis/sessions/not-an-id", "/api/reports/zzz", "/api/video/../../etc/pdf"):
        r = await client.get(path, headers=auth(a))
        assert r.status_code in (404, 422), (path, r.status_code)


async def test_pose_session_analysis_end_to_end(client):
    a, _ = await register_patient(client)
    r = await client.post("/api/analysis/sessions", headers=auth(a), json={"task": "walk", "frames": make_frames(tremor_hz=5, tremor_amp=0.012, duration=9)})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["features"]["tremor_frequency"] == pytest.approx(5.0, abs=0.6)
    assert body["risk"]["classification"] in ("MEDIUM", "HIGH")
    assert body["quality"]["usable"] is True
    # malformed landmark arrays are rejected
    bad = make_frames(duration=4)
    bad[0]["k"] = bad[0]["k"][:10]
    assert (await client.post("/api/analysis/sessions", headers=auth(a), json={"frames": bad})).status_code == 422


async def test_upload_type_sniffing(client):
    a, _ = await register_patient(client)
    fake_pdf = ("report.pdf", b"MZ\x90\x00 this is actually an exe", "application/pdf")
    r = await client.post("/api/reports/analyze", headers=auth(a), files={"file": fake_pdf})
    assert r.status_code == 415
