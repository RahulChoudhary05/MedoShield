import { useEffect, useState, Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, History, ScanLine } from 'lucide-react'
import { RiskBadge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { cn, fmtDate, fmtRelative, num } from '../../lib/utils'
import { TASK_LIST, TONE_SOFT, normLevel, taskOf } from './shared'

/* ── Animated stepper ─────────────────────────────────────────────── */
export const STEPS = [
  { key: 'task', label: 'Choose' },
  { key: 'capture', label: 'Record' },
  { key: 'analyse', label: 'Analyse' },
  { key: 'result', label: 'Results' },
]

export function Stepper({ step }) {
  const idx = STEPS.findIndex((s) => s.key === step)
  return (
    <nav aria-label="Movement check progress" className="card card-tint-teal px-3 py-3 sm:px-5">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < idx
          const cur = i === idx
          return (
            <li key={s.key} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')} aria-current={cur ? 'step' : undefined}>
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ scale: cur ? 1.08 : 1 }}
                  className={cn(
                    'relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-300',
                    done ? 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200' : cur ? 'bg-teal-600 text-white shadow-soft' : 'bg-cream text-ink-4 ring-1 ring-inset ring-line',
                  )}
                >
                  {cur && <span className="absolute inset-0 animate-pulse2 rounded-full bg-teal-300/40" />}
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </motion.span>
                <span className={cn('hidden text-sm font-medium sm:block', cur ? 'text-teal-700 font-semibold' : done ? 'text-teal-700' : 'text-ink-4')}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-line/70 sm:mx-4">
                  <motion.div className="h-full rounded-full bg-teal-500" initial={false} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ── Code-generated 3D human for each task ───────────────────────── */
const HumanCanvas = lazy(() => import('../../components/three/HumanModel'))
export function PoseFigure({ task, active = true }) {
  return (
    <Suspense fallback={<div className="grid h-full w-full place-items-center"><span className="h-6 w-6 animate-pulse rounded-full bg-teal-100" /></div>}>
      <HumanCanvas pose={task === 'stand' || task === 'hands' ? task : 'walk'} markers={active} className="h-full w-full" />
    </Suspense>
  )
}

/* ── Task picker ─────────────────────────────────────────────────── */
const TINT = { teal: 'card-tint-teal', lilac: 'card-tint-teal', apricot: 'card-tint-teal' }
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'group relative flex flex-col rounded-3xl border bg-paper p-5 text-left shadow-soft transition-[border-color,box-shadow] duration-300',
              on ? cn('border-transparent shadow-lift ring-4 ring-teal-100', TINT[t.tone]) : 'border-white hover:shadow-lift',
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', TONE_SOFT[t.tone])}><t.icon className="h-5 w-5" /></span>
              <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2 transition-colors', on ? 'border-teal-600 bg-teal-600 text-white' : 'border-line')}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </div>
            <div className="my-4 h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-cream/80 to-paper ring-1 ring-line/60">
              <PoseFigure task={t.value} active={on} />
            </div>
            <p className="font-display text-xl font-semibold text-ink">{t.label}</p>
            <p className="mt-1 text-sm text-ink-3 text-pretty">{t.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {t.measures.map((m) => <span key={m} className="rounded-full bg-cream px-2.5 py-1 text-[0.72rem] font-medium text-ink-2 ring-1 ring-inset ring-line/70">{m}</span>)}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-4"><Clock className="h-3.5 w-3.5" /> About {t.seconds} seconds</p>
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
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(ANALYSE_STEPS.length - 1, n + 1)), 650)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="card card-tint-teal relative overflow-hidden p-6 sm:p-10" role="status" aria-live="polite">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dot-grid [background-size:22px_22px] opacity-50" />
      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,240px)_1fr]">
        <div className="relative mx-auto aspect-square w-48 sm:w-56">
          <motion.div className="absolute inset-0 rounded-full border-2 border-dashed border-teal-200" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-teal-50 to-paper shadow-inset" />
          <div className="absolute inset-4 overflow-hidden rounded-full"><PoseFigure task={task} active /></div>
          <motion.div aria-hidden className="absolute inset-x-6 h-0.5 rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-glow"
            animate={{ top: ['18%', '82%', '18%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div>
          <p className="text-teal-700 text-xs font-semibold uppercase tracking-[.16em]">Extracting biomarkers</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Reading your <span className="serif-accent">movement</span>…</h2>
          <p className="mt-1.5 text-sm text-ink-3">{frames ? `${frames} pose frames` : 'Pose frames'} from your device — no video was sent.</p>
          <ul className="mt-5 space-y-2">
            {ANALYSE_STEPS.map((s, n) => (
              <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: n <= i ? 1 : 0.35, x: 0 }} transition={{ delay: n * 0.05 }} className="flex items-center gap-3 text-sm">
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors', n < i ? 'icon-teal text-white' : n === i ? 'bg-teal-50 ring-2 ring-teal-300' : 'bg-cream ring-1 ring-line')}>
                  {n < i ? <Check className="h-3 w-3" strokeWidth={3} /> : n === i ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" /> : null}
                </span>
                <span className={n <= i ? 'text-ink-2' : 'text-ink-4'}>{s}</span>
              </motion.li>
            ))}
          </ul>
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
    <section className="card card-pad" aria-labelledby="check-history">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="check-history" className="flex items-center gap-2.5 text-base font-semibold">
          <span className="icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70 h-8 w-8 rounded-xl"><History className="h-4 w-4" /></span>
          Recent checks
        </h2>
        {rows.length > 0 && <span className="text-xs text-ink-4">Last {rows.length}</span>}
      </div>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ScanLine} className="py-8" title="No checks yet" text="Your results will appear here, so you can see how things change over time." />
      ) : (
        <ul className="divide-y divide-line/70">
          <AnimatePresence initial={false}>
            {rows.map((s, i) => {
              const t = taskOf(s.task)
              const f = s.extracted_features || {}
              const bits = [
                f.gait_symmetry != null && `Symmetry ${Math.round(f.gait_symmetry * 100)}%`,
                f.cadence ? `${num(f.cadence)} steps/min` : null,
                f.tremor_frequency ? `Tremor ${num(f.tremor_frequency, 1)} Hz` : null,
              ].filter(Boolean)
              return (
                <motion.li key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 py-3">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', TONE_SOFT[t.tone])}><t.icon className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
                      {t.label}
                      <span className="text-xs font-normal text-ink-4" title={fmtDate(s.created_at, 'd MMM yyyy, HH:mm')}>{fmtRelative(s.created_at)}</span>
                    </p>
                    <p className="truncate text-xs text-ink-3">{bits.length ? bits.join(' · ') : `${s.frame_count || 0} frames · ${num(s.video_duration, 1)} s`}</p>
                  </div>
                  <RiskBadge level={normLevel(f.risk_level)} short />
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
