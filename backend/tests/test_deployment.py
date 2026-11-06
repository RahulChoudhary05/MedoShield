"""Production-topology behaviour: Cloudflare proxy trust, origin lock, DB keep-alive, DB-backed media."""
import datetime as dt

import pytest
from starlette.requests import Request

from app.core import net
from app.core.config import settings
from app.db.database import Database
from tests.conftest import auth, register_doctor, register_patient

pytestmark = pytest.mark.asyncio


def _req(headers, client=("10.0.0.1", 1234)):
    return Request({"type": "http", "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()], "client": client, "path": "/", "method": "GET"})


async def test_client_ip_trusted_only_with_secret(monkeypatch):
    monkeypatch.setattr(settings, "PROXY_SHARED_SECRET", "s3cret-value")
    assert net.client_ip(_req({"X-Client-IP": "203.0.113.9", "X-Proxy-Secret": "s3cret-value"})) == "203.0.113.9"
    # spoof attempts without / with wrong secret fall back to the socket address
    assert net.client_ip(_req({"X-Client-IP": "203.0.113.9"})) == "10.0.0.1"
    assert net.client_ip(_req({"X-Client-IP": "203.0.113.9", "X-Proxy-Secret": "nope"})) == "10.0.0.1"
    # garbage IP values are ignored
    assert net.client_ip(_req({"X-Client-IP": "not-an-ip", "X-Proxy-Secret": "s3cret-value"})) == "10.0.0.1"


async def test_origin_lock(client, monkeypatch):
    monkeypatch.setattr(settings, "PROXY_SHARED_SECRET", "s3cret-value")
    monkeypatch.setattr(settings, "REQUIRE_PROXY_SECRET", True)
    assert (await client.get("/api/auth/me")).status_code == 403
    assert (await client.get("/api/auth/me", headers={"X-Proxy-Secret": "s3cret-value"})).status_code == 401  # reached the API
    assert (await client.get("/health")).status_code == 200  # health stays public for uptime pings


async def test_heartbeat_ping(client):
    assert await Database.ping() is True
    assert Database.healthy and isinstance(Database.last_ping_at, dt.datetime)


async def test_chat_media_stored_in_db(client):
    a, _ = await register_patient(client)
    client.cookies.clear()
    d, _ = await register_doctor(client)
    doc_id = (await client.get("/api/doctors/profile", headers=auth(d))).json()["id"]
    appt = (await client.post("/api/doctors/appointments", headers=auth(a), json={"doctor_id": doc_id, "preferred_date": dt.date.today().isoformat(), "preferred_time": "09:00"})).json()["id"]
    await client.post(f"/api/doctors/appointments/{appt}/accept", headers=auth(d))
    pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
    r = await client.post(f"/api/chat/{doc_id}/media", headers=auth(a), files={"file": ("lab.pdf", pdf, "application/pdf")}, data={"kind": "file"})
    assert r.status_code == 201, r.text
    url = r.json()["media_url"]
    got = await client.get(url, headers=auth(d))
    assert got.status_code == 200 and got.content == pdf and got.headers["content-type"].startswith("application/pdf")
    assert await Database.get()["media_files"].count_documents({}) == 1
