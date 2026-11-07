import os

# Must be set before the app (and its settings) are imported.
os.environ.update({
    "ENVIRONMENT": "test",
    "MONGODB_URL": "",
    "GEMINI_API_KEY": "",
    "XAI_API_KEY": "",
    "GROQ_API_KEY": "",
    "LLM_PROVIDER": "auto",
    "SECRET_KEY": "test-secret-key-0123456789-abcdefghijklmnop",
    "SEED_DEMO_DATA": "false",
    "COOKIE_SECURE": "false",
})

import httpx  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from asgi_lifespan import LifespanManager  # noqa: E402

from app.main import app  # noqa: E402

PASSWORD = "Str0ng!Passw0rd"


@pytest_asyncio.fixture
async def client():
    async with LifespanManager(app):
        from app.db.database import Database

        for name in await Database.get().list_collection_names():
            await Database.get()[name].delete_many({})
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
            yield c


async def register_patient(c, email="pat@example.com", first="Asha"):
    r = await c.post("/api/auth/patient/register", json={"first_name": first, "last_name": "K", "email": email, "password": PASSWORD})
    assert r.status_code == 201, r.text
    return r.json()["access_token"], r


async def register_doctor(c, email="doc@example.com"):
    r = await c.post("/api/auth/doctor/register", json={"first_name": "Neha", "last_name": "S", "email": email, "password": PASSWORD,
                                                        "license_number": "MCI-1234", "specialty": "Neurologist"})
    assert r.status_code == 201, r.text
    return r.json()["access_token"], r


def auth(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def anyio_backend():
    return "asyncio"
