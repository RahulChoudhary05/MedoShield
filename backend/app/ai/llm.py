"""Multi-provider LLM client: Groq, xAI Grok and Google Gemini with automatic fallback.

Groq (OpenAI-compatible chat completions, free developer tier) is preferred when
GROQ_API_KEY is set; GPT-OSS models get schema-guided JSON via response_format.

Provider selection (`LLM_PROVIDER`):
  * "grok"   - use Grok; fall back to Gemini if a Gemini key exists and Grok fails
  * "gemini" - use Gemini; fall back to Grok likewise
  * "auto"   - Grok when XAI_API_KEY is set, otherwise Gemini (default)

Grok uses the xAI Responses API (POST /v1/responses):
  * system prompt goes in `instructions`, separate from untrusted content
  * strict JSON-schema output via `text.format`
  * `store: false` so no health data is retained on xAI's side
Gemini uses generateContent with `systemInstruction` and `responseSchema`.

Both providers: keys travel only in headers (never URLs), bounded retries with
jitter on 429/5xx, timeouts, and "" on failure so every feature has a
deterministic fallback. Callers pass Gemini-style `contents`; this module
translates them per provider. Video input is Gemini-only (Grok accepts text and
images), see `supports_video()`.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

log = logging.getLogger("medoshield.llm")

_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_GEMINI_SAFETY = [
    {"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
    for c in ("HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT")
]

_client: Optional[httpx.AsyncClient] = None
_grok_reasoning_ok = True  # flipped off if the model rejects the reasoning parameter


# ── Provider selection ──────────────────────────────────────────────────
def _has_groq() -> bool:
    return bool(settings.GROQ_API_KEY)


def _has_grok() -> bool:
    return bool(settings.XAI_API_KEY)


def _has_gemini() -> bool:
    return bool(settings.GEMINI_API_KEY)


_HAS = {"groq": _has_groq, "grok": _has_grok, "gemini": _has_gemini}


def _order() -> List[str]:
    keyed = [p for p in ("groq", "grok", "gemini") if _HAS[p]()]
    pref = settings.LLM_PROVIDER
    if pref in keyed:
        keyed.remove(pref)
        keyed.insert(0, pref)
    return keyed


def primary() -> Optional[str]:
    order = _order()
    return order[0] if order else None


def available() -> bool:
    return primary() is not None


def supports_video() -> bool:
    return _has_gemini()


def model_name() -> str:
    p = primary()
    if p == "groq":
        return settings.GROQ_MODEL
    if p == "grok":
        return settings.GROK_MODEL
    if p == "gemini":
        return settings.GEMINI_MODEL
    return "rules-engine"


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(settings.LLM_TIMEOUT_SECONDS, connect=10.0))
    return _client


async def close() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


# ── Public API ──────────────────────────────────────────────────────────
async def generate(
    *,
    system: str,
    contents: List[Dict[str, Any]],
    temperature: float = 0.4,
    max_tokens: int = 1024,
    json_schema: Optional[Dict[str, Any]] = None,
) -> str:
    """Return model text, or "" when no provider is available or all fail."""
    has_video = any("inline_data" in p for c in contents for p in c.get("parts", []) if isinstance(p, dict))
    for provider in _order():
        if provider in ("grok", "groq") and has_video:
            continue  # only Gemini accepts video
        try:
            if provider == "groq":
                out = await _groq(system, contents, temperature, max_tokens, json_schema)
            elif provider == "grok":
                out = await _grok(system, contents, temperature, max_tokens, json_schema)
            else:
                out = await _gemini(system, contents, temperature, max_tokens, json_schema)
        except Exception as exc:  # never let a provider error escape
            log.warning("%s call failed (%s)", provider, type(exc).__name__)
            out = ""
        if out:
            return out
    return ""


# ── xAI Grok (Responses API) ────────────────────────────────────────────
def to_json_schema(schema: Any) -> Any:
    """Convert our Gemini-style schema (type: "OBJECT") into standard JSON Schema."""
    if isinstance(schema, dict):
        out = {}
        for k, v in schema.items():
            if k == "type" and isinstance(v, str):
                out[k] = v.lower()
            elif k in ("properties",):
                out[k] = {pk: to_json_schema(pv) for pk, pv in v.items()}
            else:
                out[k] = to_json_schema(v)
        return out
    if isinstance(schema, list):
        return [to_json_schema(x) for x in schema]
    return schema


def _grok_input(contents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    msgs = []
    for c in contents:
        role = "assistant" if c.get("role") == "model" else "user"
        texts = [p["text"] for p in c.get("parts", []) if isinstance(p, dict) and p.get("text")]
        if texts:
            msgs.append({"role": role, "content": "\n".join(texts)})
    return msgs


async def _grok(system, contents, temperature, max_tokens, json_schema) -> str:
    global _grok_reasoning_ok
    payload: Dict[str, Any] = {
        "model": settings.GROK_MODEL,
        "instructions": system,
        "input": _grok_input(contents),
        "temperature": temperature,
        "max_output_tokens": max_tokens,
        "store": False,
    }
    if json_schema is not None:
        payload["text"] = {"format": {"type": "json_schema", "name": "medoshield_output", "schema": to_json_schema(json_schema), "strict": True}}
    if settings.GROK_REASONING_EFFORT and _grok_reasoning_ok:
        payload["reasoning"] = {"effort": settings.GROK_REASONING_EFFORT}

    url = f"{settings.XAI_BASE_URL.rstrip('/')}/responses"
    headers = {"Authorization": f"Bearer {settings.XAI_API_KEY}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            resp = await _http().post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            log.warning("Grok request error (%s)", type(exc).__name__)
            await asyncio.sleep(1 + random.random())
            continue
        if resp.status_code == 400 and "reasoning" in payload and "reason" in resp.text.lower():
            _grok_reasoning_ok = False  # this model doesn't take an effort setting
            payload.pop("reasoning", None)
            continue
        if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            await asyncio.sleep((2 ** attempt) + random.random())
            continue
        if resp.status_code != 200:
            log.warning("Grok HTTP %s", resp.status_code)
            return ""
        data = resp.json()
        if data.get("status") not in (None, "completed"):
            return ""
        texts = []
        for item in data.get("output") or []:
            if item.get("type") == "message":
                for part in item.get("content") or []:
                    if part.get("type") == "output_text" and part.get("text"):
                        texts.append(part["text"])
        return "".join(texts).strip()
    return ""


# ── Groq (OpenAI-compatible chat completions) ──────────────────────────
_GROQ_SCHEMA_MODELS = ("openai/gpt-oss", "qwen/qwen3", "meta-models/muse-spark")
_groq_reasoning_ok = True


async def _groq(system, contents, temperature, max_tokens, json_schema) -> str:
    global _groq_reasoning_ok
    model = settings.GROQ_MODEL
    sys_text = system
    payload: Dict[str, Any] = {"model": model, "temperature": temperature, "max_completion_tokens": max_tokens}
    if json_schema is not None:
        schema = to_json_schema(json_schema)
        if model.startswith(_GROQ_SCHEMA_MODELS):
            payload["response_format"] = {"type": "json_schema", "json_schema": {"name": "medoshield_output", "strict": False, "schema": schema}}
        else:  # older models: JSON mode + schema described in the instructions
            payload["response_format"] = {"type": "json_object"}
            sys_text += "\n\nReply ONLY with a JSON object matching this JSON Schema:\n" + json.dumps(schema)
    if model.startswith("openai/gpt-oss") and settings.GROQ_REASONING_EFFORT and _groq_reasoning_ok:
        payload["reasoning_effort"] = settings.GROQ_REASONING_EFFORT
    payload["messages"] = [{"role": "system", "content": sys_text}] + _grok_input(contents)

    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            resp = await _http().post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            log.warning("Groq request error (%s)", type(exc).__name__)
            await asyncio.sleep(1 + random.random())
            continue
        if resp.status_code == 400 and "reasoning_effort" in payload and "reasoning" in resp.text.lower():
            _groq_reasoning_ok = False
            payload.pop("reasoning_effort", None)
            continue
        if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            await asyncio.sleep((2 ** attempt) + random.random())
            continue
        if resp.status_code != 200:
            log.warning("Groq HTTP %s", resp.status_code)
            return ""
        choices = resp.json().get("choices") or []
        if not choices:
            return ""
        return (choices[0].get("message", {}).get("content") or "").strip()
    return ""


# ── Google Gemini ───────────────────────────────────────────────────────
async def _gemini(system, contents, temperature, max_tokens, json_schema) -> str:
    gen_cfg: Dict[str, Any] = {"temperature": temperature, "maxOutputTokens": max_tokens, "topP": 0.9}
    if json_schema is not None:
        gen_cfg["responseMimeType"] = "application/json"
        gen_cfg["responseSchema"] = json_schema
    if settings.GEMINI_MODEL.startswith("gemini-2.5"):
        gen_cfg["thinkingConfig"] = {"thinkingBudget": 0}
    payload = {"systemInstruction": {"parts": [{"text": system}]}, "contents": contents,
               "generationConfig": gen_cfg, "safetySettings": _GEMINI_SAFETY}
    url = f"{_GEMINI_BASE}/{settings.GEMINI_MODEL}:generateContent"
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY, "content-type": "application/json"}
    for attempt in range(3):
        try:
            resp = await _http().post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            log.warning("Gemini request error (%s)", type(exc).__name__)
            await asyncio.sleep(1 + random.random())
            continue
        if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            await asyncio.sleep((2 ** attempt) + random.random())
            continue
        if resp.status_code != 200:
            log.warning("Gemini HTTP %s", resp.status_code)
            return ""
        cands = resp.json().get("candidates") or []
        if not cands or cands[0].get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
            return ""
        parts = (cands[0].get("content") or {}).get("parts") or []
        return "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
    return ""


# ── Helpers used by callers ─────────────────────────────────────────────
def user_text(text: str) -> Dict[str, Any]:
    return {"role": "user", "parts": [{"text": text}]}


def model_text(text: str) -> Dict[str, Any]:
    return {"role": "model", "parts": [{"text": text}]}


def inline_media(mime: str, b64: str) -> Dict[str, Any]:
    return {"inline_data": {"mime_type": mime, "data": b64}}


def parse_json(text: str) -> Optional[Any]:
    """Tolerant JSON extraction (handles ```json fences / leading prose)."""
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)
    for opener, closer in (("{", "}"), ("[", "]")):
        start, end = t.find(opener), t.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(t[start : end + 1])
            except json.JSONDecodeError:
                continue
    return None
