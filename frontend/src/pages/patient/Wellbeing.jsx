import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, HeartPulse, LineChart } from 'lucide-react'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/ui/Data'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import LogForm from '../../features/care/wellbeing/LogForm'
import Charts from '../../features/care/wellbeing/Charts'
import History from '../../features/care/wellbeing/History'
import CoachCard from '../../features/care/wellbeing/CoachCard'

export default function Wellbeing() {
  const [showAll, setShowAll] = useState(false)
  const q = useQuery({ queryKey: ['fitness', 'records', 'self'], queryFn: () => api.fitness.records() })
  const records = q.data?.records || []
  const shown = showAll ? records : records.slice(0, 7)

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="Daily"
        accent="wellbeing"
        subtitle="Sleep, stress and movement shape how your body feels. A quick daily check-in helps you — and your doctor — see the pattern."
      />

      {q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <Stagger className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <StaggerItem className="lg:sticky lg:top-24 lg:self-start">
            <LogForm records={records} />
          </StaggerItem>

          <div className="min-w-0 space-y-6">
            <StaggerItem>
              {q.isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}</div>
              ) : records.length === 0 ? (
                <Card><EmptyState icon={LineChart} tone="teal" title="Your trends start today" text="Log your first day on the left. After a few check-ins you’ll see how sleep, stress and walking move together." /></Card>
              ) : (
                <Charts records={records} />
              )}
            </StaggerItem>

            <StaggerItem>
              <CoachCard count={records.length} />
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader icon={CalendarDays} tone="teal" title="History" subtitle={records.length ? `${records.length} day${records.length === 1 ? '' : 's'} logged` : 'Nothing logged yet'} />
                {q.isLoading ? (
                  <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                ) : records.length === 0 ? (
                  <EmptyState icon={HeartPulse} title="No check-ins yet" text="Each day you log appears here so you can edit or remove it." className="py-8" />
                ) : (
                  <>
                    <History records={shown} />
                    {records.length > 7 && (
                      <button onClick={() => setShowAll((s) => !s)} className="mt-3 w-full rounded-2xl py-2.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50">
                        {showAll ? 'Show less' : `Show all ${records.length} days`}
                      </button>
                    )}
                  </>
                )}
              </Card>
            </StaggerItem>
          </div>
        </Stagger>
      )}
    </div>
  )
}
