/**
 * MedoShield keep-alive (Cloudflare Worker, free plan — cron triggers are included).
 *
 * Every 10 minutes it calls the backend's /health endpoint:
 *   • Render's free web service never idles long enough to sleep (no 30-60 s cold starts).
 *   • /health pings MongoDB Atlas and writes a tiny heartbeat document, so the free M0
 *     cluster always sees real activity and is never paused for inactivity.
 * Free-plan cost: ~4,300 requests/month of the 100,000/day allowance, a few ms CPU each.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env))
  },
  // Visiting the worker URL shows the latest status (handy for a quick manual check).
  async fetch(_request, env) {
    const result = await ping(env)
    return new Response(JSON.stringify(result, null, 2), { headers: { 'content-type': 'application/json' } })
  },
}

async function ping(env) {
  const url = `${(env.BACKEND_URL || '').replace(/\/+$/, '')}/health`
  const started = Date.now()
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'medoshield-keepalive' }, cf: { cacheTtl: 0 } })
      const body = await res.json().catch(() => ({}))
      if (res.ok) return { ok: true, attempt, ms: Date.now() - started, database: body.database, storage: body.storage }
    } catch {
      /* cold start - retry */
    }
    await new Promise((r) => setTimeout(r, 15_000)) // give a sleeping instance time to boot
  }
  console.error('keepalive: backend unreachable', url)
  return { ok: false, ms: Date.now() - started }
}
