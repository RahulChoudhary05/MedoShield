import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Briefcase, Clock4, IdCard, Mail, Star } from 'lucide-react'
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
      <PageHeader eyebrow="Account" title="Profile &" accent="settings" subtitle="Keep your practice details current and your account secure." />

      <Stagger className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <StaggerItem>
          {q.isError && !p.id ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <Card className="overflow-hidden">
              <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-50 to-transparent" />
              <div className="relative pt-8 text-center">
                <Avatar name={p.full_name || `${p.first_name || ''} ${p.last_name || ''}`} size={84} className="mx-auto shadow-lift ring-4 ring-paper" />
                <h2 className="mt-3 text-xl font-semibold">{p.full_name || 'Doctor'}</h2>
                <p className="text-sm text-ink-3">{p.specialty || 'Specialty not set'}</p>
                <div className="mt-3 flex justify-center">
                  {p.license_verified
                    ? <Badge tone="teal"><BadgeCheck className="h-3.5 w-3.5" /> Licence verified</Badge>
                    : <Badge tone="teal" dot>Verification pending</Badge>}
                </div>
              </div>
              <dl className="mt-6 space-y-3 border-t border-line/70 pt-5 text-sm">
                {q.isLoading && !p.id ? (
                  [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)
                ) : (
                  [
                    { icon: Mail, label: 'Email', value: p.email },
                    { icon: IdCard, label: 'Licence no.', value: p.license_number },
                    { icon: Briefcase, label: 'Fee', value: p.appointment_fee != null ? inr(p.appointment_fee) : null },
                    { icon: Clock4, label: 'Experience', value: p.experience_years != null ? `${p.experience_years} years` : null },
                    { icon: Star, label: 'Rating', value: p.rating ? `${Number(p.rating).toFixed(1)} / 5` : null },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-ink-3"><r.icon className="h-4 w-4 text-ink-4" /> {r.label}</dt>
                      <dd className="min-w-0 truncate text-right font-medium text-ink">{r.value || '—'}</dd>
                    </div>
                  ))
                )}
              </dl>
              {p.created_at && <p className="mt-5 text-center text-xs text-ink-4">Member since {fmtDate(p.created_at, 'MMMM yyyy')}</p>}
              <p className="mt-2 text-center text-xs text-ink-4">Name, specialty and licence are managed by MedoShield verification.</p>
            </Card>
          )}
        </StaggerItem>

        <div className="space-y-5">
          <StaggerItem>{p.id ? <ProfileForm profile={p} /> : <Skeleton className="h-96 rounded-3xl" />}</StaggerItem>
          <StaggerItem>
            <div className="grid gap-5 xl:grid-cols-2">
              <ChangePassword />
              <Sessions />
            </div>
          </StaggerItem>
        </div>
      </Stagger>
    </div>
  )
}
