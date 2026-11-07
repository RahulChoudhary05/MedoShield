import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarHeart, CheckCircle2, FileHeart, History, ScanLine, Sparkles, Video } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, fmtDate, fmtDay } from '../../../lib/utils'
import { Card } from '../../../components/ui/Card'
import { Badge, RiskBadge } from '../../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { LabRiskBadge } from '../shared'

const sentence = (t) => (t ? `${String(t)[0].toUpperCase()}${String(t).slice(1)}` : t)

const TYPES = {
  movement_check: { label: 'Movement', icon: ScanLine },
  video_review: { label: 'Video', icon: Video },
  lab_report: { label: 'Labs', icon: FileHeart },
  clinician_summary: { label: 'AI summary', icon: Sparkles },
  appointment: { label: 'Appointments', icon: CalendarHeart },
}

export default function TimelineTab({ patientId }) {
  const q = useQuery({ queryKey: ['doctor', 'timeline', patientId], queryFn: () => api.timeline(patientId) })
  const [type, setType] = useState('all')
  const items = useMemo(() => q.data?.items ?? [], [q.data])
  const counts = q.data?.counts || {}

  const groups = useMemo(() => {
    const out = []
    items
      .filter((i) => type === 'all' || i.type === type)
      .forEach((i) => {
        const key = fmtDate(i.created_at, 'yyyy-MM-dd')
        const last = out[out.length - 1]
        if (last?.key === key) last.items.push(i)
        else out.push({ key, label: fmtDay(i.created_at), items: [i] })
      })
    return out
  }, [items, type])

  if (q.isLoading) return <Card><div className="space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div></Card>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!items.length) return <Card><EmptyState icon={History} headingLevel={2} title="Nothing on the timeline yet" text="Checks, video reviews, lab reports, AI summaries and appointments will build up here in date order." /></Card>

  return (
    <Card>
      <h2 className="sr-only">Timeline</h2>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter timeline">
        {[['all', 'Everything', items.length], ...Object.entries(TYPES).filter(([k]) => counts[k]).map(([k, t]) => [k, t.label, counts[k]])].map(([k, l, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={type === k}
            onClick={() => setType(k)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-lg border px-3.5 text-[0.875rem] transition-colors duration-150',
              type === k ? 'border-ink-4 bg-paper font-medium text-ink shadow-soft' : 'border-line bg-cream/50 text-ink-3 hover:text-ink',
            )}
          >
            {l} <span className="num font-mono text-[0.8125rem] text-ink-4">{n}</span>
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h3 className="kicker mb-2 flex items-center gap-3">
              {g.label}<span aria-hidden className="h-px flex-1 bg-line" />
            </h3>
            <ol className="relative before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line">
              {g.items.map((i, idx) => {
                const t = TYPES[i.type] || { icon: History, label: i.type }
                return (
                  <motion.li
                    key={`${i.type}-${i.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.04, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                    className="relative flex gap-3 py-2.5"
                  >
                    <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper text-ink-2 ring-1 ring-inset ring-line">
                      <t.icon aria-hidden className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-ink">{sentence(i.title)}</p>
                        <LevelBadge item={i} />
                        {i.type === 'video_review' && (i.reviewed
                          ? <Badge tone="teal"><CheckCircle2 aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" />Reviewed</Badge>
                          : <Badge tone="apricot" dot>Needs review</Badge>)}
                        <time dateTime={i.created_at} className="ml-auto font-mono text-[0.8125rem] text-ink-3">{fmtDate(i.created_at, 'HH:mm')}</time>
                      </div>
                      {i.summary && <p className="mt-0.5 line-clamp-2 text-[0.9375rem] text-ink-3 text-pretty">{i.summary}</p>}
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </Card>
  )
}

function LevelBadge({ item }) {
  if (!item.level) return null
  if (item.type === 'movement_check') return <RiskBadge level={item.level} short />
  if (item.type === 'lab_report') return <LabRiskBadge risk={item.level} />
  return null
}
