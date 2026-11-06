# Security model

MedoShield handles health data, so the API is built against the **OWASP API Security Top 10 (2023)**.

| Risk | Control | Where |
|---|---|---|
| **API1 Broken object-level authorisation** | Every patient-scoped route resolves the target through `resolve_patient()`: patients can only reach themselves; doctors only patients with an **active care link**, which is created solely when the doctor accepts the patient's own appointment request. The old "assign any patient" endpoint was removed. Chat threads are keyed by *(patient, doctor)*. | `core/deps.py`, `routers/doctors.py`, `routers/chat.py` |
| **API2 Broken authentication** | Argon2id (64 MiB, t=3) with transparent bcrypt→Argon2 upgrade; strong password policy; constant-time verify with dummy hash (no user enumeration); per-account progressive lockout + per-IP rate limits. 15-min JWT (HS256 pinned, `iss`/`aud`/`nbf`/`jti`/`sid` required) kept in memory by the SPA; 7-day opaque refresh token in an `httpOnly` `Secure` `SameSite` cookie scoped to `/api/auth`, **rotated on every use with family revocation on replay**. Server-side session check on every request → logout/password change revoke instantly. | `core/security.py`, `routers/auth.py` |
| **API3 Property-level authorisation** | All request models `extra="forbid"`; mass-assignment impossible. Responses use explicit projections — password hashes, licence numbers and emails never leak to the wrong audience. | `schemas.py`, `serializers.py` |
| **API4 Unrestricted resource consumption** | slowapi rate limits per user/IP (tight on login, AI and uploads); global 60 MB body cap incl. chunked uploads; per-type size caps; pose sessions capped at 1 800 frames; CPU work off the event loop. | `core/rate_limit.py`, `core/middleware.py` |
| **API5 Function-level authorisation** | Role guards (`require_patient`, `require_doctor`) on every route. | `core/deps.py` |
| **API6 Sensitive business flows** | SOS limited to 5/hour; appointment requests de-duplicated; assistant 20/min. | routers |
| **API7 SSRF** | Server only calls fixed hosts (Gemini, Twilio). No user-supplied URLs are fetched. | `ai/llm.py` |
| **API8 Security misconfiguration** | Strict CORS allow-list (no wildcard regex), CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy / COOP / CORP, no server header, docs disabled in production, generic 500s with request id, prod boot fails on weak secrets. Container runs as non-root. | `main.py`, `core/middleware.py`, `Dockerfile` |
| **API9 Inventory** | Single versioned router registry; OpenAPI in non-prod only. | `routers/__init__.py` |
| **API10 Unsafe consumption of APIs** | LLM output treated as untrusted: schema-validated, clamped, sanitised (see AI_SAFETY.md). API key sent in a header, never in URLs/logs. | `ai/` |

### Other controls
* **NoSQL injection** – only primitives reach queries; ObjectIds strictly parsed (invalid → 404, never 500).
* **Uploads** – typed by magic bytes (not filename/Content-Type), random names, stored outside any static mount, streamed only to authorised participants; path-traversal guarded.
* **CSRF** – refresh/logout require a custom `X-CSRF-Guard` header (forces CORS preflight).
* **XSS** – React escaping; AI markdown rendered with raw HTML disabled; nginx CSP (`script-src 'self' 'wasm-unsafe-eval'`); tokens never in `localStorage`.
* **Audit trail** – logins, profile changes, record views by doctors, prescriptions, exports, SOS → `audit_log`; injection attempts & refresh-token replays → `security_events`.
* **Privacy** – raw video never uploaded for movement checks; AI video review bytes analysed in memory and discarded; GDPR-style export and full account deletion.

### Action required for existing deployments
The previous version **hard-coded a MongoDB Atlas username/password in source** (`database.py`). Rotate that database user's password in Atlas and keep the new URL only in `MONGODB_URL`.
