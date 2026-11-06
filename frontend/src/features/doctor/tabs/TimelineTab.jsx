import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarHeart, CheckCircle2, FileHeart, History, ScanLine, Sparkles, Video } from 'lucide-react'
import { api } from '../../../lib/api'
import { LAB_RISK, cn, fmtDate, fmtDay, riskOf } from '../../../lib/utils'
import { Card } from '../../../components/ui/Card'
import { Badge, RiskBadge } from '../../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'

const TYPES = {
  movement_check: { label: 'Movement', icon: ScanLine, cls: 'icon-tile icon-teal' },
  video_review: { label: 'Video', icon: Video, cls: 'icon-tile icon-teal' },
  lab_report: { label: 'Labs', icon: FileHeart, cls: 'icon-tile icon-teal' },
  clinician_summary: { label: 'AI summary', icon: Sparkles, cls: 'icon-tile icon-teal' },
  appointment: { label: 'Appointments', icon: CalendarHeart, cls: 'icon-tile icon-teal' },
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
  if (!items.length) return <Card><EmptyState icon={History} title="Nothing on the timeline yet" text="Checks, video reviews, lab reports, AI summaries and appointments will build up here chronologically." /></Card>

  return (
    <Card>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter timeline">
        {[['all', 'Everything', items.length], ...Object.entries(TYPES).filter(([k]) => counts[k]).map(([k, t]) => [k, t.label, counts[k]])].map(([k, l, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={type === k}
            onClick={() => setType(k)}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition', type === k ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink-3 hover:border-ink-4 hover:text-ink')}
          >
            {l} <span className={cn('rounded-full px-1.5 text-[0.65rem]', type === k ? 'bg-white/20' : 'bg-ink/[.06]')}>{n}</span>
          </button>
        ))}
      </div>

      <div className="space-y-7">
        {groups.map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h3 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">
              {g.label}<span className="h-px flex-1 bg-line" />
            </h3>
            <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[1.2rem] before:top-3 before:w-px before:bg-line">
              {g.items.map((i, idx) => {
                const t = TYPES[i.type] || { icon: History, cls: 'bg-cream text-ink-3', label: i.type }
                return (
                  <motion.li
                    key={`${i.type}-${i.id}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.03, duration: 0.35 }}
                    className="relative flex gap-3 rounded-2xl py-2 pr-2 transition hover:bg-cream/70"
                  >
                    <span className={cn('relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-4 ring-paper', t.cls)}><t.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold capitalize text-ink">{i.title}</p>
                        <LevelBadge item={i} />
                        {i.type === 'video_review' && (i.reviewed ? <Badge tone="teal"><CheckCircle2 className="h-3 w-3" />Reviewed</Badge> : <Badge tone="teal" dot>Needs review</Badge>)}
                        <time dateTime={i.created_at} className="ml-auto text-xs text-ink-4">{fmtDate(i.created_at, 'HH:mm')}</time>
                      </div>
                      {i.summary && <p className="mt-0.5 line-clamp-2 text-sm text-ink-3 text-pretty">{i.summary}</p>}
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
  if (item.type === 'lab_report') {
    const r = LAB_RISK[item.level] || riskOf()
    return <span className={cn('badge ring-1 ring-inset', r.bg, r.text, r.ring)}>{item.level}</span>
  }
  return null
}
