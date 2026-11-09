# SEO — status against the checklist

Single source of truth: `src/seo/site.js` (core routes, JSON-LD) + `src/seo/content.js` (feature, use-case,
comparison, hub, referral, partner pages). `npm run build` runs `scripts/seo-build.mjs`, which writes one static HTML
file per public URL with its own title, meta, canonical, OG/Twitter, JSON-LD and full crawlable body in `<noscript>`,
plus `sitemap.xml`, `robots.txt`, `llms.txt` and a real-status `404.html`.

## Technical
| Item | Status |
|---|---|
| GSC, GA4, Bing | **You do this**: GSC verification tag already in `index.html`. Add GA4 (update the CSP in `public/_headers`), submit `https://medoshield.pages.dev/sitemap.xml` in GSC and Bing Webmaster Tools |
| robots / noindex | Done — `/app`, `/doctor`, `/api` disallowed + `X-Robots-Tag: noindex` |
| Canonicals | Done — every public route, also updated on client navigation (`RouteMeta.jsx`) |
| Core Web Vitals | ~280 KB gz critical path; 3D, charts, pose model lazy; fonts preloaded; hero visible at first paint |
| Mobile | Mobile tab bar, 44px targets, no horizontal scroll at 375px |
| Crawlable JS content | Prerendered head + full noscript body per page |
| 404s / clean URLs | Real 404 status; extensionless URLs (`/features/tremor-test`) |
| Breadcrumbs | Visible on content pages + `BreadcrumbList` JSON-LD (3 levels) |
| Orphan pages | Every public page linked from the footer; hubs link their children; "Read next" links |
| Schema | Organization, WebSite, Person, MedicalWebPage/CollectionPage, SoftwareApplication, FAQPage, BreadcrumbList. **Test** each URL in Google's Rich Results Test after deploy |

## On-page
- Titles 47–60 chars incl. brand; unique descriptions 113–153 chars (check: `node -e` snippet in the build log history, or re-run the length script).
- Each content page answers its query in the first two sentences (`intro`), one H1, H2 sections, FAQ ("People also ask").
- Author byline + date on every content page (E-E-A-T); `dateModified` and sitemap `lastmod` from `updated`.

## Content cluster
- `/features` → tremor test, gait analysis, balance assessment
- `/use-cases` → Parkinson's tracking, essential tremor, remote patient monitoring
- `/compare` → phone camera vs wearables, home monitoring vs clinic visits
- Growth: `/refer`, `/partners`

## Next (needs live data — do after GSC has 4+ weeks)
Low-CTR title rewrites, page-2 refreshes, cannibalisation checks, competitor / low-KD keyword research, and a
"best tremor tracking apps" listicle (only with fair, verified competitor facts).
When editing medical content, keep claims inside what the product actually measures.
