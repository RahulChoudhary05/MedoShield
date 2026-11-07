import { useQuery } from '@tanstack/react-query'
import { Bot, ScanLine } from 'lucide-react'
import Button from '../../components/ui/Button'
import { PageHeader, Stagger, StaggerItem } from '../../components/ui/motion'
import { api } from '../../lib/api'
import { fmtDate, greeting } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { InlineError } from '../../features/care/kit'
import {
  AppointmentsCard, CareTeamCard, DashboardSkeleton, FirstSteps, LatestCheck, LifestyleCard, MedsToday, QuickActions, TrendSection, statusSentence,
} from '../../features/monitoring/dashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['patient', 'dashboard'], queryFn: api.patient.dashboard })

  if (isLoading) return <DashboardSkeleton />

  const first = data?.patient?.first_name || user?.first_name || ''
  const header = (desc, fresh) => (
    <PageHeader
      kicker={fmtDate(new Date(), 'EEEE, d MMMM')}
      title={`${greeting()}${first ? ',' : ''}`}
      accent={first || undefined}
      description={desc}
      actions={
        <>
          <Button to="/app/check" variant="primary" icon={ScanLine}>{fresh ? 'Start my first check' : 'Start a check'}</Button>
          <Button to="/app/assistant" variant="outline" icon={Bot}>Ask Medo</Button>
        </>
      }
    />
  )

  if (isError) {
    return (
      <div>
        {header('Your overview couldn’t load. Your data is safe — try again in a moment.', false)}
        <InlineError error={error} onRetry={refetch} />
      </div>
    )
  }

  const stats = data?.stats || {}
  const fresh = !stats.movement_checks
  const trends = (data?.trends || []).filter((p) => p.motor_index != null)

  return (
    <div>
      {header(statusSentence({ risk: data.latest_risk, fresh, checks: stats.movement_checks || 0 }), fresh)}
      <Stagger className="space-y-5">
        <StaggerItem>{fresh ? <FirstSteps /> : <LatestCheck risk={data.latest_risk} stats={stats} />}</StaggerItem>

        {!fresh && <StaggerItem><TrendSection trends={trends} /></StaggerItem>}

        <StaggerItem>
          <div className="grid gap-5 lg:grid-cols-3">
            <MedsToday medications={data.medications} />
            <CareTeamCard team={data.care_team} />
            <AppointmentsCard appointments={data.upcoming_appointments} team={data.care_team} />
          </div>
        </StaggerItem>

        <StaggerItem>
          <h2 className="kicker mb-3 mt-2">Quick actions</h2>
          <QuickActions />
        </StaggerItem>

        <StaggerItem><LifestyleCard records={data.fitness_recent} /></StaggerItem>
      </Stagger>
    </div>
  )
}
