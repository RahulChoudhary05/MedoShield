import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HeartPulse, LineChart } from 'lucide-react'
import { api } from '../../lib/api'
import { PageHeader, Stagger, StaggerItem } from '../../components/ui/motion'
import LogForm from '../../features/care/wellbeing/LogForm'
import Charts from '../../features/care/wellbeing/Charts'
import History from '../../features/care/wellbeing/History'
import CoachCard from '../../features/care/wellbeing/CoachCard'
import { Empty, InlineError, Section, SkeletonRows } from '../../features/care/kit'

function focusLog() {
  const el = document.getElementById('wb-date') || document.querySelector('#daily-checkin input')
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el?.focus({ preventScroll: true })
}

export default function Wellbeing() {
  const [showAll, setShowAll] = useState(false)
  const q = useQuery({ queryKey: ['fitness', 'records', 'self'], queryFn: () => api.fitness.records() })
  const records = q.data?.records || []
  const shown = showAll ? records : records.slice(0, 7)

  return (
    <div>
      <PageHeader
        kicker="Wellbeing"
        title="Daily"
        accent="wellbeing"
        description="Sleep, stress and walking shape how movement feels. A one-minute daily check-in helps you — and your doctor — see the pattern."
      />

      {q.isError ? (
        <InlineError error={q.error} onRetry={q.refetch} />
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <StaggerItem className="lg:sticky lg:top-24 lg:self-start">
            <LogForm records={records} />
          </StaggerItem>

          <div className="min-w-0 space-y-5">
            <StaggerItem>
              {q.isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}</div>
              ) : records.length === 0 ? (
                <Section kicker="Trends" title="Sleep, stress and walking">
                  <Empty icon={LineChart} text="After a few check-ins you’ll see how sleep, stress and walking move together." action={<button type="button" onClick={focusLog} className="btn btn-md btn-outline">Log your first day</button>} />
                </Section>
              ) : (
                <Charts records={records} />
              )}
            </StaggerItem>

            <StaggerItem>
              <CoachCard count={records.length} />
            </StaggerItem>

            <StaggerItem>
              <Section kicker={records.length ? `${records.length} day${records.length === 1 ? '' : 's'} logged` : 'Nothing logged yet'} title="History">
                {q.isLoading ? (
                  <SkeletonRows rows={3} />
                ) : records.length === 0 ? (
                  <Empty icon={HeartPulse} text="Each day you log appears here so you can edit or remove it." action={<button type="button" onClick={focusLog} className="btn btn-md btn-outline">Log today</button>} />
                ) : (
                  <>
                    <History records={shown} />
                    {records.length > 7 && (
                      <button onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className="mt-3 min-h-[44px] w-full rounded-lg border-t border-line pt-1 text-[0.9375rem] font-medium text-teal-700 transition hover:bg-teal-50">
                        {showAll ? 'Show fewer days' : `Show all ${records.length} days`}
                      </button>
                    )}
                  </>
                )}
              </Section>
            </StaggerItem>
          </div>
        </Stagger>
      )}
    </div>
  )
}
