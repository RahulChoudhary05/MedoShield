import { useQuery } from '@tanstack/react-query'
import { BadgeCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { fmtDate } from '../../lib/utils'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar, PageHeader } from '../../components/ui/Data'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import ProfileForm from '../../features/doctor/ProfileForm'
import { ChangePassword, Sessions } from '../../features/doctor/SecurityPanel'
import { inr } from '../../features/doctor/shared'

export default function Settings() {
  const user = useAuth((s) => s.user)
  const q = useQuery({ queryKey: ['doctor', 'profile'], queryFn: api.doctors.profile, placeholderData: user || undefined })
  const p = q.data || user || {}

  return (
    <div>
      <PageHeader title="Profile and" accent="settings" description="Keep your practice details current and your account secure." />

      <Stagger className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <StaggerItem>
          {q.isError && !p.id ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <Card as="section" aria-labelledby="doctor-identity">
              <div className="flex items-center gap-4">
                <Avatar name={p.full_name || `${p.first_name || ''} ${p.last_name || ''}`} size={64} />
                <div className="min-w-0">
                  <h2 id="doctor-identity" className="truncate font-serif text-[1.75rem] font-semibold leading-tight">{p.full_name || 'Doctor'}</h2>
                  <p className="truncate text-[0.9375rem] text-ink-3">{p.specialty || 'Specialty not set'}</p>
                </div>
              </div>
              <div className="mt-4">
                {p.license_verified
                  ? <Badge tone="teal"><BadgeCheck aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> Licence verified</Badge>
                  : <Badge tone="butter" dot>Verification pending</Badge>}
              </div>
              <dl className="mt-5 divide-y divide-line border-y border-line text-[0.9375rem]">
                {q.isLoading && !p.id ? (
                  [0, 1, 2, 3].map((i) => <div key={i} className="py-3"><Skeleton className="h-5" /></div>)
                ) : (
                  [
                    { label: 'Email', value: p.email },
                    { label: 'Licence no.', value: p.license_number, mono: true },
                    { label: 'Fee', value: p.appointment_fee != null ? inr(p.appointment_fee) : null, mono: true },
                    { label: 'Experience', value: p.experience_years != null ? `${p.experience_years} years` : null },
                    { label: 'Rating', value: p.rating ? `${Number(p.rating).toFixed(1)} / 5` : null, mono: true },
                  ].map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-3 py-3">
                      <dt className="kicker shrink-0">{r.label}</dt>
                      <dd className={r.mono ? 'num min-w-0 truncate text-right font-mono text-ink' : 'min-w-0 truncate text-right text-ink'}>{r.value || '—'}</dd>
                    </div>
                  ))
                )}
              </dl>
              {p.created_at && <p className="mt-4 text-[0.875rem] text-ink-3">Member since {fmtDate(p.created_at, 'MMMM yyyy')}</p>}
              <p className="mt-1 text-[0.875rem] text-ink-3">Name, specialty and licence are managed by MedoShield verification.</p>
            </Card>
          )}
        </StaggerItem>

        <div className="space-y-6">
          <StaggerItem>{p.id ? <ProfileForm profile={p} /> : <Skeleton className="h-96 rounded-3xl" />}</StaggerItem>
          <StaggerItem>
            <div className="grid gap-6 xl:grid-cols-2">
              <ChangePassword />
              <Sessions />
            </div>
          </StaggerItem>
        </div>
      </Stagger>
    </div>
  )
}
