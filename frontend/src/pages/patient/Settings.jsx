import { useQuery } from '@tanstack/react-query'
import { Bell, HeartHandshake, Lock, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { Avatar } from '../../components/ui/Data'
import { PageHeader, Stagger, StaggerItem } from '../../components/ui/motion'
import { EmergencyForm, HealthForm, ProfileForm } from '../../features/care/settings/ProfileForms'
import Security from '../../features/care/settings/Security'
import Privacy, { NotificationsCard } from '../../features/care/settings/Privacy'
import { InlineError } from '../../features/care/kit'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'health', label: 'Health', icon: Stethoscope },
  { id: 'emergency', label: 'Emergency', icon: HeartHandshake },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
]

function jump(id) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el?.focus?.({ preventScroll: true })
}

export default function Settings() {
  const user = useAuth((s) => s.user)
  const me = useQuery({ queryKey: ['patient', 'me'], queryFn: api.patient.me })
  const data = me.data || null

  return (
    <div>
      <PageHeader
       
        title="Settings and"
        accent="privacy"
        description="Keep your details current so your care team — and Medo — can look after you well."
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden items-center gap-3 border-b border-line pb-4 lg:flex">
            <Avatar name={user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`} size={40} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{user?.full_name || user?.first_name || 'You'}</p>
              <p className="truncate font-mono text-[0.8125rem] text-ink-3">Member since {fmtDate(user?.created_at, 'MMM yyyy')}</p>
            </div>
          </div>
          <nav aria-label="Settings sections" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0 lg:flex-col lg:gap-0.5">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)} className="inline-flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-lg border border-line bg-paper px-3.5 text-[0.9375rem] text-ink-2 transition-colors duration-150 hover:bg-cream lg:border-transparent lg:bg-transparent lg:hover:bg-ink/[.04]">
                <s.icon className="h-4 w-4 text-ink-3" strokeWidth={1.8} aria-hidden /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {me.isError ? (
            <InlineError error={me.error} onRetry={me.refetch} />
          ) : me.isLoading || !data ? (
            <div className="space-y-5" aria-busy="true" aria-label="Loading settings">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-72 rounded-3xl" />)}</div>
          ) : (
            <Stagger className="space-y-5">
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
