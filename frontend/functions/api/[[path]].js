/**
 * Cloudflare Pages Function — same-origin proxy: https://<site>.pages.dev/api/*  →  Render backend.
 *
 * Why a proxy instead of calling Render directly from the browser:
 *  • Front end and API share one origin, so the httpOnly refresh cookie stays first-party
 *    (SameSite=Lax works, no CORS preflights, no third-party-cookie blocking).
 *  • The visitor's real IP is forwarded in X-Client-IP and signed with X-Proxy-Secret, so the
 *    API's per-IP rate limits and login lockouts work per person, not per Cloudflare edge.
 *  • With REQUIRE_PROXY_SECRET=true on Render, the API refuses traffic that bypassed Cloudflare.
 *
 * Environment (Pages → Settings → Variables and Secrets):
 *   BACKEND_URL          e.g. https://medoshield-api.onrender.com   (plain variable)
 *   PROXY_SHARED_SECRET  same random value as on Render              (encrypted secret)
 */

const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'host']
// Never forward client-supplied trust headers — the proxy sets these itself.
const STRIP = ['x-proxy-secret', 'x-client-ip', 'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cdn-loop']

export async function onRequest({ request, env }) {
  const backend = (env.BACKEND_URL || '').replace(/\/+$/, '')
  if (!backend) {
    return json({ detail: 'API is not configured (BACKEND_URL missing).' }, 500)
  }

  const incoming = new URL(request.url)
  const target = new URL(backend + incoming.pathname + incoming.search)

  const headers = new Headers()
  for (const [k, v] of request.headers) {
    const key = k.toLowerCase()
    if (!HOP_BY_HOP.includes(key) && !STRIP.includes(key)) headers.set(k, v)
  }
  const ip = request.headers.get('cf-connecting-ip') || ''
  if (ip) headers.set('X-Client-IP', ip)
  if (env.PROXY_SHARED_SECRET) headers.set('X-Proxy-Secret', env.PROXY_SHARED_SECRET)
  headers.set('X-Forwarded-Host', incoming.host)
  headers.set('X-Forwarded-Proto', 'https')

  const init = { method: request.method, headers, redirect: 'manual' }
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body

  let upstream
  try {
    upstream = await fetch(target.toString(), init)
  } catch (err) {
    // Render free instances sleep when idle; the first request can take up to a minute to wake.
    return json({ detail: 'The MedoShield server is waking up. Please try again in a few seconds.' }, 503, { 'Retry-After': '10' })
  }

  const out = new Headers(upstream.headers)
  // fetch() already decoded the upstream body; drop the stale encoding/length so Cloudflare
  // re-compresses per client instead of mislabelling plain bytes as gzip.
  out.delete('content-encoding')
  out.delete('content-length')
  out.delete('server')
  out.set('Cache-Control', out.get('Cache-Control') || 'no-store')
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } })
}
