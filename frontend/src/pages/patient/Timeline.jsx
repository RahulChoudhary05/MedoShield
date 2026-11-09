import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Layers, ScanLine } from 'lucide-react'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/motion'
import Segmented from '../../components/ui/Segmented'
import { api } from '../../lib/api'
import { fmtDate, fmtDay } from '../../lib/utils'
import { TYPES, TimelineItem } from '../../features/monitoring/timeline'
import { Empty, InlineError } from '../../features/care/kit'

function TimelineSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your timeline">
      {[0, 1].map((g) => (
        <div key={g} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <div className="skeleton h-5 w-24" />
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>
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
    <div>
      <PageHeader
       
        title="Your health,"
        accent="in one place"
        description="Every check, review, report and visit in order — so patterns are easier to spot and share."
      />

      {isLoading ? (
        <TimelineSkeleton />
      ) : isError ? (
        <InlineError error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="card p-5 sm:p-6">
          <Empty icon={History} text="Checks, lab reports, video reviews and appointments appear here as you go."
            action={<Button to="/app/check" variant="brand" icon={ScanLine}>Do a movement check</Button>} />
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-line bg-canvas/95 px-4 py-2 sm:mx-0 sm:px-0">
            <Segmented value={filter} onChange={setFilter} options={options} />
          </div>

          <div className="space-y-10">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`tl-${g.key}`} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
                <h2 id={`tl-${g.key}`} className="font-mono text-[0.8125rem] font-medium text-ink-2 sm:sticky sm:top-32 sm:self-start sm:pt-4">
                  {g.label}
                  {g.sub !== thisYear && <span className="ml-1.5 text-ink-3">{g.sub}</span>}
                </h2>
                <ol className="relative space-y-3 border-l border-line pl-5 sm:pl-6">
                  {g.items.map((it) => <TimelineItem key={`${it.type}-${it.id}`} item={it} index={index++} />)}
                </ol>
              </section>
            ))}
            {groups.length === 0 && <Empty icon={History} text="No entries of this type so far." action={<Button variant="outline" icon={Layers} onClick={() => setFilter('all')}>Show all entries</Button>} />}
          </div>
        </>
      )}
    </div>
  )
}
