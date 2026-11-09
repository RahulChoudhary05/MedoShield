import { useEffect, useState, Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ScanLine } from 'lucide-react'
import Button from '../../components/ui/Button'
import { RiskBadge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { cn, fmtDate, fmtRelative, num } from '../../lib/utils'
import { Empty, InlineError, Section, SkeletonRows } from '../care/kit'
import { TASK_LIST, normLevel, taskOf } from './shared'

const EASE = [0.2, 0.8, 0.2, 1]

/* ── Step indicator: prepare → record → analyse → result ─────────── */
export const STEPS = [
  { key: 'task', label: 'Prepare' },
  { key: 'capture', label: 'Record' },
  { key: 'analyse', label: 'Analyse' },
  { key: 'result', label: 'Result' },
]

/** progress (0–1) fills the current step's rail — e.g. the live recording. */
export function Stepper({ step, seconds, progress }) {
  const idx = STEPS.findIndex((s) => s.key === step)
  return (
    <nav aria-label="Movement check progress" className="mb-6">
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < idx
          const cur = i === idx
          const fill = done ? 1 : cur ? (progress ?? 0) : 0
          const label = s.key === 'capture' && seconds ? `${s.label} ${seconds} s` : s.label
          return (
            <li key={s.key} aria-current={cur ? 'step' : undefined} className="min-w-0">
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full rounded-full bg-teal-700" initial={false} animate={{ width: `${fill * 100}%` }} transition={{ duration: cur && progress != null ? 0.2 : 0.6, ease: EASE }} />
              </div>
              <p className={cn('mt-2 flex items-center gap-1.5 truncate font-mono text-[0.8125rem]', cur ? 'text-ink' : done ? 'text-teal-700' : 'text-ink-3')}>
                {done ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden /> : <span className="num">{String(i + 1).padStart(2, '0')}</span>}
                <span className="truncate">{label}</span>
                {done && <span className="sr-only">(done)</span>}
              </p>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ── Code-generated 3D human for each task ───────────────────────── */
const HumanCanvas = lazy(() => import('../../components/three/RealHuman'))
export function PoseFigure({ task, active = true }) {
  return (
    <Suspense fallback={<div className="grid h-full w-full place-items-center"><span className="skeleton h-24 w-12 rounded-full" /></div>}>
      <HumanCanvas walking={task !== 'stand' && task !== 'hands'} markers={active} autoRotate={false} className="h-full w-full" />
    </Suspense>
  )
}

/* ── Task picker ─────────────────────────────────────────────────── */
export function TaskPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Choose a movement task" className="grid gap-4 md:grid-cols-3">
      {TASK_LIST.map((t, i) => {
        const on = value === t.value
        return (
          <motion.button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.value)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.45, ease: EASE }}
            className={cn(
              'group relative flex flex-col rounded-3xl border bg-paper p-5 text-left transition duration-200 ease-out hover:-translate-y-0.5',
              on ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink-4/60 hover:shadow-lift',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kicker">About {t.seconds} s</p>
                <p className="mt-1 font-serif text-[1.75rem] leading-none text-ink">{t.label}</p>
              </div>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors', on ? 'border-teal-700 bg-teal-700 text-paper' : 'border-line bg-paper')} aria-hidden>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
              </span>
            </div>
            <div className="my-4 h-44 w-full overflow-hidden rounded-xl bg-cream/70">
              <PoseFigure task={t.value} active={on} />
            </div>
            <p className="text-[0.9375rem] text-ink-2 text-pretty">{t.blurb}</p>
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {t.measures.map((m) => <li key={m} className="py-1.5 font-mono text-[0.8125rem] text-ink-3">{m}</li>)}
            </ul>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Analysing sequence ───────────────────────────────────────────── */
const ANALYSE_STEPS = [
  'Smoothing 33 body keypoints',
  'Measuring step rhythm and symmetry',
  'Scanning the 4–12 Hz tremor band',
  'Checking balance and trunk sway',
  'Comparing with your personal baseline',
  'Writing your summary',
]

export function AnalysingSequence({ frames, task }) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(ANALYSE_STEPS.length - 1, n + 1)), 650)
    return () => clearInterval(id)
  }, [])
  const pct = ((i + 1) / ANALYSE_STEPS.length) * 100
  return (
    <div className="card p-5 sm:p-8" role="status" aria-live="polite">
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="relative mx-auto h-60 w-full max-w-[15rem] overflow-hidden rounded-xl bg-cream/70">
          <PoseFigure task={task} active />
          {!reduce && (
            <motion.div aria-hidden className="absolute inset-x-4 h-px bg-teal-700/70"
              animate={{ top: ['12%', '88%', '12%'] }} transition={{ duration: 2.6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }} />
          )}
        </div>
        <div>
          <p className="kicker">Extracting biomarkers</p>
          <h2 className="mt-2 font-serif text-[2rem] leading-tight text-ink">Reading your <span className="text-teal-600">movement</span></h2>
          <p className="mt-1.5 text-[0.9375rem] text-ink-3">{frames ? <><span className="num">{frames}</span> pose frames</> : 'Pose frames'} from your device — no video was sent.</p>
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <motion.div className="h-full rounded-full bg-teal-700" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: EASE }} />
          </div>
          <ol className="mt-4 divide-y divide-line">
            {ANALYSE_STEPS.map((s, n) => (
              <li key={s} className={cn('flex items-center gap-3 py-2 text-[0.9375rem] transition-colors duration-300', n <= i ? 'text-ink-2' : 'text-ink-4')}>
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors', n < i ? 'border-teal-700 bg-teal-700 text-paper' : n === i ? 'border-teal-700' : 'border-line')} aria-hidden>
                  {n < i ? <Check className="h-3 w-3" strokeWidth={2.6} /> : n === i ? <span className="h-1.5 w-1.5 rounded-full bg-teal-700" /> : null}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

/* ── Previous checks ──────────────────────────────────────────────── */
export function CheckHistory({ limit = 8 }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['analysis', 'sessions', limit], queryFn: () => api.analysis.sessions(undefined, limit) })
  const rows = data?.sessions || []
  return (
    <Section id="check-history" kicker={rows.length ? `Last ${rows.length}` : 'History'} title="Recent checks" className="mt-6">
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : isError ? (
        <InlineError error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Empty icon={ScanLine} text="Your results appear here so you can see how things change." action={<Button to="/app/check" variant="outline" icon={ScanLine} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Start a check</Button>} />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {rows.map((s) => {
            const t = taskOf(s.task)
            const f = s.extracted_features || {}
            const bits = [
              f.gait_symmetry != null && `Symmetry ${Math.round(f.gait_symmetry * 100)}%`,
              f.cadence ? `${num(f.cadence)} steps/min` : null,
              f.tremor_frequency ? `Tremor ${num(f.tremor_frequency, 1)} Hz` : null,
            ].filter(Boolean)
            return (
              <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                <p className="font-mono text-[0.8125rem] text-ink-3 sm:order-none" title={fmtDate(s.created_at, 'd MMM yyyy, HH:mm')}>{fmtRelative(s.created_at)}</p>
                <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
                  <p className="flex items-center gap-2 font-medium text-ink"><t.icon className="h-4 w-4 text-ink-3" strokeWidth={1.8} aria-hidden />{t.label}</p>
                  <p className="truncate text-[0.8125rem] text-ink-3">{bits.length ? bits.join(' · ') : `${s.frame_count || 0} frames · ${num(s.video_duration, 1)} s`}</p>
                </div>
                <div className="row-start-1 justify-self-end sm:row-start-auto"><RiskBadge level={normLevel(f.risk_level)} short /></div>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
