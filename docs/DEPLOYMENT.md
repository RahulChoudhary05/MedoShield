# Deploying MedoShield (100% free tiers)

```
Visitor ──HTTPS──▶ Cloudflare (DNS · SSL · CDN · DDoS)                       FREE
                    ├─ Pages: React front end            medoshield.pages.dev
                    ├─ Pages Function /api/* ──signed proxy──▶ Render API     FREE (750 h/month)
                    └─ Worker cron (every 10 min) ──▶ /health                 FREE
                                                        │
                                       Render API ──────┴──▶ MongoDB Atlas M0 FREE (512 MB)
```

| Piece | Where | Cost |
|---|---|---|
| DNS, SSL, CDN | Cloudflare | Free |
| Front end | Cloudflare Pages → `https://<project>.pages.dev` | Free (static requests unlimited) |
| `/api` proxy | Cloudflare Pages Function (`frontend/functions/api/[[path]].js`) | Free (100k requests/day) |
| Keep-alive | Cloudflare Worker cron (`deploy/keepalive`) | Free |
| Backend | Render free web service (Docker) | Free |
| Database + chat media | MongoDB Atlas M0 | Free |
| AI | Groq (text) · Gemini (video review) | Your API credits |

> Why not the backend on Cloudflare too? Workers Free allows only 10 ms CPU per request (too little for
> NumPy/SciPy analysis and Argon2 password hashing), and Cloudflare Containers require the $5/month Workers Paid plan.

---

## 0. Generate one shared secret
Used by both Cloudflare and Render so the API can trust the real visitor IP and reject direct traffic.
```bash
python -c "import secrets; print(secrets.token_urlsafe(40))"
```
Keep it somewhere safe — you'll paste it in steps 2 and 3.

## 1. MongoDB Atlas
1. Atlas → your M0 cluster → **Network Access** → *Add IP Address* → `0.0.0.0/0` (Render's free instances have no fixed IP; access is still protected by the database user + TLS).
2. **Database Access**: use a dedicated user with *readWrite* on `neuro_shield` only.
   ⚠ The old build had a password hard-coded in Git history — **rotate that user's password now.**
3. **Connect → Drivers** → copy the `mongodb+srv://...` string (that's `MONGODB_URL`).

**Stays awake automatically:** the API pings Atlas every 4 minutes and writes a tiny `_heartbeat`
document (`DB_HEARTBEAT_SECONDS`), reconnects by itself if the connection drops, and every `/health`
call from the keep-alive cron also touches the database — so the free cluster never goes idle.

## 2. Render (backend)
1. Push the repo to GitHub.
2. Render → **New → Blueprint** → select the repo (uses `render.yaml`).
3. Fill the `sync: false` values when prompted:

| Key | Value |
|---|---|
| `MONGODB_URL` | Atlas connection string |
| `GROQ_API_KEY` | Groq key from console.groq.com (text AI — free tier) |
| `GEMINI_API_KEY` | Google AI Studio key (doctor-enabled video review) |
| `PROXY_SHARED_SECRET` | the secret from step 0 |
| `DEMO_PASSWORD` | optional, only if `SEED_DEMO_DATA=true` |

4. Note your service URL, e.g. `https://medoshield-api.onrender.com`, and check `https://…onrender.com/health` returns `"status":"ok"`.
5. If you name your Pages project differently than `medoshield`, update `FRONTEND_URL` / `ALLOWED_ORIGINS` to match.

## 3. Cloudflare Pages (front end + /api proxy)
**Option A — Git integration (recommended, auto-deploys on push)**
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
2. Build settings: *Framework preset* `None` · *Root directory* `frontend` · *Build command* `npm run build` · *Output directory* `dist`.
3. **Settings → Variables and Secrets** (Production):
   - `BACKEND_URL` = `https://medoshield-api.onrender.com` (plain text)
   - `PROXY_SHARED_SECRET` = secret from step 0 (**Encrypt**)
   - `NODE_VERSION` = `20`
   - optional `VITE_DEMO_PASSWORD` = same as Render `DEMO_PASSWORD` to show one-click demo logins
4. Deploy. Your site is live at `https://<project-name>.pages.dev`.

**Option B — from your machine**
```bash
cd frontend
npx wrangler login
npx wrangler pages project create medoshield --production-branch main
npx wrangler pages secret put PROXY_SHARED_SECRET --project-name medoshield
npm run deploy
```
(`BACKEND_URL` is read from `frontend/wrangler.toml`.)

What the Pages setup includes:
- `functions/api/[[path]].js` — same-origin proxy; forwards the visitor IP signed with the shared secret, strips spoofable headers.
- `public/_routes.json` — only `/api/*` runs the Function; everything else is served free as static files.
- `public/_headers` — CSP, HSTS, X-Frame-Options, Permissions-Policy, long-term caching for hashed assets.
- SPA routing — deep links such as `/app/check` serve `index.html` automatically.

## 4. Keep-alive cron (Cloudflare Worker)
```bash
cd deploy/keepalive
# set BACKEND_URL in wrangler.toml to your Render URL first
npx wrangler deploy
```
Every 10 minutes it calls `/health`, so Render never sleeps (no 30–60 s cold starts) and Atlas sees activity.
Open the worker's `*.workers.dev` URL any time to see the latest status. One always-on service uses
≈744 of Render's 750 free hours per month.

## 5. DNS
- **No domain needed:** Cloudflare gives you `https://<project>.pages.dev` with free SSL.
- **Own domain (optional, ~$10/year):** add the domain to Cloudflare (or buy it via Cloudflare Registrar),
  then **Pages → Custom domains → Set up a domain** → e.g. `medoshield.com` (Cloudflare creates the DNS
  record and certificate). Afterwards update Render's `FRONTEND_URL` / `ALLOWED_ORIGINS` and `sitemap.xml`
  / canonical URLs in `index.html`.

## 6. Verify
```bash
curl https://<project>.pages.dev/api/auth/me          # → 401 (proxy reaches the API)
curl https://medoshield-api.onrender.com/api/auth/me  # → 403 (direct access blocked)
curl https://medoshield-api.onrender.com/health       # → {"status":"ok","database":"ok",...}
python backend/tests/pentest_live.py https://<project>.pages.dev
```

## Local rehearsal of the production topology
```bash
# terminal 1 — API in Cloudflare-only mode
cd backend && PROXY_SHARED_SECRET=dev-secret REQUIRE_PROXY_SECRET=true uvicorn app.main:app --port 8000
# terminal 2 — real Cloudflare Pages runtime with the proxy Function
cd frontend && npm run build && npx wrangler pages dev ./dist --port 8788 \
  --binding BACKEND_URL=http://127.0.0.1:8000 --binding PROXY_SHARED_SECRET=dev-secret
# open http://localhost:8788
```
