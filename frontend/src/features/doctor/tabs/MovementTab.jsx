import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Hand, Info, PersonStanding, ScanLine, Footprints } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, fmtDate, fmtRelative, num } from '../../../lib/utils'
import { Card } from '../../../components/ui/Card'
import { RiskBadge } from '../../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { MiniBar, TableScroll, Th } from '../shared'

const TASK = { walk: { label: 'Walk', icon: Footprints }, stand: { label: 'Stand', icon: PersonStanding }, hands: { label: 'Hands', icon: Hand } }

const FEATURES = [
  ['stride_length', 'Stride length', (v) => `${num(v, 2)} BL`],
  ['bradykinesia_score', 'Bradykinesia', (v) => num(v, 2)],
  ['tremor_amplitude', 'Tremor amplitude', (v) => num(v, 4)],
  ['tremor_side', 'Tremor side', (v) => v],
  ['step_time_cv', 'Step-time CV', (v) => num(v, 3)],
  ['arm_swing_asymmetry', 'Arm-swing asymmetry', (v) => num(v, 2)],
  ['postural_sway', 'Postural sway', (v) => num(v, 3)],
  ['movement_speed', 'Movement speed', (v) => `${num(v, 2)} BL/s`],
  ['mode', 'Mode', (v) => v],
  ['deviation_from_baseline', 'Baseline deviation', (v) => num(v, 2)],
  ['risk_score', 'Risk score', (v) => `${num(v)}/100`],
]

const pctOr = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

export default function MovementTab({ patientId }) {
  const sessionsQ = useQuery({ queryKey: ['doctor', 'sessions', patientId], queryFn: () => api.analysis.sessions(patientId, 60) })
  const summaryQ = useQuery({ queryKey: ['doctor', 'analysis-summary', patientId], queryFn: () => api.analysis.summary(patientId, 365) })
  const [openId, setOpenId] = useState(null)

  const motorBySession = useMemo(() => {
    const m = {}
    ;(summaryQ.data?.trend || []).forEach((t) => { m[t.session_id] = t.motor_index })
    return m
  }, [summaryQ.data])
  const sessions = sessionsQ.data?.sessions ?? []

  const stats = useMemo(() => {
    const month = Date.now() - 30 * 864e5
    const mis = sessions.map((s) => motorBySession[s.id]).filter((v) => v != null)
    return {
      total: sessions.length,
      recent: sessions.filter((s) => new Date(s.created_at).getTime() >= month).length,
      avg: mis.length ? mis.reduce((a, b) => a + b, 0) / mis.length : null,
      high: sessions.filter((s) => s.extracted_features?.risk_level === 'HIGH').length,
    }
  }, [sessions, motorBySession])

  if (sessionsQ.isLoading) return <Card><div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card>
  if (sessionsQ.isError) return <ErrorState error={sessionsQ.error} onRetry={() => sessionsQ.refetch()} />
  if (!sessions.length) return <Card><EmptyState icon={ScanLine} title="No movement checks yet" text="When the patient records an on-device movement check, each session appears here with its biomarkers." /></Card>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Total checks', stats.total],
          ['Last 30 days', stats.recent],
          ['Avg motor index', stats.avg == null ? '—' : Math.round(stats.avg)],
          ['High-risk checks', stats.high],
        ].map(([l, v]) => (
          <div key={l} className="card px-4 py-3.5">
            <p className="text-xs text-ink-3">{l}</p>
            <p className="num mt-1 text-2xl font-semibold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <Card>
        <TableScroll>
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-line/70">
              <tr>
                <Th className="pl-0">Date</Th><Th>Task</Th><Th>Risk</Th><Th>Motor</Th><Th>Tremor idx</Th><Th>Tremor Hz</Th>
                <Th>Cadence</Th><Th>Symmetry</Th><Th>Quality</Th><Th className="pr-0"><span className="sr-only">Details</span></Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const f = s.extracted_features || {}
                const q = s.quality || {}
                const task = TASK[s.task] || TASK.walk
                const open = openId === s.id
                return (
                  <Fragment key={s.id}>
                    <tr
                      className={cn('cursor-pointer border-b border-line/50 transition-colors hover:bg-cream/80', open && 'bg-cream/80')}
                      onClick={() => setOpenId(open ? null : s.id)}
                    >
                      <td className="whitespace-nowrap py-3 pl-0 pr-3">
                        <p className="font-medium text-ink">{fmtDate(s.created_at, 'd MMM yyyy')}</p>
                        <p className="text-xs text-ink-4">{fmtDate(s.created_at, 'HH:mm')} · {fmtRelative(s.created_at)}</p>
                      </td>
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-ink-2"><task.icon className="h-3.5 w-3.5 text-ink-4" />{task.label}</span></td>
                      <td className="px-3 py-3"><RiskBadge level={f.risk_level} short /></td>
                      <td className="px-3 py-3"><MiniBar value={motorBySession[s.id]} level={f.risk_level} /></td>
                      <td className="num px-3 py-3 text-ink-2">{pctOr(f.tremor_index)}</td>
                      <td className="num px-3 py-3 text-ink-2">{f.tremor_frequency ? num(f.tremor_frequency, 1) : '—'}</td>
                      <td className="num px-3 py-3 text-ink-2">{f.cadence ? `${num(f.cadence)} spm` : '—'}</td>
                      <td className="num px-3 py-3 text-ink-2">{pctOr(f.gait_symmetry)}</td>
                      <td className="px-3 py-3"><QualityDot score={q.score} /></td>
                      <td className="py-3 pl-3 pr-0 text-right">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'Show'} details for check on ${fmtDate(s.created_at)}`}
                          onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : s.id) }}
                          className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-ink/5"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} />
                        </button>
                      </td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {open && (
                        <tr key="detail" className="border-b border-line/50 bg-cream/50">
                          <td colSpan={10} className="p-0">
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                              <SessionDetail f={f} q={q} s={s} />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  )
}

function QualityDot({ score }) {
  if (score == null) return <span className="text-ink-4">—</span>
  const v = Math.round(score * 100)
  const cls = v >= 70 ? 'bg-teal-500' : v >= 50 ? 'bg-teal-200' : 'bg-apricot-400'
  return <span className="inline-flex items-center gap-1.5 text-ink-2"><span className={cn('h-2 w-2 rounded-full', cls)} /><span className="num">{v}%</span></span>
}

function SessionDetail({ f, q, s }) {
  const features = FEATURES.filter(([k]) => f[k] != null && f[k] !== '')
  return (
    <div className="grid gap-5 px-1 py-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[.12em] text-ink-4">Extracted biomarkers</p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {features.map(([k, l, fmt]) => (
            <div key={k} className="rounded-xl border border-line/70 bg-paper px-3 py-2">
              <dt className="text-[0.7rem] text-ink-3">{l}</dt>
              <dd className="num text-sm font-semibold capitalize text-ink">{fmt(f[k])}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[.12em] text-ink-4">Recording quality</p>
        <div className="rounded-xl border border-line/70 bg-paper p-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-ink-2">
            <dt className="text-ink-3">Duration</dt><dd className="num text-right">{q.duration_s != null ? `${num(q.duration_s, 1)} s` : '—'}</dd>
            <dt className="text-ink-3">Frames · fps</dt><dd className="num text-right">{q.frames ?? s.frame_count ?? '—'} · {q.fps ? num(q.fps) : '—'}</dd>
            <dt className="text-ink-3">Visibility</dt><dd className="num text-right">{pctOr(q.visibility)}</dd>
            <dt className="text-ink-3">Gait detected</dt><dd className="text-right">{q.gait_detected ? 'Yes' : 'No'}</dd>
            <dt className="text-ink-3">Tremor reliable</dt><dd className="text-right">{q.tremor_reliable ? 'Yes' : 'No'}</dd>
          </dl>
          {(q.notes || []).length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-line/70 pt-3">
              {q.notes.map((n, i) => <li key={i} className="flex gap-2 text-xs text-ink-3"><Info className="mt-0.5 h-3 w-3 shrink-0 text-ink-4" />{n}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
