# MedoShield "Clinical Swiss" design system

Light product UI framed by dark aurora bands. Swiss/editorial structure (grid, big grotesk type, hairlines),
a futuristic aurora + glass moment on the marketing surfaces, clay-style icon tiles, and calm minimalism
inside the app where people get work done. Tokens: `tailwind.config.js`. Components: `src/styles/index.css`.

## Style keywords — what we use, and where
| Keyword | Where it lives |
|---|---|
| Swiss design / editorial | Grid layouts, Schibsted Grotesk display type at tight tracking, hairline rules, tables |
| Minimalism | Every signed-in screen: white cards, one cobalt action per area, no decoration |
| Futuristic + Aurora | `.aurora` bands — hero, facts, final CTA, auth side panel, 404. Navy + cobalt/coral/green light + faint measurement grid |
| Glassmorphism | `.glass` — only on aurora bands (needs something behind it): fact tiles, captions |
| Clay style | `.icon-*` tiles and empty-state icons: soft top light, tinted shadow below |
| Not used | Victorian, graffiti, pixel art, Y2K, pop art, collage, bohemian, handwritten, cyberpunk — they fight a calm clinical brand |

## Colour
| Token | Hex | Use |
|---|---|---|
| `canvas` | #F4F6F9 | page |
| `paper` | #FFFFFF | cards, inputs, nav |
| `cream` | #EBEFF5 | sunken / hover |
| `line` | #DFE4EC | hairlines |
| `ink` / 2 / 3 / 4 | #0B1526 / #283347 / #536075 / #6B778B | text (ink-4 ≥ 4.5:1 on white) |
| `navy-900` | #0B1526 | sidebar, mobile tab bar, aurora bands |
| `teal-*` (= cobalt) | 600 #2549CC | primary actions, links, focus, active nav |
| `apricot-*` (= coral) | 500 #D9522A | live data highlights only |
| `mint-*` | 500 #1E8A52 | good / low risk |
| `butter-*`, `rose-*` | | warning, error / high risk / SOS |
Token names are historical (teal = cobalt, apricot = coral, lilac = slate) so every page re-skins from one file.

## Type
- Display: **Schibsted Grotesk** semibold, tracking −0.03 to −0.04em (`font-display`; `font-serif` is an alias).
- Body/UI: **Geist** 16px, line-height ~1.6, measure ≤ 70ch. Data: **Geist Mono** for measured values only.
- One H1 per page. No label/eyebrow above a heading — context lines go *under* the title.

## Shape, depth, motion
- Radius: buttons/inputs 8px, tiles 10px, cards 14px (`.card` + `shadow-card`), aurora panels 16px.
- Motion: ease `[0.2,0.8,0.2,1]`; hover 150ms, panels 200–240ms, entrances ≤ 600ms. Hero text is visible from frame one
  (it only settles 8px), so it is the LCP immediately. No blur filters, tilt, cursor glow or infinite loops.
- `MotionConfig reducedMotion="user"` globally.

## UX patterns (where they are)
| Pattern | Implementation |
|---|---|
| Command palette + shortcuts | `AppShell.jsx` — Ctrl/⌘K, `?` list, `G` then letter to jump, `C` start check |
| Persistent sidebar / mobile tab bar | `AppShell.jsx`, `nav.js` |
| Skeletons, empty, error states | `components/ui/Feedback.jsx`, `features/care/kit.jsx` |
| Optimistic updates | dose logging (`TodaySchedule.jsx`), chat send, assistant |
| Undo instead of modal | wellbeing log delete (`History.jsx`, 5-second undo) |
| Destructive confirmation | `ConfirmDialog` in `features/care/shared.jsx` / `features/doctor/shared.jsx` |
| Autosave | `useAutosave` (`lib/hooks.js`) — chat drafts per thread |
| Debounce / throttle | `useDebouncedValue`, `useDebouncedCallback`, `useThrottledCallback` |
| Table + bulk actions + filters | `components/ui/DataTable.jsx`; doctor patients (sort, URL-synced filters, CSV export, copy emails) |
| Real-time status | `StatusIndicator.jsx` — Saving / Syncing / Up to date / Offline + offline banner |
| Onboarding | 3-step register + dashboard `Activation.jsx` checklist |
| Error recovery | `ErrorBoundary.jsx` — try again in place, auto-reload once on stale deploy chunks |
| 404 | `pages/public/NotFound.jsx` (real 404 status via `404.html`) |
| Referral / partners | `/refer`, `/partners` (`src/seo/content.js`) |

## Copy
Specific and calm, sentence case. Real product facts only (33 landmarks, 4–12 Hz, 5-check baseline, 10-second check).
No invented testimonials, counts or ratings. Not a diagnostic device — say so near every claim.
