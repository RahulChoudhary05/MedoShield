import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { History, Layers, ScanLine } from 'lucide-react'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import { api } from '../../lib/api'
import { fmtDate, fmtDay } from '../../lib/utils'
import { TYPES, TimelineItem } from '../../features/monitoring/timeline'

function TimelineSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your timeline">
      {[0, 1].map((g) => (
        <div key={g}>
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <Skeleton className="h-24 flex-1 rounded-3xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Timeline() {
  const [filter, setFilter] = useState('all')
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['timeline'], queryFn: () => api.timeline() })
  const items = useMemo(() => data?.items || [], [data])
  const counts = data?.counts || {}

  const options = [
    { value: 'all', label: 'All', icon: Layers, count: items.length },
    ...Object.entries(TYPES).filter(([k]) => counts[k]).map(([k, t]) => ({ value: k, label: t.short, icon: t.icon, count: counts[k] })),
  ]

  const groups = useMemo(() => {
    const shown = filter === 'all' ? items : items.filter((i) => i.type === filter)
    const out = []
    for (const it of shown) {
      const key = fmtDate(it.created_at, 'yyyy-MM-dd')
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(it)
      else out.push({ key, label: fmtDay(it.created_at), sub: fmtDate(it.created_at, 'yyyy'), items: [it] })
    }
    return out
  }, [items, filter])

  const thisYear = String(new Date().getFullYear())
  let index = 0

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Timeline" title="Your health," accent="in one place"
        subtitle="Every check, review, report and visit — in order, so patterns are easier to spot and share." />

      {isLoading ? (
        <TimelineSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState icon={History} title="Your story starts here" text="Movement checks, lab reports, video reviews and appointments will appear on this timeline as you go."
            action={<Button to="/app/check" variant="brand" icon={ScanLine}>Do a movement check</Button>} />
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-10 -mx-4 bg-canvas/85 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:px-0">
            <Segmented value={filter} onChange={setFilter} options={options} size="sm" />
          </div>

          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="mb-4 flex items-baseline gap-2 pl-12 text-sm font-semibold uppercase tracking-[.14em] text-ink-3 sm:pl-14">
                  {g.label}
                  {g.sub !== thisYear && <span className="font-normal normal-case tracking-normal text-ink-4">{g.sub}</span>}
                </h2>
                <div className="relative">
                  <motion.span aria-hidden className="absolute bottom-0 left-[1.1rem] top-0 w-0.5 origin-top rounded-full bg-gradient-to-b from-teal-200 via-line to-line sm:left-[1.2rem]"
                    initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }} />
                  <ol className="relative space-y-4">
                    {g.items.map((it) => <TimelineItem key={`${it.type}-${it.id}`} item={it} index={index++} />)}
                  </ol>
                </div>
              </section>
            ))}
            {groups.length === 0 && <EmptyState icon={History} title="Nothing here yet" text="No entries of this type so far." />}
          </div>
        </>
      )}
    </div>
  )
}
