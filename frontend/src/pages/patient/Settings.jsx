import { useQuery } from '@tanstack/react-query'
import { Bell, HeartHandshake, Lock, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { Avatar, PageHeader } from '../../components/ui/Data'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import { EmergencyForm, HealthForm, ProfileForm } from '../../features/care/settings/ProfileForms'
import Security from '../../features/care/settings/Security'
import Privacy, { NotificationsCard } from '../../features/care/settings/Privacy'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'health', label: 'Health', icon: Stethoscope },
  { id: 'emergency', label: 'Emergency', icon: HeartHandshake },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
]

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Settings() {
  const user = useAuth((s) => s.user)
  const me = useQuery({ queryKey: ['patient', 'me'], queryFn: api.patient.me })
  const data = me.data || null

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings &" accent="privacy" subtitle="Keep your details current so your care team — and Medo — can look after you well." />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card mb-4 hidden items-center gap-3 p-4 lg:flex">
            <Avatar name={user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.full_name || user?.first_name || 'You'}</p>
              <p className="truncate text-xs text-ink-4">Member since {fmtDate(user?.created_at, 'MMM yyyy')}</p>
            </div>
          </div>
          <nav aria-label="Settings sections" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0 lg:flex-col lg:gap-0.5">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)} className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink-2 transition hover:bg-cream lg:rounded-2xl lg:border-transparent lg:bg-transparent lg:hover:bg-paper lg:hover:shadow-soft">
                <s.icon className="h-4 w-4 text-ink-4" /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {me.isError ? (
            <ErrorState error={me.error} onRetry={me.refetch} />
          ) : me.isLoading || !data ? (
            <div className="space-y-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
          ) : (
            <Stagger className="space-y-6">
              <StaggerItem><ProfileForm me={data} /></StaggerItem>
              <StaggerItem><HealthForm me={data} /></StaggerItem>
              <StaggerItem><EmergencyForm me={data} /></StaggerItem>
              <StaggerItem><Security /></StaggerItem>
              <StaggerItem><NotificationsCard /></StaggerItem>
              <StaggerItem><Privacy /></StaggerItem>
            </Stagger>
          )}
        </div>
      </div>
    </div>
  )
}
