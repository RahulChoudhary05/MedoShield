import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Bot, CalendarClock, CalendarHeart, Footprints, HeartPulse, Moon, Pill, ScanLine, ShieldCheck,
  Sparkles, Stethoscope, Upload, Video, Wind,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { CardHeader } from '../../components/ui/Card'
import { Avatar, ScoreRing } from '../../components/ui/Data'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Magnetic, TiltCard } from '../../components/ui/motion'
import { cn, fmtDate, fmtRelative, greeting, num, riskOf, toDate } from '../../lib/utils'
import { Sparkline } from './shared'

/* ── Hero banner ─────────────────────────────────────────────────── */
const RISK_COPY = {
  LOW: 'Your movement looks steady and close to your usual pattern.',
  MEDIUM: 'A few markers moved a little. Worth keeping an eye on — another check soon will help.',
  HIGH: 'Your last check looked different from usual. Consider sharing it with your doctor.',
  CALIBRATING: 'We’re still learning what “normal” looks like for you. A few more checks will sharpen this.',
  UNKNOWN: 'Do a movement check to see your motor index.',
}
const COMPONENT_LABEL = { tremor: 'Tremor', speed: 'Speed', symmetry: 'Symmetry', balance: 'Balance', rhythm: 'Rhythm', arm_swing: 'Arm swing', cadence: 'Cadence' }
const FIRST_STEPS = [
  { icon: ScanLine, tone: 'icon-teal', title: 'A 10-second check', text: 'Walk, stand or hold your hands out in front of your camera.' },
  { icon: ShieldCheck, tone: 'icon-teal', title: 'Private by design', text: 'Video never leaves your device — only 33 body points are analysed.' },
  { icon: Sparkles, tone: 'icon-teal', title: 'Learns your normal', text: 'After 5 checks, results compare against your own baseline.' },
]

function ScoreOrb({ risk }) {
  const level = risk?.level || 'UNKNOWN'
  const r = riskOf(level)
  const mi = risk?.motor_index || {}
  const b = risk?.baseline
  const pctBase = b ? (b.calibrated ? 100 : Math.min(100, (b.sessions / Math.max(1, b.required)) * 100)) : 0
  const parts = Object.entries(mi).filter(([k, v]) => k !== 'overall' && typeof v === 'number').sort((a, b2) => a[1] - b2[1]).slice(0, 3)
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center">
        <div aria-hidden className="absolute h-[13.5rem] w-[13.5rem] rounded-full bg-teal-100/70 blur-2xl" />
        <div className="relative grid h-[12.5rem] w-[12.5rem] place-items-center rounded-full bg-paper shadow-lift ring-8 ring-white/70">
          <ScoreRing value={mi.overall} size={168} stroke={13} color={r.color} label="Motor index" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <RiskBadge level={level} pulse />
        <span className="text-xs text-ink-3">Last check {fmtRelative(risk?.created_at)}</span>
      </div>
      {parts.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {parts.map(([k, v]) => (
            <span key={k} className="rounded-full border border-line/70 bg-paper px-2.5 py-1 text-[0.72rem] font-medium text-ink-2">
              {COMPONENT_LABEL[k] || k} <span className="num font-semibold text-ink">{Math.round(v)}</span>
            </span>
          ))}
        </div>
      )}
      {b && (
        <div className="mt-4 w-full border border-line/70 bg-paper/80 max-w-[17rem] rounded-2xl px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink-2"><Sparkles className="h-3.5 w-3.5 text-teal-600" /> Baseline</span>
            <span className="text-ink-3">{b.calibrated ? 'Calibrated to you' : `${Math.min(b.sessions, b.required)} of ${b.required} checks`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <motion.div className="h-full rounded-full bg-teal-500" initial={{ width: 0 }} animate={{ width: `${pctBase}%` }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Striking light-gradient hero: greeting + motor index orb (or first-run invite). */
export function HeroBanner({ first, risk, fresh, checks = 0 }) {
  const level = risk?.level || 'UNKNOWN'
  const sub = fresh
    ? 'Your space for keeping an eye on movement, medicines and wellbeing — gently, and privately. Let’s start with a quick check.'
    : RISK_COPY[level] + (checks < 5 ? ` You’ve done ${checks} check${checks > 1 ? 's' : ''} so far.` : '')
  return (
    <section className="card card-tint-teal relative overflow-hidden rounded-4xl">
      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> {fmtDate(new Date(), 'EEEE, d MMMM')}</span>
          <h1 className="mt-4 text-[2.2rem] font-semibold leading-[1.02] tracking-tight sm:text-[3.1rem] text-balance">
            {greeting()}{first ? ',' : ''} {first && <span className="serif-accent">{first}</span>}
          </h1>
          <p className="mt-3 max-w-xl text-[0.98rem] text-ink-2 text-pretty">{sub}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Button to="/app/check" variant="primary" size="lg" icon={ScanLine} iconRight={ArrowRight}>{fresh ? 'Start my first check' : 'Start movement check'}</Button>
            </Magnetic>
            <Button to="/app/assistant" variant="outline" icon={Bot}>{fresh ? 'How does it work?' : 'Ask Medo'}</Button>
          </div>
          {!fresh && (
            <p className="mt-5 flex items-center gap-2 text-xs text-ink-3"><ShieldCheck className="h-4 w-4 text-teal-500" /> Video stays on your device — only body keypoints are analysed.</p>
          )}
        </div>
        {fresh ? (
          <ul className="grid gap-3">
            {FIRST_STEPS.map((s, i) => (
              <motion.li key={s.title} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1 }} className="flex items-start gap-3 rounded-2xl border border-line/70 bg-paper/80 p-4">
                <span className={cn('icon-tile h-11 w-11 shrink-0', s.tone)}><s.icon className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-ink">{s.title}</p>
                  <p className="text-sm text-ink-3">{s.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        ) : (
          <ScoreOrb risk={risk} />
        )}
      </div>
    </section>
  )
}

/* ── Today's medicines ────────────────────────────────────────────── */
function minutesOf(slot) {
  const [h, m] = String(slot).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function fmtSlot(slot) {
  const mins = minutesOf(slot)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export function MedsToday({ medications = [] }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const doses = medications
    .flatMap((m) => (m.time_slots || []).map((slot) => ({ slot, mins: minutesOf(slot), name: m.name, dosage: m.dosage, instructions: m.instructions })))
    .sort((a, b) => a.mins - b.mins)
  const nextIdx = doses.findIndex((d) => d.mins >= nowMin - 15)
  return (
    <div className="card card-pad h-full">
      <CardHeader icon={Pill} tone="teal" title="Today’s medicines" subtitle={doses.length ? `${doses.length} dose${doses.length > 1 ? 's' : ''} scheduled` : 'Nothing scheduled'}
        action={<Button to="/app/medications" variant="ghost" size="sm" iconRight={ArrowUpRight}>Manage</Button>} />
      {doses.length === 0 ? (
        <EmptyState icon={Pill} tone="teal" className="py-6" title="No medicines added" text="Add your plan to get gentle reminders at the right time." action={<Button to="/app/medications" variant="soft" size="sm">Add medicines</Button>} />
      ) : (
        <ol className="relative space-y-1.5">
          {doses.slice(0, 6).map((d, i) => {
            const past = nextIdx === -1 || i < nextIdx
            const next = i === nextIdx
            return (
              <li key={`${d.name}-${d.slot}`} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors', next ? 'bg-apricot-50 ring-1 ring-inset ring-apricot-100' : 'hover:bg-cream')}>
                <span className={cn('num w-[4.6rem] shrink-0 text-sm font-semibold', past ? 'text-ink-4' : 'text-ink')}>{fmtSlot(d.slot)}</span>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', next ? 'bg-apricot-400' : past ? 'bg-line' : 'bg-teal-300')} />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', past ? 'text-ink-3' : 'text-ink')}>{d.name} {d.dosage && <span className="font-normal text-ink-4">· {d.dosage}</span>}</p>
                  {d.instructions && next && <p className="truncate text-xs text-ink-3">{d.instructions}</p>}
                </div>
                {next && <Badge tone="teal">Next</Badge>}
              </li>
            )
          })}
          {doses.length > 6 && <li className="px-3 pt-1 text-xs text-ink-4">+{doses.length - 6} more later today</li>}
        </ol>
      )}
    </div>
  )
}

/* ── Care team ────────────────────────────────────────────────────── */
export function CareTeamCard({ team = [] }) {
  return (
    <div className="card card-pad h-full">
      <CardHeader icon={Stethoscope} tone="teal" title="Your care team" subtitle={team.length ? `${team.length} clinician${team.length > 1 ? 's' : ''}` : 'Not connected yet'}
        action={<Button to="/app/care" variant="ghost" size="sm" iconRight={ArrowUpRight}>{team.length ? 'View' : 'Find'}</Button>} />
      {team.length === 0 ? (
        <EmptyState icon={Stethoscope} tone="teal" className="py-6" title="Connect with a neurologist" text="Share your trends with a doctor and unlock AI video reviews." action={<Button to="/app/care" variant="soft" size="sm">Browse doctors</Button>} />
      ) : (
        <ul className="space-y-2">
          {team.slice(0, 4).map((d) => (
            <li key={d.id}>
              <Link to="/app/care" className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-cream">
                <Avatar name={d.full_name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{d.full_name}</p>
                  <p className="truncate text-xs text-ink-3">{d.specialty || 'Clinician'}{d.clinic_name ? ` · ${d.clinic_name}` : ''}</p>
                </div>
                {d.video_unlocked && <Badge tone="teal" className="hidden sm:inline-flex"><Video className="h-3 w-3" /> Video review</Badge>}
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Appointments ─────────────────────────────────────────────────── */
export function AppointmentsCard({ appointments = [], team = [] }) {
  const names = Object.fromEntries(team.map((d) => [d.id, d.full_name]))
  return (
    <div className="card card-pad h-full">
      <CardHeader icon={CalendarClock} tone="teal" title="Upcoming visits" subtitle={appointments.length ? 'Requested and confirmed' : 'None booked'}
        action={<Button to="/app/care" variant="ghost" size="sm" iconRight={ArrowUpRight}>Book</Button>} />
      {appointments.length === 0 ? (
        <EmptyState icon={CalendarHeart} tone="teal" className="py-6" title="No visits planned" text="Book a video or in-person visit with your care team." />
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => {
            const d = a.preferred_date ? toDate(a.preferred_date) : null
            const valid = d && !isNaN(d)
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-cream/60 p-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-center shadow-soft">
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-apricot-600">{valid ? fmtDate(d, 'MMM') : '—'}</p>
                    <p className="num text-lg font-semibold leading-none text-ink">{valid ? fmtDate(d, 'd') : '?'}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{names[a.doctor_id] || 'Your doctor'}</p>
                  <p className="truncate text-xs text-ink-3">{a.preferred_time || 'Time to confirm'} · {(a.meeting_mode || 'visit').replace(/_/g, ' ')}</p>
                </div>
                <Badge tone={a.status === 'accepted' ? 'teal' : 'ink'} dot>{a.status === 'accepted' ? 'Confirmed' : 'Pending'}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── Quick actions bento ──────────────────────────────────────────── */
const ACTIONS = [
  { to: '/app/assistant', icon: Bot, title: 'Ask Medo', text: 'Questions about your results, medicines or symptoms — answered in plain words, with care.', bg: 'card-tint-teal', ic: 'icon-tile icon-teal', bold: true, span: 'sm:col-span-2 lg:col-span-1 lg:row-span-2' },
  { to: '/app/reports', icon: Upload, title: 'Upload a lab report', text: 'Get a clear explanation of a PDF report.', bg: 'bg-paper', ic: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  { to: '/app/video', icon: Video, title: 'Video review', text: 'Doctor-enabled AI gait review.', bg: 'bg-paper', ic: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  { to: '/app/wellbeing', icon: HeartPulse, title: 'Log wellbeing', text: 'Sleep, stress and steps in 20 seconds.', bg: 'bg-paper', ic: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70', span: 'sm:col-span-2' },
]

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIONS.map((a, i) => (
        <motion.div key={a.to} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className={cn('group', a.span)}>
          <TiltCard max={5} className="h-full rounded-3xl">
            <Link to={a.to} className={cn('relative flex h-full min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-3xl border border-white p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift', a.bg)}>
              <span className={cn('relative grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110', a.ic)}><a.icon className="h-5 w-5" /></span>
              <div className="relative mt-6">
                <p className={cn('flex items-center gap-1.5 font-display font-semibold', a.bold ? 'text-2xl text-ink' : 'text-lg text-ink')}>
                  {a.title} <ArrowUpRight className={cn('h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5', 'text-ink-4 group-hover:text-ink')} />
                </p>
                <p className={cn('mt-0.5 text-sm', a.bold ? 'max-w-xs text-ink-3' : 'text-ink-3')}>{a.text}</p>
              </div>
            </Link>
          </TiltCard>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Lifestyle summary ────────────────────────────────────────────── */
const LIFE = [
  { key: 'sleep_hours', label: 'Sleep', unit: 'h', icon: Moon, color: '#3A6652', digits: 1, good: (v) => v >= 7 },
  { key: 'stress_level', label: 'Stress', unit: '/10', icon: Wind, color: '#3A6652', digits: 0, good: (v) => v <= 4 },
  { key: 'walking_distance', label: 'Walking', unit: 'km', icon: Footprints, color: '#3A6652', digits: 1, good: (v) => v >= 4 },
  { key: 'heart_rate', label: 'Resting HR', unit: 'bpm', icon: HeartPulse, color: '#3A6652', digits: 0, good: (v) => v >= 50 && v <= 90 },
]

export function LifestyleCard({ records = [] }) {
  const series = [...records].reverse()
  return (
    <div className="card card-pad">
      <CardHeader icon={HeartPulse} tone="teal" title="Lifestyle this week" subtitle={records.length ? `From your last ${records.length} log${records.length > 1 ? 's' : ''}` : 'Nothing logged yet'}
        action={<Button to="/app/wellbeing" variant="ghost" size="sm" iconRight={ArrowUpRight}>Log today</Button>} />
      {records.length === 0 ? (
        <EmptyState icon={HeartPulse} tone="teal" className="py-6" title="Sleep and stress affect movement" text="A quick daily log helps explain good and harder days." action={<Button to="/app/wellbeing" variant="soft" size="sm">Log wellbeing</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LIFE.map((m) => {
            const vals = series.map((r) => r[m.key])
            const latest = [...vals].reverse().find((v) => v != null)
            return (
              <div key={m.key} className="tile flex min-w-0 flex-col gap-2 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><m.icon className="h-3.5 w-3.5" style={{ color: m.color }} /> {m.label}</p>
                <div className="flex items-end justify-between gap-2">
                  <p className="num text-xl font-semibold text-ink">{latest != null ? num(latest, m.digits) : '—'}<span className="ml-0.5 text-xs font-normal text-ink-4">{latest != null ? m.unit : ''}</span></p>
                  {latest != null && <span className={cn('h-2 w-2 shrink-0 rounded-full', m.good(Number(latest)) ? 'bg-teal-400' : 'bg-apricot-300')} title={m.good(Number(latest)) ? 'In a healthy range' : 'Worth a look'} />}
                </div>
                <Sparkline values={vals} color={m.color} width={140} height={30} className="w-full max-w-full" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Loading skeleton ─────────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <Skeleton className="h-[22rem] rounded-4xl" />
      <Skeleton className="mt-5 h-[21rem] rounded-3xl" />
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
      </div>
    </div>
  )
}
