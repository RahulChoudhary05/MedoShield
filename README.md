<div align="center">

<img src="frontend/public/favicon.svg" width="72" alt="MedoShield logo" />

# MedoShield AI

**Your movement, understood — every day.**

Privacy-first neuro-motor monitoring: a 10-second phone video becomes clinical-grade tremor, gait and balance biomarkers **on the patient's device**, tracked against a personal baseline and shared with their doctor — plus a prompt-injection-hardened AI health companion.

`React 19` · `Vite 6` · `Tailwind` · `Three.js / R3F` · `Framer Motion` · `MediaPipe Tasks (WASM)` · `FastAPI` · `MongoDB` · `NumPy / SciPy` · `xAI Grok 4.7`

</div>

---

## Why it exists

Parkinson's and related movement disorders fluctuate daily, but clinics see a patient every few months. MedoShield closes that gap without wearables:

| Patient | Clinician |
|---|---|
| Guided 10-s **movement checks** with live skeleton overlay | **Risk-sorted triage** of their panel |
| **Motor index** + 7 biomarkers, personal baseline | Patient chart: trends, sessions, videos, labs, meds, lifestyle |
| **Medo** AI companion that asks before advising | **AI clinical summary** (structured, source-labelled) |
| Lab-report PDF explainer, medication plan & reminders | Prescribe, review AI video analyses, add notes |
| Hold-to-**SOS** with location, secure messaging | Secure messaging with voice notes & files |

## Architecture

```
Browser (React)                                    FastAPI                              MongoDB
┌──────────────────────────────┐   33 landmarks   ┌──────────────────────────────┐    ┌──────────────┐
│ MediaPipe Pose (WASM, local) │ ───────────────▶ │ Signal engine (NumPy/SciPy)  │───▶│ sessions     │
│  video never leaves device   │   JSON, no video │  · Welch PSD tremor detector │    │ baselines    │
│                              │                  │  · gait / cadence / symmetry │    │ risk         │
│ Access token in memory only  │ ◀── JWT 15 min ─ │  · robust personal baseline  │    │ audit_log    │
│ Refresh: httpOnly cookie     │                  │ Guarded AI layer ─▶ Grok   │    │ …            │
└──────────────────────────────┘                  └──────────────────────────────┘    └──────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/AI_SAFETY.md`](docs/AI_SAFETY.md).

### The signal engine (backend/app/ai_engine)
* **Tremor** – wrist motion relative to the shoulder, resampled on real timestamps, Welch PSD; a 4–12 Hz peak must beat the jitter noise-floor by 4× (SNR gate) — no false tremor from landmark noise or normal arm swing.
* **Gait** – steps from the ankle anterior-posterior separation signal → cadence, step-time CV, left/right step symmetry, arm-swing asymmetry, trunk sway.
* **Personal baseline** – median + MAD of the first N good-quality checks; deviation = RMS of *worsening* robust z-scores.
* **Risk fusion** – population reference + personal deviation, weighted by recording quality, with a worst-component floor so one strong sign (e.g. clear tremor) is never averaged away.

## Quick start (local, zero config)

```bash
# 1 · API  (Python 3.11)
cd backend
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --no-server-header
```
With no `MONGODB_URL` the API runs on an **in-memory database seeded with demo data** (5 doctors, a patient with 5 weeks of movement history).

```bash
# 2 · Web
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api to :8000)
```
On the login page click **Demo patient** or **Demo doctor**.

Add `XAI_API_KEY` (Grok) to `backend/.env` to enable the live model. Optionally add `GEMINI_API_KEY` too: it becomes the automatic fallback and powers AI video review (Grok has no video input). Every AI feature also has a deterministic fallback.

### Tests
```bash
cd backend && pip install -r requirements-dev.txt && pytest -q     # 42 security, AI-guardrail, medication-safety & analytics tests
python tests/pentest_live.py http://127.0.0.1:8000                 # 22 black-box attacks against a running API (IDOR, JWT forgery, NoSQLi, CSRF, CORS, traversal, prompt injection…)
```

### Deploy (free)
Cloudflare Pages (front end, DNS, `/api` proxy, keep-alive cron) + Render (API) + MongoDB Atlas M0 — step-by-step in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Docker
```bash
MONGO_ROOT_PASSWORD=change-me docker compose up --build             # http://localhost:8080
```

## Configuration
Backend: [`backend/.env.example`](backend/.env.example) · Frontend: [`frontend/.env.example`](frontend/.env.example).
Production refuses to start without a strong `SECRET_KEY` and a `MONGODB_URL`.

## Disclaimer
MedoShield is a monitoring and education tool, **not a diagnostic medical device**. Always consult a qualified clinician; in an emergency call your local emergency number.
