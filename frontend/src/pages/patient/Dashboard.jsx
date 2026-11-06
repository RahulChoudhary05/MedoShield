import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowUpRight, Bell, CalendarCheck2, LineChart, Pill, ScanLine } from 'lucide-react'
import Button from '../../components/ui/Button'
import { CardHeader } from '../../components/ui/Card'
import { Stat } from '../../components/ui/Data'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import MotorTrendChart, { ChartLegend } from '../../components/charts/MotorTrendChart'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import {
  AppointmentsCard, CareTeamCard, DashboardSkeleton, HeroBanner, LifestyleCard, MedsToday, QuickActions,
} from '../../features/monitoring/dashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['patient', 'dashboard'], queryFn: api.patient.dashboard })

  if (isLoading) return <DashboardSkeleton />
  if (isError) return <ErrorState error={error} onRetry={refetch} className="mt-10" />

  const first = data?.patient?.first_name || user?.first_name || ''
  const stats = data?.stats || {}
  const fresh = !stats.movement_checks
  const trends = (data?.trends || []).filter((p) => p.motor_index != null)

  return (
    <Stagger className="space-y-5">
      <StaggerItem>
        <HeroBanner first={first} risk={data.latest_risk} fresh={fresh} checks={stats.movement_checks || 0} />
      </StaggerItem>

      {!fresh && (
        <StaggerItem>
          <div className="card card-pad flex min-w-0 flex-col">
            <CardHeader icon={LineChart} title="Your 60-day trend" subtitle="Higher motor index means steadier movement"
              action={<Button to="/app/timeline" variant="ghost" size="sm" iconRight={ArrowUpRight}>Timeline</Button>} />
            {trends.length >= 2 ? (
              <>
                <MotorTrendChart points={trends} height={280} />
                <div className="mt-3"><ChartLegend /></div>
              </>
            ) : (
              <EmptyState icon={LineChart} className="py-8" title="Your trend appears after two checks"
                text="Try to check at a similar time of day — for example, an hour after your morning medicine."
                action={<Button to="/app/check" variant="soft" size="sm" icon={ScanLine}>Do another check</Button>} />
            )}
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat icon={Activity} tone="teal" label="Movement checks" value={stats.movement_checks ?? 0} hint="All time" />
          <Stat icon={CalendarCheck2} tone="teal" label="Adherence (14d)" value={stats.adherence_14d ?? null} decimals={0} suffix="%"
            hint={stats.adherence_14d == null ? 'Add medicines to track' : stats.adherence_14d >= 80 ? 'Lovely consistency' : 'Reminders can help'} />
          <Stat icon={Pill} tone="teal" label="Active medicines" value={stats.active_medications ?? 0} hint="In your plan" />
          <Stat icon={Bell} tone="teal" label="Unread updates" value={stats.unread_notifications ?? 0} hint={stats.unread_notifications ? 'Check the bell above' : 'All caught up'} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid gap-5 lg:grid-cols-3">
          <MedsToday medications={data.medications} />
          <CareTeamCard team={data.care_team} />
          <AppointmentsCard appointments={data.upcoming_appointments} team={data.care_team} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <h2 className="mb-3 mt-3 text-lg font-semibold">Quick actions</h2>
        <QuickActions />
      </StaggerItem>

      <StaggerItem><LifestyleCard records={data.fitness_recent} /></StaggerItem>
    </Stagger>
  )
}
