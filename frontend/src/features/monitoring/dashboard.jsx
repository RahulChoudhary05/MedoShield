import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Bot, CalendarClock, HeartPulse, LineChart, Pill, ScanLine, ShieldCheck, Sparkles, Stethoscope, Upload, Video,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Data'
import { CountUp } from '../../components/ui/motion'
import MotorTrendChart, { ChartLegend } from '../../components/charts/MotorTrendChart'
import { cn, fmtDate, fmtRelative, num, riskOf, toDate } from '../../lib/utils'
import { Empty, Section } from '../care/kit'
import { Sparkline } from './shared'

const EASE = [0.2, 0.8, 0.2, 1]

/* ── Status copy ──────────────────────────────────────────────────── */
const RISK_COPY = {
  LOW: 'Your movement looks steady and close to your usual pattern.',
  MEDIUM: 'A few markers moved a little. Worth keeping an eye on — another check soon will help.',
  HIGH: 'Your last check looked different from usual. Consider sharing it with your doctor.',
  CALIBRATING: 'We’re still learning what “normal” looks like for you. A few more checks will sharpen this.',
  UNKNOWN: 'Do a movement check to see your motor index.',
}

/** The one-sentence summary that sits under the page title. */
export function statusSentence({ risk, fresh, checks = 0 }) {
  if (fresh) return 'Your space for keeping an eye on movement, medicines and wellbeing — privately. Start with a 10-second check.'
  const level = risk?.level || 'UNKNOWN'
  return (RISK_COPY[level] || RISK_COPY.UNKNOWN) + (checks < 5 ? ` You’ve done ${checks} check${checks === 1 ? '' : 's'} so far.` : '')
}

const COMPONENT_LABEL = { tremor: 'Tremor', speed: 'Speed', symmetry: 'Symmetry', balance: 'Balance', rhythm: 'Rhythm', arm_swing: 'Arm swing', cadence: 'Cadence' }

/* ── First run ────────────────────────────────────────────────────── */
const FIRST_STEPS = [
  { icon: ScanLine, title: 'A 10-second check', text: 'Walk, stand or hold your hands out in front of your camera.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Video never leaves your device — only 33 body points are analysed.' },
  { icon: Sparkles, title: 'Learns your normal', text: 'After 5 checks, results compare against your own baseline.' },
]

export function FirstSteps() {
  return (
    <Section kicker="Getting started" title="How a check works" action={<Button to="/app/check" variant="brand" icon={ScanLine}>Start my first check</Button>}>
      <ol className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {FIRST_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 sm:flex-col sm:px-5 sm:first:pl-0 sm:last:pr-0">
            <span className="num w-6 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="flex items-center gap-2 font-medium text-ink"><s.icon className="h-4 w-4 text-teal-700" strokeWidth={1.8} aria-hidden /> {s.title}</p>
              <p className="mt-1 text-[0.9375rem] text-ink-3">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/* ── Latest check: measurement grid ───────────────────────────────── */
function Cell({ label, children, hint, className }) {
  return (
    <div className={cn('min-w-0 border-t border-line pt-3', className)}>
      <p className="kicker truncate">{label}</p>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[0.8125rem] text-ink-3">{hint}</p>}
    </div>
  )
}

export function LatestCheck({ risk, stats = {} }) {
  const level = risk?.level || 'UNKNOWN'
  const r = riskOf(level)
  const mi = risk?.motor_index || {}
  const b = risk?.baseline
  const pctBase = b ? (b.calibrated ? 100 : Math.min(100, (b.sessions / Math.max(1, b.required)) * 100)) : 0
  const parts = Object.entries(mi).filter(([k, v]) => k !== 'overall' && typeof v === 'number').sort((a, c) => a[1] - c[1]).slice(0, 3)
  const adherence = stats.adherence_14d

  return (
    <Section
      kicker={`Latest check · ${fmtRelative(risk?.created_at)}`}
      title="Today’s readout"
      action={<Button to="/app/check" variant="ghost" iconRight={ArrowUpRight}>New check</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_1fr] lg:gap-10">
        <div>
          <p className="kicker">Motor index</p>
          <p className="mt-2 flex items-baseline gap-2 leading-none">
            <CountUp value={mi.overall} className="text-[3.5rem] text-ink" />
            <span className="font-mono text-[0.9375rem] text-ink-3">/ 100</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
            <motion.div className="h-full rounded-full" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, mi.overall || 0))}%` }} transition={{ duration: 1.1, ease: EASE }} />
          </div>
          <div className="mt-3"><RiskBadge level={level} /></div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {parts.map(([k, v]) => (
            <Cell key={k} label={COMPONENT_LABEL[k] || k}>
              <CountUp value={v} className="text-[1.5rem] text-ink" />
            </Cell>
          ))}
          <Cell label="Baseline" hint={b ? (b.calibrated ? 'Calibrated to you' : `${Math.min(b.sessions, b.required)} of ${b.required} checks`) : 'Not started'}>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
              <motion.div className="h-full rounded-full bg-lilac-400" initial={{ width: 0 }} animate={{ width: `${pctBase}%` }} transition={{ duration: 1, ease: EASE }} />
            </div>
          </Cell>
          <Cell label="Checks, all time"><CountUp value={stats.movement_checks ?? 0} className="text-[1.5rem] text-ink" /></Cell>
          <Cell label="Adherence, 14 days" hint={adherence == null ? 'Add medicines to track' : null}>
            {adherence == null ? <span className="num text-[1.5rem] text-ink-3">—</span> : <CountUp value={adherence} suffix="%" className="text-[1.5rem] text-ink" />}
          </Cell>
          <Cell label="Active medicines"><CountUp value={stats.active_medications ?? 0} className="text-[1.5rem] text-ink" /></Cell>
          <Cell label="Unread updates" hint={stats.unread_notifications ? 'See the bell above' : 'All caught up'}>
            <CountUp value={stats.unread_notifications ?? 0} className="text-[1.5rem] text-ink" />
          </Cell>
        </div>
      </div>
      <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-[0.9375rem] text-ink-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden /> Video stays on your device — only body keypoints are analysed.
      </p>
    </Section>
  )
}

/* ── Trend ────────────────────────────────────────────────────────── */
export function TrendSection({ trends = [] }) {
  const cutoff = Date.now() - 30 * 86_400_000
  const recent = trends.filter((p) => toDate(p.date)?.getTime() >= cutoff)
  const use30 = recent.length >= 2
  const pts = use30 ? recent : trends
  return (
    <Section
      kicker={use30 ? 'Last 30 days' : 'Last 60 days'}
      title="Motor index over time"
      action={<Button to="/app/timeline" variant="ghost" iconRight={ArrowUpRight}>Timeline</Button>}
    >
      {pts.length >= 2 ? (
        <>
          <MotorTrendChart points={pts} height={260} />
          <div className="mt-4 border-t border-line pt-3"><ChartLegend /></div>
        </>
      ) : (
        <Empty icon={LineChart} title="Your trend appears after two checks" text="Check at a similar time each day — for example, an hour after your morning medicine."
          action={<Button to="/app/check" variant="outline" icon={ScanLine}>Do another check</Button>} />
      )}
    </Section>
  )
}

/* ── Next medication ──────────────────────────────────────────────── */
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
  const next = nextIdx >= 0 ? doses[nextIdx] : null
  const later = nextIdx >= 0 ? doses.slice(nextIdx + 1, nextIdx + 4) : []

  return (
    <Section kicker={doses.length ? `${doses.length} dose${doses.length > 1 ? 's' : ''} today` : 'Nothing scheduled'} title="Next medication"
      action={<Button to="/app/medications" variant="ghost" iconRight={ArrowUpRight}>Manage</Button>} className="h-full">
      {doses.length === 0 ? (
        <Empty icon={Pill} text="Add your plan to get reminders at the right time." action={<Button to="/app/medications" variant="outline" icon={Pill}>Add a medicine</Button>} className="sm:flex-col sm:items-start" />
      ) : next ? (
        <div>
          <p className="num text-[2rem] leading-none text-ink">{fmtSlot(next.slot)}</p>
          <p className="mt-2 font-medium text-ink">{next.name}{next.dosage && <span className="font-normal text-ink-3"> · {next.dosage}</span>}</p>
          {next.instructions && <p className="mt-1 text-[0.9375rem] text-ink-3">{next.instructions}</p>}
          {later.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {later.map((d) => (
                <li key={`${d.name}-${d.slot}`} className="flex items-baseline gap-3 py-2.5">
                  <span className="num w-[4.75rem] shrink-0 text-ink-3">{fmtSlot(d.slot)}</span>
                  <span className="min-w-0 truncate text-[0.9375rem] text-ink-2">{d.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-[0.9375rem] text-ink-2">All of today’s doses are behind you. Next reminder tomorrow at <span className="num">{fmtSlot(doses[0].slot)}</span>.</p>
      )}
    </Section>
  )
}

/* ── Care team ────────────────────────────────────────────────────── */
export function CareTeamCard({ team = [] }) {
  const video = team.some((d) => d.video_unlocked)
  return (
    <Section kicker={team.length ? `${team.length} clinician${team.length > 1 ? 's' : ''}${video ? ' · video review on' : ''}` : 'Not connected yet'} title="Care team"
      action={<Button to="/app/care" variant="ghost" iconRight={ArrowUpRight}>{team.length ? 'View' : 'Find'}</Button>} className="h-full">
      {team.length === 0 ? (
        <Empty icon={Stethoscope} text="Share your trends with a neurologist." action={<Button to="/app/care" variant="outline" icon={Stethoscope}>Find a doctor</Button>} className="sm:flex-col sm:items-start" />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {team.slice(0, 4).map((d) => (
            <li key={d.id}>
              <Link to="/app/care" className="group flex min-h-[44px] items-center gap-3 py-2.5">
                <Avatar name={d.full_name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{d.full_name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{d.specialty || 'Clinician'}{d.clinic_name ? ` · ${d.clinic_name}` : ''}</span>
                </span>
                {d.video_unlocked && <Video className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-label="Video review enabled" />}
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

/* ── Appointments ─────────────────────────────────────────────────── */
export function AppointmentsCard({ appointments = [], team = [] }) {
  const names = Object.fromEntries(team.map((d) => [d.id, d.full_name]))
  return (
    <Section kicker={appointments.length ? 'Requested and confirmed' : 'None booked'} title="Upcoming visits"
      action={<Button to="/app/care" variant="ghost" iconRight={ArrowUpRight}>Book</Button>} className="h-full">
      {appointments.length === 0 ? (
        <Empty icon={CalendarClock} text="Book a video or in-person visit." action={<Button to="/app/care" variant="outline" icon={CalendarClock}>Book a visit</Button>} className="sm:flex-col sm:items-start" />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {appointments.map((a) => {
            const d = a.preferred_date ? toDate(a.preferred_date) : null
            const valid = d && !isNaN(d)
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="w-12 shrink-0 text-center">
                  <span className="block font-mono text-[0.8125rem] text-apricot-600">{valid ? fmtDate(d, 'MMM') : '—'}</span>
                  <span className="num block text-[1.25rem] leading-none text-ink">{valid ? fmtDate(d, 'd') : '?'}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{names[a.doctor_id] || 'Your doctor'}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{a.preferred_time || 'Time to confirm'} · {(a.meeting_mode || 'visit').replace(/_/g, ' ')}</span>
                </span>
                <Badge tone={a.status === 'accepted' ? 'teal' : 'ink'} dot>{a.status === 'accepted' ? 'Confirmed' : 'Pending'}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

/* ── Quick actions ────────────────────────────────────────────────── */
const ACTIONS = [
  { to: '/app/assistant', icon: Bot, title: 'Ask Medo', text: 'Questions about results, medicines or symptoms.' },
  { to: '/app/reports', icon: Upload, title: 'Explain a lab report', text: 'Upload a PDF for a plain-language read.' },
  { to: '/app/video', icon: Video, title: 'Video review', text: 'Doctor-enabled AI gait review.' },
  { to: '/app/wellbeing', icon: HeartPulse, title: 'Log wellbeing', text: 'Sleep, stress and steps in 20 seconds.' },
]

export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((a) => (
        <Link key={a.to} to={a.to} className="card group flex min-h-[44px] items-start gap-3 p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-teal-700 ring-1 ring-inset ring-line">
            <a.icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              {a.title}
              <ArrowRight className="h-4 w-4 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px] group-hover:text-ink" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="mt-0.5 block text-[0.9375rem] text-ink-3">{a.text}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}

/* ── Lifestyle summary ────────────────────────────────────────────── */
const LIFE = [
  { key: 'sleep_hours', label: 'Sleep', unit: 'h', digits: 1, good: (v) => v >= 7 },
  { key: 'stress_level', label: 'Stress', unit: '/10', digits: 0, good: (v) => v <= 4 },
  { key: 'walking_distance', label: 'Walking', unit: 'km', digits: 1, good: (v) => v >= 4 },
  { key: 'heart_rate', label: 'Resting heart rate', unit: 'bpm', digits: 0, good: (v) => v >= 50 && v <= 90 },
]

export function LifestyleCard({ records = [] }) {
  const series = [...records].reverse()
  return (
    <Section kicker={records.length ? `From your last ${records.length} log${records.length > 1 ? 's' : ''}` : 'Nothing logged yet'} title="Lifestyle this week"
      action={<Button to="/app/wellbeing" variant="ghost" iconRight={ArrowUpRight}>Log today</Button>}>
      {records.length === 0 ? (
        <Empty icon={HeartPulse} text="Sleep and stress affect movement — a quick daily log helps explain harder days." action={<Button to="/app/wellbeing" variant="outline" icon={HeartPulse}>Log wellbeing</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {LIFE.map((m) => {
            const vals = series.map((r) => r[m.key])
            const latest = [...vals].reverse().find((v) => v != null)
            const ok = latest != null && m.good(Number(latest))
            return (
              <div key={m.key} className="min-w-0 border-t border-line pt-3">
                <p className="kicker truncate">{m.label}</p>
                <p className="mt-1.5 flex items-baseline gap-1">
                  <span className="num text-[1.5rem] leading-none text-ink">{latest != null ? num(latest, m.digits) : '—'}</span>
                  {latest != null && <span className="font-mono text-[0.8125rem] text-ink-3">{m.unit}</span>}
                </p>
                {latest != null && <p className={cn('mt-1 text-[0.8125rem]', ok ? 'text-teal-700' : 'text-apricot-600')}>{ok ? 'In a healthy range' : 'Worth a look'}</p>}
                <Sparkline values={vals} color="#234A38" width={140} height={28} className="mt-2 w-full max-w-full" />
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

/* ── Loading skeleton ─────────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <div className="mb-8 border-b border-line pb-6">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-3 h-10 w-72 max-w-full" />
        <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="skeleton h-72 rounded-3xl" />
      <div className="skeleton mt-5 h-80 rounded-3xl" />
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}
      </div>
    </div>
  )
}
