/**
 * Post-build SEO step (runs after `vite build`).
 *
 * For every public route it writes a static HTML file (dist/about.html, dist/join/doctor.html …)
 * whose <head> already carries that page's title, description, canonical, Open Graph/Twitter
 * tags and JSON-LD — so crawlers and link-preview bots (LinkedIn, WhatsApp, X, Slack) that do
 * not run JavaScript still see the right page. Cloudflare Pages serves /about from about.html.
 * It also writes 404.html (real 404 status for unknown URLs), sitemap.xml, robots.txt and llms.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CREATOR, FAQ, PUBLIC_ROUTES, SITE, absUrl, fullTitle, jsonLd } from '../src/seo/site.js'
import { CONTENT_UPDATED } from '../src/seo/content.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const today = new Date().toISOString().slice(0, 10)
const NL = '\n'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
const NOSCRIPT_BLOCK = /<!--seo:noscript-->[\s\S]*?<!--\/seo:noscript-->/

function head(route) {
  const title = fullTitle(route)
  const url = absUrl(route.path)
  const img = `${SITE.url}${SITE.ogImage}`
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="author" content="${esc(CREATOR.name)}" />`,
    `<meta name="creator" content="${esc(CREATOR.name)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${route.path === '/about' ? 'profile' : route.kind && route.kind !== 'hub' ? 'article' : 'website'}" />`,
    ...(route.kind ? [`<meta property="article:modified_time" content="${route.updated || CONTENT_UPDATED}" />`] : []),
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(SITE.ogImageAlt)}" />`,
    ...(route.path === '/about' ? ['<meta property="profile:first_name" content="Rahul" />', '<meta property="profile:last_name" content="Choudhary" />'] : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:image:alt" content="${esc(SITE.ogImageAlt)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd(route)).replace(/</g, '\\u003c')}</script>`,
  ].join(`${NL}    `)
}

function noscript(route) {
  const links = PUBLIC_ROUTES.map((r) => `<a href="${r.path}">${esc(r.heading)}</a>`).join(' · ')
  const faqList = route.path === '/' ? FAQ : route.faq || []
  const faq = faqList.length ? `<h2>Questions</h2>${faqList.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}` : ''
  // Full page body for crawlers and no-JS readers: sections, comparison table, child pages.
  const sections = (route.sections || []).map((sec) =>
    `<h2>${esc(sec.h)}</h2>${(sec.p || []).map((t) => `<p>${esc(t)}</p>`).join('')}${sec.list ? `<ul>${sec.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}`).join('')
  const table = route.table ? `<table><thead><tr>${route.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${route.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''
  const kids = route.kind === 'hub' ? `<ul>${PUBLIC_ROUTES.filter((r) => r.parent === route.path).map((r) => `<li><a href="${r.path}">${esc(r.heading)}</a> — ${esc(r.description)}</li>`).join('')}</ul>` : ''
  return '<noscript><main style="font-family:system-ui,sans-serif;max-width:680px;margin:4rem auto;padding:0 1rem;color:#171614;line-height:1.6">' +
    `<h1>${esc(route.heading)}</h1><p>${esc(route.intro)}</p>${kids}${table}${sections}${faq}` +
    `<p>Designed and built by <a href="${CREATOR.linkedin}">${esc(CREATOR.name)}</a>.</p><nav>${links}</nav>` +
    '<p>Please enable JavaScript to use the app.</p></main></noscript>'
}

function render(route) {
  if (!SEO_BLOCK.test(template)) throw new Error('index.html is missing the <!--seo:start--> markers')
  return template
    .replace(SEO_BLOCK, `<!--seo:start-->${NL}    ${head(route)}${NL}    <!--seo:end-->`)
    .replace(NOSCRIPT_BLOCK, `<!--seo:noscript-->${noscript(route)}<!--/seo:noscript-->`)
}

// 1. One static HTML file per public route
for (const route of PUBLIC_ROUTES) {
  const file = route.path === '/' ? join(dist, 'index.html') : join(dist, `${route.path.slice(1)}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, render(route))
}

// 2. Real 404 for unknown URLs (Cloudflare Pages serves 404.html with status 404; /app and /doctor are rewritten in _redirects)
writeFileSync(join(dist, '404.html'), template.replace(SEO_BLOCK,
  `<!--seo:start-->${NL}    <title>Page not found · ${SITE.name}</title>${NL}    <meta name="robots" content="noindex, follow" />${NL}    <!--seo:end-->`))

// 3. Sitemap
writeFileSync(join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>${NL}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${NL}` +
  PUBLIC_ROUTES.map((r) => `  <url><loc>${absUrl(r.path)}</loc><lastmod>${r.updated || (r.kind ? CONTENT_UPDATED : today)}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority>` +
    (r.path === '/' ? `<image:image><image:loc>${SITE.url}${SITE.ogImage}</image:loc></image:image>` : '') + '</url>').join(NL) +
  `${NL}</urlset>${NL}`)

// 4. robots.txt — search and AI-answer crawlers welcome on public pages, never on private areas
const rules = ['Allow: /', 'Disallow: /app', 'Disallow: /doctor', 'Disallow: /api/'].join(NL)
const bots = ['*', 'Googlebot', 'Bingbot', 'Applebot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended']
writeFileSync(join(dist, 'robots.txt'),
  `# ${SITE.name} — designed and built by ${CREATOR.name}${NL}${NL}` +
  bots.map((ua) => `User-agent: ${ua}${NL}${rules}${NL}`).join(NL) +
  `${NL}Sitemap: ${SITE.url}/sitemap.xml${NL}`)

// 5. llms.txt — a plain-language map for AI assistants
writeFileSync(join(dist, 'llms.txt'), [
  `# ${SITE.name}`, '', `> ${SITE.description}`, '',
  `Designed and built by ${CREATOR.name} (${CREATOR.role}) — ${CREATOR.linkedin} · ${CREATOR.github}`, '',
  '## Pages', ...PUBLIC_ROUTES.map((r) => `- [${r.heading}](${absUrl(r.path)}): ${r.description}`), '',
  '## FAQ', ...FAQ.map(([q, a]) => `- **${q}** ${a}`), '',
  '## Notes', '- MedoShield AI is a monitoring and education tool, not a diagnostic device.',
  '- Private areas (/app, /doctor) require sign-in and are not indexed.', '',
].join(NL))

console.log(`seo: wrote ${PUBLIC_ROUTES.length} route pages, 404.html, sitemap.xml, robots.txt, llms.txt`)
