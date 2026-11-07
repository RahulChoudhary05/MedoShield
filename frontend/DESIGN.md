# MedoShield "Field Notes" design system

Light theme only. Editorial-clinical: it should read like a well-made medical journal crossed with a precise
instrument — calm, trustworthy, specific. Never like a generic AI/SaaS template.

Built by Rahul Choudhary. Tokens live in `tailwind.config.js`, component classes in `src/styles/index.css`.

## Colour (90–95 % neutral)
| Token | Use |
|---|---|
| `bg-canvas` #F6F2EA | page background (bone) |
| `bg-paper` #FFFFFF | cards, inputs, popovers |
| `bg-cream` #EFE9DE | sunken areas, hover fills |
| `border-line` #E3DCCF | every hairline |
| `text-ink` / `ink-2` / `ink-3` / `ink-4` | headings / body / secondary / meta (ink-4 only ≥ 14px, never body copy) |
| `teal-*` (pine) | the ONE accent: primary actions, links, focus, active nav, "good/low risk" |
| `apricot-*` (ember) | data highlights only (the tremor peak, a live dot, a badge). < 3 % of any screen |
| `rose-*` | errors / high risk / SOS only |
| `butter-*` | medium risk / warnings only |
| `lilac-*` | warm stone neutral (NOT violet) — chart secondary series, "calibrating" |

Never: gradients on buttons/text, glows, coloured blobs, purple/violet, neon, raw hex inside components
(exception: SVG/canvas/three.js strokes may use the hex values from the table).

## Type
- Display / page titles: **Instrument Serif** (`font-serif`, `.page-title`, `.h-display`), weight 400, tight leading.
  Italic serif (`.serif-accent`) for at most one phrase per heading.
- UI + body: **Geist** (`font-sans`, default). Body 16px (`text-base`), line-height ~1.6, max ~65ch.
- Data / labels: **Geist Mono** (`font-mono`, `.kicker`, `.eyebrow`) in **sentence case** — no tracked ALL CAPS.
- Nothing smaller than 13px (`text-[0.8125rem]`). Numbers: `.num` (tabular).
- One H1 per page. Don't skip heading levels.

## Shape & space
- Radius: buttons/inputs `rounded-lg` (8px), tiles `rounded-xl` (12px), cards `rounded-3xl` (20px via `.card`).
- Spacing on the 4/8 scale: 8, 12, 16, 24, 32, 48, 64, 96. Section padding `py-20 sm:py-28`. 48px heading→content.
- Hairlines (`border-line`) and whitespace separate things — not shadows. `shadow-lift` only on hover/overlays, `shadow-float` for popovers/dialogs.
- Max two levels of nesting (no box in a box in a box).

## Components (use these, don't re-invent)
- `Button` (`components/ui/Button.jsx`): variants `primary` (ink), `brand` (pine), `outline`, `ghost`, `soft`, `danger`. At most two buttons per row; label = verb + object ("Start a free check", not "Learn more").
- `Card`, `CardHeader` (`components/ui/Card.jsx`) — CardHeader icons are tonal squares.
- `PageHeader` (`components/ui/motion.jsx`): mono kicker + serif title + lede + actions. Every signed-in page starts with it.
- Motion helpers in `components/ui/motion.jsx`: `Reveal`, `Stagger`/`StaggerItem`, `CountUp`, `WordsReveal`.
- Icons: `lucide-react` only, `strokeWidth={1.8}`, outline style only, never emoji as icons. Icon-only buttons need `aria-label`.
- Marketing pages: wrap in `components/layout/MarketingLayout.jsx` (nav + footer with the creator credit).

## Motion (calm, purposeful)
- Easing `[0.2, 0.8, 0.2, 1]` for UI, `[0.65, 0, 0.35, 1]` for things moving across the screen. No bounce/overshoot springs.
- Durations: hover 150ms, press 90ms, panels 200–240ms, entrances 400–800ms. Stagger 40–60ms.
- Animate only `transform` and `opacity`. Hover: cards lift 2px, arrows nudge 3px, photos scale 1.02.
- Welcome: hero word-reveal, charts/lines that draw in, counters, the 3D human, live "measurement" visuals,
  gentle `Reveal` on section entry, page transitions. Banned: tilt, magnetic, cursor glow, parallax hijacking,
  smooth-scroll libraries, carousels/auto-advancing sliders, logo/marquee ribbons, infinite decorative loops.
- `MotionConfig reducedMotion="user"` is set globally; content must be readable without animation.

## Accessibility
- Contrast ≥ 4.5:1 for text. Focus ring is global (`:focus-visible`). Touch targets ≥ 44px.
- Every image has meaningful `alt` (or `alt=""` if decorative) and width/height or aspect ratio.
- Forms: visible `<label>`, inline errors, `aria-invalid`, `aria-describedby`.

## Copy
- Specific and calm. Real facts from the product (33 landmarks, 4–12 Hz band, 5-session baseline, 10-second check).
- No invented testimonials, user counts, ratings, or "trusted by" logos. No "Learn more / Discover / Click here".
- Sentence case everywhere.
