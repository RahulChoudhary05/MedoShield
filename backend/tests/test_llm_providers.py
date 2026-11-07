"""Provider routing for the LLM client (no network: HTTP calls are faked)."""
import pytest

from app.ai import llm
from app.core.config import settings


class FakeResp:
    def __init__(self, status, data):
        self.status_code, self._data, self.text = status, data, str(data)

    def json(self):
        return self._data


class FakeClient:
    def __init__(self, routes):
        self.routes, self.calls = routes, []

    async def post(self, url, json=None, headers=None):
        self.calls.append((url, json, headers))
        for key, resp in self.routes.items():
            if key in url:
                return resp(json) if callable(resp) else resp
        raise AssertionError(url)


GROK_OK = FakeResp(200, {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": "grok says hi"}]}]})
GEMINI_OK = FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "gemini says hi"}]}}]})


@pytest.fixture
def keys(monkeypatch):
    def set_keys(xai="", gemini="", provider="auto", groq=""):
        monkeypatch.setattr(settings, "GROQ_API_KEY", groq)
        monkeypatch.setattr(settings, "XAI_API_KEY", xai)
        monkeypatch.setattr(settings, "GEMINI_API_KEY", gemini)
        monkeypatch.setattr(settings, "LLM_PROVIDER", provider)
    return set_keys


def install(monkeypatch, routes):
    fake = FakeClient(routes)
    monkeypatch.setattr(llm, "_http", lambda: fake)
    return fake


@pytest.mark.asyncio
async def test_grok_is_default_and_private(monkeypatch, keys):
    keys(xai="xai-test", gemini="g-test")
    fake = install(monkeypatch, {"api.x.ai": GROK_OK, "generativelanguage": GEMINI_OK})
    out = await llm.generate(system="sys", contents=[llm.user_text("hello")], json_schema={"type": "OBJECT", "properties": {"a": {"type": "STRING"}}})
    assert out == "grok says hi" and llm.primary() == "grok"
    url, body, headers = fake.calls[0]
    assert url.endswith("/v1/responses") and "key=" not in url
    assert headers["Authorization"] == "Bearer xai-test"
    assert body["store"] is False and body["instructions"] == "sys"
    assert body["text"]["format"]["schema"] == {"type": "object", "properties": {"a": {"type": "string"}}}


@pytest.mark.asyncio
async def test_falls_back_to_gemini_when_grok_fails(monkeypatch, keys):
    keys(xai="xai-test", gemini="g-test")
    install(monkeypatch, {"api.x.ai": FakeResp(401, {"error": "bad key"}), "generativelanguage": GEMINI_OK})
    assert await llm.generate(system="s", contents=[llm.user_text("x")]) == "gemini says hi"


@pytest.mark.asyncio
async def test_video_skips_grok(monkeypatch, keys):
    keys(xai="xai-test", gemini="g-test")
    fake = install(monkeypatch, {"api.x.ai": GROK_OK, "generativelanguage": GEMINI_OK})
    parts = [{"text": "analyse"}, llm.inline_media("video/webm", "AAAA")]
    assert await llm.generate(system="s", contents=[{"role": "user", "parts": parts}]) == "gemini says hi"
    assert all("api.x.ai" not in c[0] for c in fake.calls)


@pytest.mark.asyncio
async def test_grok_only_has_no_video(monkeypatch, keys):
    keys(xai="xai-test")
    assert llm.available() and not llm.supports_video() and llm.model_name() == settings.GROK_MODEL


@pytest.mark.asyncio
async def test_no_keys_means_rules_engine(monkeypatch, keys):
    keys()
    assert not llm.available() and llm.model_name() == "rules-engine"
    assert await llm.generate(system="s", contents=[llm.user_text("x")]) == ""


GROQ_OK = FakeResp(200, {"choices": [{"message": {"content": "groq says hi"}}]})


@pytest.mark.asyncio
async def test_groq_preferred_with_schema(monkeypatch, keys):
    keys(groq="gsk_test", xai="xai-test", gemini="g-test")
    fake = install(monkeypatch, {"api.groq.com": GROQ_OK, "api.x.ai": GROK_OK, "generativelanguage": GEMINI_OK})
    out = await llm.generate(system="sys", contents=[llm.user_text("hi")], json_schema={"type": "OBJECT", "properties": {"a": {"type": "STRING"}}})
    assert out == "groq says hi" and llm.primary() == "groq"
    url, body, headers = fake.calls[0]
    assert url.endswith("/openai/v1/chat/completions") and headers["Authorization"] == "Bearer gsk_test"
    assert body["messages"][0] == {"role": "system", "content": "sys"}
    assert body["response_format"]["type"] == "json_schema" and body["response_format"]["json_schema"]["schema"]["type"] == "object"


@pytest.mark.asyncio
async def test_groq_video_goes_to_gemini(monkeypatch, keys):
    keys(groq="gsk_test", gemini="g-test")
    install(monkeypatch, {"api.groq.com": GROQ_OK, "generativelanguage": GEMINI_OK})
    parts = [{"text": "x"}, llm.inline_media("video/mp4", "AAAA")]
    assert await llm.generate(system="s", contents=[{"role": "user", "parts": parts}]) == "gemini says hi"
