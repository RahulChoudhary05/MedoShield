import { Suspense, lazy, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, BellRing, Bot, Brain, CalendarHeart, Camera, Check, ChevronDown, FileHeart, Fingerprint, HeartPulse, KeyRound,
  LineChart, Lock, MessageSquareHeart, Pill, ScanLine, ShieldCheck, Siren, Stethoscope, Users, Waves,
} from 'lucide-react'
import GuardrailDemo from './GuardrailDemo'
import Logo from '../../components/brand/Logo'
import Button from '../../components/ui/Button'
import { CountUp, Magnetic, Reveal } from '../../components/ui/motion'
import { cn } from '../../lib/utils'

const HumanCanvas = lazy(() => import('../../components/three/HumanModel'))

/* ───────────────────────── shared heading ───────────────────────── */
function SectionHead({ eyebrow, title, accent, after, text, center = false, id }) {
  return (
    <Reveal className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id} className="mt-5 text-display-sm font-semibold sm:text-display-md text-balance">
        {title} <span className="serif-accent">{accent}</span>{after}
      </h2>
      {text && <p className={cn('mt-4 text-lg leading-relaxed text-ink-3 text-pretty', center && 'mx-auto max-w-xl')}>{text}</p>}
    </Reveal>
  )
}

/* ───────────────────────── capability ribbon ───────────────────────── */
export function Ribbon() {
  const items = ['Resting tremor spectrum', 'Gait cadence', 'Step-time variability', 'Arm-swing asymmetry', 'Postural sway', 'Personal baseline', 'Lab report explainer', 'Medication adherence', 'Location-aware SOS', 'Clinician summaries']
  return (
    <div aria-hidden className="relative border-y border-line/60 bg-paper/50 py-4 mask-fade-x">
      <div className="flex w-max animate-marquee gap-8 [animation-duration:55s]">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-8 whitespace-nowrap text-[0.95rem] text-ink-3">
            {t}<span className="h-1 w-1 rounded-full bg-teal-400" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── how it works ───────────────────────── */
function MiniPhone() {
  return (
    <div className="relative mx-auto h-28 w-16 rounded-[1.1rem] border-[3px] border-ink/80 bg-cream">
      <div className="absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-ink/70" />
      <motion.span className="absolute inset-0 grid place-items-center font-display text-3xl font-semibold text-teal-700"
        animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 1.1] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3 }}>3</motion.span>
    </div>
  )
}
function MiniSkeleton() {
  return (
    <Suspense fallback={<ScanLine className="h-8 w-8 animate-pulse text-teal-300" />}>
      <HumanCanvas pose="walk" className="h-full w-full" />
    </Suspense>
  )
}
function MiniSpectrum() {
  const bars = [10, 14, 12, 18, 26, 62, 30, 16, 12, 10, 8, 9]
  return (
    <div className="mx-auto flex h-28 items-end gap-1.5">
      {bars.map((h, i) => (
        <motion.span key={i} className={cn('w-2.5 rounded-t-sm', i === 5 ? 'bg-apricot-400' : 'bg-teal-200')}
          initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: 0.05 * i, duration: 0.5 }} />
      ))}
    </div>
  )
}
function MiniShare() {
  return (
    <div className="mx-auto w-40 space-y-2">
      <svg viewBox="0 0 160 50" className="w-full">
        <motion.path d="M0,38 C25,34 40,32 60,30 C85,28 100,18 125,16 C140,15 150,12 160,10" fill="none" stroke="#3A6652" strokeWidth="3" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      </svg>
      <div className="flex items-center gap-2 rounded-xl border border-line/70 bg-paper px-2.5 py-1.5">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-100 text-[0.6rem] font-bold text-teal-800">SJ</span>
        <span className="text-[0.7rem] text-ink-3">Reviewed by Dr. Johnson</span>
        <Check className="ml-auto h-3.5 w-3.5 text-teal-600" />
      </div>
    </div>
  )
}

const STEPS = [
  { icon: Camera, title: 'Record ten seconds', text: 'Walk, stand, or hold your hands out in front of any phone or laptop camera, with live framing guidance.', visual: MiniPhone },
  { icon: ScanLine, title: 'Pose AI, on your device', text: 'MediaPipe tracks 33 body landmarks in your browser. Frames are discarded instantly; only numbers remain.', visual: MiniSkeleton },
  { icon: Waves, title: 'Biomarkers, not guesses', text: 'Spectral tremor analysis, cadence, symmetry, sway and rhythm, scored against references and your own baseline.', visual: MiniSpectrum },
  { icon: Stethoscope, title: 'Your doctor sees the trend', text: 'Meaningful changes reach your care team, who can review, add notes, prescribe and message you securely.', visual: MiniShare },
]

export function HowItWorks() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 22 })
  return (
    <section id="how" aria-labelledby="how-title" className="container py-24 sm:py-32">
      <SectionHead id="how-title" center eyebrow="How it works" title="From a short clip to a" accent="clinical signal" text="Four calm steps, under a minute. No wearables and no clinic visit." />
      <div ref={ref} className="relative mt-16">
        <svg className="pointer-events-none absolute left-0 right-0 top-[7.5rem] hidden h-2 w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
          <line x1="12" y1="1" x2="88" y2="1" stroke="#E8E0D2" strokeWidth="0.4" strokeDasharray="1 1.4" />
          <motion.line x1="12" y1="1" x2="88" y2="1" stroke="#6E9B83" strokeWidth="0.4" style={{ pathLength: draw }} />
        </svg>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.08} className="card card-interactive relative flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="font-serif text-4xl italic text-teal-700/80">0{i + 1}</span>
                <span className="icon-tile icon-teal h-10 w-10"><s.icon className="h-5 w-5" /></span>
              </div>
              <div className="my-6 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-cream/80 to-paper">
                <s.visual />
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ───────────────────────── stats ───────────────────────── */
export function Stats() {
  const s = [
    { v: 33, suf: '', l: 'body landmarks tracked per frame' },
    { v: 7, suf: '', l: 'motion biomarkers fused into one score' },
    { v: 0, suf: ' MB', l: 'of your video ever stored' },
    { v: 6, suf: '', l: 'independent AI safety layers' },
  ]
  return (
    <section aria-label="MedoShield in numbers" className="container">
      <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-line/70 bg-paper md:grid-cols-4">
        {s.map((x, i) => (
          <div key={x.l} className={cn('px-6 py-8 sm:px-8', i > 0 && 'border-line/70 md:border-l', i % 2 === 1 && 'border-l', i > 1 && 'border-t md:border-t-0')}>
            <CountUp value={x.v} suffix={x.suf} className="text-5xl font-semibold text-ink" />
            <p className="mt-2 text-sm text-ink-3">{x.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── features bento ───────────────────────── */
function MiniChat() {
  const lines = [
    { me: true, text: 'pain' },
    { me: false, text: 'Thanks for telling me. Where exactly is the pain, and how strong is it from 1 to 10?' },
  ]
  return (
    <div className="mt-6 space-y-2.5">
      {lines.map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.5 }}
          className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm', l.me ? 'ml-auto rounded-br-md bg-teal-700 text-white' : 'rounded-bl-md border border-line bg-paper text-ink-2')}>
          {l.text}
        </motion.div>
      ))}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3 }} className="flex flex-wrap gap-1.5 pt-1">
        {['Head', 'Back', 'Joints', 'Chest'].map((c) => <span key={c} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-2">{c}</span>)}
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, text, tone = 'teal', className, children }) {
  return (
    <Reveal className={cn('group', className)}>
      <div className="card card-interactive relative h-full overflow-hidden p-7">
        <span className={cn('icon-tile h-11 w-11', tone === 'clay' ? 'icon-coral' : 'icon-teal')}><Icon className="h-5 w-5" /></span>
        <h3 className="mt-5 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-3">{text}</p>
        {children}
        <ArrowUpRight className="absolute right-6 top-6 h-5 w-5 text-ink-4 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>
    </Reveal>
  )
}

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHead id="features-title" eyebrow="Everything in one calm place" title="Built for the" accent="days between" after=" appointments" />
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Reveal className="group md:col-span-4">
            <div className="card relative h-full overflow-hidden p-7 sm:p-9">
              <span className="icon-tile icon-teal h-11 w-11"><LineChart className="h-5 w-5" /></span>
              <h3 className="mt-5 text-2xl font-semibold sm:text-[1.75rem]">A motor index that learns you</h3>
              <p className="mt-2 max-w-md text-ink-3">Seven biomarkers fused into one score, with a personal baseline built from your first checks — so subtle change becomes visible weeks earlier.</p>
              <svg viewBox="0 0 600 180" className="relative mt-8 w-full" role="img" aria-label="Example motor index trend with an emerging tremor flagged">
                <defs><linearGradient id="bento-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A6652" stopOpacity=".18" /><stop offset="1" stopColor="#3A6652" stopOpacity="0" /></linearGradient></defs>
                {[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#F0E9DD" strokeDasharray="3 6" />)}
                <motion.path d="M0,60 C60,55 90,48 140,52 C200,58 230,44 290,50 C350,56 380,70 430,88 C480,106 520,112 600,128" fill="none" stroke="#3A6652" strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: 'easeInOut' }} />
                <path d="M0,60 C60,55 90,48 140,52 C200,58 230,44 290,50 C350,56 380,70 430,88 C480,106 520,112 600,128 L600,180 L0,180Z" fill="url(#bento-a)" />
                <motion.g initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.6 }}>
                  <circle cx="430" cy="88" r="7" fill="#FFFDF9" stroke="#C06D48" strokeWidth="3" />
                  <rect x="344" y="30" rx="10" width="172" height="34" fill="#FFFDF9" stroke="#E8E0D2" />
                  <text x="430" y="52" textAnchor="middle" fill="#1E1C19" fontSize="13" fontFamily="Geist Variable">Tremor emerging · flagged</text>
                </motion.g>
              </svg>
            </div>
          </Reveal>
          <FeatureCard className="md:col-span-2" icon={Bot} title="Medo, a careful companion" text="Asks before it advises. One-word questions get focused follow-ups, never essays.">
            <MiniChat />
          </FeatureCard>
          <FeatureCard className="md:col-span-2" icon={FileHeart} title="Lab reports, explained" text="Upload a PDF and see values, ranges and next steps in plain language." />
          <FeatureCard className="md:col-span-2" icon={Pill} title="A medication plan that cares" text="Gentle reminders, adherence tracking, and OTC guidance screened for allergies and interactions." />
          <FeatureCard className="md:col-span-2" icon={Siren} tone="clay" title="Hold-to-SOS" text="One long press shares your live location with your emergency contact and care team." />
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── security ───────────────────────── */
export function Security() {
  const items = [
    { icon: KeyRound, t: 'Argon2id passwords', d: 'Memory-hard hashing, legacy hashes upgraded on login, breach-pattern policy.' },
    { icon: Fingerprint, t: 'Rotating sessions', d: '15-minute tokens in memory plus an httpOnly refresh cookie with reuse detection.' },
    { icon: Users, t: 'Object-level access', d: 'Doctors only see patients who invited them. Every record view is audited.' },
    { icon: Lock, t: 'Hardened API', d: 'Strict schemas, rate limits, lockouts, CSP and HSTS, magic-byte upload checks.' },
  ]
  return (
    <section id="security" aria-labelledby="security-title" className="relative py-24 sm:py-32">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead id="security-title" eyebrow="Security & AI safety" title="Health data deserves" accent="defence in depth"
            text="Every AI message passes six independent guardrails, and the platform follows the OWASP API Security Top 10 end to end." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {items.map((it, i) => (
              <Reveal key={it.t} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-line/70 bg-paper p-5">
                  <it.icon className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 font-semibold">{it.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{it.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={0.1}><GuardrailDemo /></Reveal>
      </div>
    </section>
  )
}

/* ───────────────────────── clinicians ───────────────────────── */
export function Clinicians() {
  const points = [
    [BellRing, 'Risk-sorted triage', 'Patients with meaningful change rise to the top.'],
    [Brain, 'AI clinical summary', 'Structured, source-labelled, never a diagnosis.'],
    [MessageSquareHeart, 'Secure messaging', 'Text, voice notes and files per care link.'],
    [CalendarHeart, 'Appointment flow', 'Accepting a request opens the care link.'],
  ]
  return (
    <section id="clinicians" aria-labelledby="clinicians-title" className="container py-24 sm:py-32">
      <div className="card card-tint-teal relative overflow-hidden p-7 sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <SectionHead id="clinicians-title" eyebrow="For clinicians" title="Remote monitoring that" accent="respects your time"
              text="A triage-first panel, patient charts with biomarker trends, AI summaries you can verify, secure messaging and one-click prescribing." />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/join/doctor" size="lg" variant="primary" iconRight={ArrowUpRight}>Join as a clinician</Button>
              <Button to="/login" size="lg" variant="outline">Clinician sign in</Button>
            </div>
          </div>
          <div className="space-y-3">
            <figure className="relative overflow-hidden rounded-3xl border border-line/70 bg-cream">
              <img src="https://images.unsplash.com/photo-1758691462858-f1286e5daf40?w=1100&q=78&auto=format&fit=crop" width="1100" height="619" loading="lazy" decoding="async"
                alt="A doctor reviewing results with an older patient at a clinic desk" className="aspect-[16/9] w-full object-cover" />
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1.5 text-xs font-medium text-ink-2 backdrop-blur">Trends replace guesswork at every visit</figcaption>
            </figure>
            <ul className="grid gap-3 sm:grid-cols-2">
              {points.map(([I, t, d]) => (
                <li key={t} className="rounded-2xl border border-line/70 bg-paper p-4">
                  <I className="h-5 w-5 text-teal-700" />
                  <p className="mt-2 font-semibold">{t}</p>
                  <p className="text-sm text-ink-3">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── everyday life ───────────────────────── */
export function Everyday() {
  return (
    <section aria-labelledby="everyday-title" className="container py-24 sm:py-28">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <figure className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-cream shadow-soft">
            <img src="https://images.unsplash.com/photo-1758691031979-6128d4029604?w=1100&q=78&auto=format&fit=crop" width="1100" height="619" loading="lazy" decoding="async"
              alt="A smiling older woman checking her health results on a smartphone at home" className="aspect-[4/3] w-full object-cover" />
            <div className="glass absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 sm:right-auto">
              <span className="icon-tile icon-teal h-9 w-9"><HeartPulse className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold">Check complete · 9:02 am</p><p className="text-xs text-ink-3">Steady compared with your baseline</p></div>
            </div>
          </figure>
        </Reveal>
        <div>
          <SectionHead id="everyday-title" eyebrow="Made for everyday life" title="Ten seconds, from" accent="your living room"
            text="No wearables, no lab, no learning curve. Prop up a phone, follow the on-screen guide, and MedoShield does the rest — gently reminding you of medicines and flagging changes to your care team." />
          <Reveal delay={0.1}>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4">
              {[['10 s', 'per check'], ['0', 'devices to buy'], ['24/7', 'SOS & reminders']].map(([v, l]) => (
                <div key={l} className="border-l border-line pl-4"><dt className="num text-3xl font-semibold text-ink">{v}</dt><dd className="mt-1 text-sm text-ink-3">{l}</dd></div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── FAQ ───────────────────────── */
const FAQS = [
  ['Is my video uploaded anywhere?', 'No. For movement checks, pose tracking runs in your browser and only 33 body-landmark coordinates per frame are sent for analysis. The video itself never leaves your device. AI video review is a separate, doctor-enabled option, and even then the video is analysed in memory and discarded.'],
  ['Is MedoShield a diagnostic device?', 'No. It is a monitoring and education tool that helps you and your doctor notice change over time. It supports, but never replaces, assessment by a qualified clinician.'],
  ['Who can see my results?', 'Only you, and doctors whose appointment request you made and who accepted it. Every time a doctor opens your record it is written to an audit log, and you can end a care link at any time.'],
  ['What does the motor index measure?', 'It fuses tremor strength in the 4–12 Hz band, movement speed, left/right symmetry, trunk sway, step rhythm, arm-swing balance and cadence into a single 0–100 score. Higher is steadier.'],
  ['How does Medo, the AI assistant, stay safe?', 'Every message passes six guardrails: text normalisation, emergency triage, injection scanning, data isolation, a leak-detecting canary and output validation. Emergencies always get immediate, fixed safety guidance.'],
  ['Can I download or delete my data?', 'Yes. Settings lets you export everything as JSON, or permanently delete your account and all associated records.'],
]

export function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" aria-labelledby="faq-title" className="container py-24 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHead id="faq-title" eyebrow="Questions" title="Good questions," accent="clear answers" text="Everything people usually ask before their first check." />
          <Reveal delay={0.1}><Button to="/register" variant="outline" className="mt-8" iconRight={ArrowRight}>Try it yourself</Button></Reveal>
        </div>
        <ul className="divide-y divide-line/70 rounded-3xl border border-line/70 bg-paper">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q}>
                <h3>
                  <button className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-[1.05rem] font-medium text-ink transition hover:text-teal-800"
                    aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    {q}
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-4 transition-transform duration-300', isOpen && 'rotate-180 text-teal-700')} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${i}`} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                      <p className="px-6 pb-6 leading-relaxed text-ink-3">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────── final CTA ───────────────────────── */
export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="container pb-24">
      <Reveal className="relative overflow-hidden rounded-[2.5rem] border border-line/70 bg-paper shadow-soft">
        <div className="grid items-stretch md:grid-cols-[1.2fr_0.8fr]">
          <div className="px-7 py-14 sm:px-14">
            <span className="eyebrow">Free for patients</span>
            <h2 id="cta-title" className="mt-5 text-display-sm font-semibold sm:text-display-md text-balance">Ten seconds today. <span className="serif-accent">Peace of mind</span> tomorrow.</h2>
            <ul className="mt-6 space-y-2 text-ink-3">
              {['Your first check in under a minute', 'Video stays on your device', 'Share trends with your doctor only when you choose'].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-teal-600" /> {t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic><Button to="/register" size="lg" variant="primary" iconRight={ArrowRight}>Create my account</Button></Magnetic>
              <Button to="/login" size="lg" variant="outline">I already have one</Button>
            </div>
          </div>
          <div className="relative hidden min-h-[320px] md:block">
            <img src="https://images.unsplash.com/photo-1764072955216-547f731d176d?w=900&q=78&auto=format&fit=crop" alt="An older man taking a calm morning walk by a lake" loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/10 to-transparent" />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ───────────────────────── footer ───────────────────────── */
export function Footer() {
  const cols = [
    ['Product', [['How it works', '#how'], ['Features', '#features'], ['Security', '#security'], ['FAQ', '#faq']]],
    ['Get started', [['Create an account', '/register'], ['Join as a clinician', '/join/doctor'], ['Sign in', '/login']]],
    ['Trust', [['On-device pose AI', '#how'], ['AI guardrails', '#security'], ['Data export & deletion', '#faq']]],
  ]
  return (
    <footer className="border-t border-line/70 bg-paper/60">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tagline />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-3">Privacy-first neuro-motor monitoring. A ten-second check, measured on your device, shared with your doctor.</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-3"><ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> OWASP API Top-10 hardened</p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-ink-4">{title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([l, h]) => (
                <li key={l}>{h.startsWith('#') ? <a href={h} className="text-ink-2 hover:text-teal-800">{l}</a> : <Link to={h} className="text-ink-2 hover:text-teal-800">{l}</Link>}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line/70">
        <div className="container flex flex-col gap-3 py-6 text-xs text-ink-4 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} MedoShield AI · Not a diagnostic medical device. In an emergency, call your local emergency number.</p>
          <p>Photography: Unsplash</p>
        </div>
      </div>
    </footer>
  )
}
