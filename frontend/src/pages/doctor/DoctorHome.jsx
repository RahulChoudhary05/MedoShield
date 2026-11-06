import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowRight, BellRing, CalendarHeart, CalendarDays, FileHeart, HeartHandshake, Inbox, MessageSquare, Pill,
  ShieldAlert, Smile, Stethoscope, Users, Video,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, fmtDate, fmtRelative, greeting } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { RiskBadge } from '../../components/ui/Badge'
import { Avatar, Stat } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import AppointmentCard from '../../features/doctor/AppointmentCard'
import { DeclineDialog, MiniBar, levelOf, motorOf, patientMeta, useAppointmentDecision } from '../../features/doctor/shared'

const CATEGORY = {
  risk: { icon: ShieldAlert, cls: 'bg-apricot-50 text-apricot-600' },
  video: { icon: Video, cls: 'bg-teal-50 text-teal-700' },
  report: { icon: FileHeart, cls: 'bg-teal-50 text-teal-700' },
  appointment: { icon: CalendarHeart, cls: 'bg-teal-50 text-teal-700' },
  message: { icon: MessageSquare, cls: 'bg-teal-50 text-teal-700' },
  chat: { icon: MessageSquare, cls: 'bg-teal-50 text-teal-700' },
  medication: { icon: Pill, cls: 'bg-teal-50 text-teal-700' },
}

const RISK_ACCENT = { HIGH: 'bg-risk-high', MEDIUM: 'bg-risk-medium' }

function WelcomeBanner({ lastName, subtitle, highCount, loading }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="card card-tint-teal relative mb-6 overflow-hidden px-6 py-7 sm:px-9 sm:py-9"
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[.14em] text-ink-3"><CalendarDays className="h-3.5 w-3.5 text-teal-600" /> {fmtDate(new Date(), 'EEEE, d MMMM')}</p>
          <h1 className="text-[2.1rem] font-semibold leading-[1.04] tracking-tight sm:text-[2.9rem] text-balance">
            {greeting()}, <span className="serif-accent">{lastName ? `Dr. ${lastName}` : 'Doctor'}</span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.98rem] text-ink-2 text-pretty">{subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="md" icon={Users} to="/doctor/patients">My patients</Button>
            <Button variant="outline" size="md" icon={CalendarDays} to="/doctor/appointments">Appointments</Button>
          </div>
        </div>
        {!loading && highCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 24 }}
            className="flex shrink-0 items-center gap-3 rounded-3xl border border-line bg-paper p-4 shadow-soft"
          >
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-apricot-50 text-apricot-600">
              <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-risk-high" />
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="num text-2xl font-semibold leading-none text-ink">{highCount}</p>
              <p className="mt-1 text-xs font-medium text-ink-3">{highCount === 1 ? 'patient flagged high' : 'patients flagged high'}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}

export default function DoctorHome() {
  const user = useAuth((s) => s.user)
  const patientsQ = useQuery({ queryKey: ['doctor', 'patients'], queryFn: api.doctors.patients })
  const apptsQ = useQuery({ queryKey: ['doctor', 'appointments'], queryFn: () => api.doctors.appointments() })
  const notifQ = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list, refetchInterval: 30_000 })
  const decision = useAppointmentDecision()
  const [declining, setDeclining] = useState(null)

  const patients = useMemo(() => patientsQ.data?.patients ?? [], [patientsQ.data])
  const appts = useMemo(() => apptsQ.data?.appointments ?? [], [apptsQ.data])
  const pending = appts.filter((a) => a.status === 'pending')
  const attention = useMemo(() => {
    const rank = { HIGH: 0, MEDIUM: 1 }
    return patients
      .filter((p) => levelOf(p.latest_risk) in rank)
      .sort((a, b) => rank[levelOf(a.latest_risk)] - rank[levelOf(b.latest_risk)] || new Date(b.latest_risk?.created_at || 0) - new Date(a.latest_risk?.created_at || 0))
  }, [patients])
  const highCount = patients.filter((p) => levelOf(p.latest_risk) === 'HIGH').length
  const unread = patients.reduce((s, p) => s + (p.unread_messages || 0), 0)
  const loading = patientsQ.isLoading || apptsQ.isLoading
  const isNew = !loading && !patientsQ.isError && patients.length === 0 && pending.length === 0

  const lastName = user?.last_name || (user?.full_name || '').split(' ').slice(-1)[0] || ''

  return (
    <div>
      <WelcomeBanner
        lastName={lastName}
        subtitle={
          loading ? 'Pulling together your clinic…'
            : attention.length ? `${attention.length} ${attention.length === 1 ? 'patient needs' : 'patients need'} a closer look today${pending.length ? `, and ${pending.length} new ${pending.length === 1 ? 'request is' : 'requests are'} waiting.` : '.'}`
              : pending.length ? `Your panel looks steady. ${pending.length} new ${pending.length === 1 ? 'request is' : 'requests are'} waiting for you.`
                : 'Your panel looks steady. Nothing urgent right now.'
        }
        highCount={highCount}
        loading={loading}
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Patients', value: patients.length, tone: 'teal', hint: 'Active care links' },
          { icon: ShieldAlert, label: 'High risk', value: highCount, tone: highCount ? 'apricot' : 'teal', hint: 'Latest check flagged' },
          { icon: Inbox, label: 'Pending requests', value: pending.length, tone: 'teal', hint: 'Waiting for a decision' },
          { icon: MessageSquare, label: 'Unread messages', value: unread, tone: 'teal', hint: 'Across all patients' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            {loading ? <Skeleton className="h-[136px] rounded-3xl" /> : <Stat {...s} className="card-interactive" />}
          </StaggerItem>
        ))}
      </Stagger>

      {patientsQ.isError ? (
        <ErrorState error={patientsQ.error} onRetry={() => patientsQ.refetch()} />
      ) : isNew ? (
        <NewDoctorWelcome />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              icon={Activity}
              tone="teal"
              title="Needs attention"
              subtitle="High and medium risk, most urgent first"
              action={<Button variant="ghost" size="sm" iconRight={ArrowRight} to="/doctor/patients">All patients</Button>}
            />
            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}</div>
            ) : attention.length === 0 ? (
              <EmptyState
                icon={Smile}
                title="Everyone looks steady"
                text={patients.length ? 'No patient’s latest movement check is flagged medium or high. New flags appear here automatically.' : 'Patients appear here once you accept their requests.'}
                className="py-8"
              />
            ) : (
              <ul className="-mx-2 space-y-1">
                {attention.map((p) => <AttentionRow key={p.id} p={p} />)}
              </ul>
            )}
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader
                icon={Inbox}
                tone="apricot"
                title="New requests"
                subtitle={pending.length ? `${pending.length} waiting` : 'You’re all caught up'}
                action={pending.length > 3 ? <Button variant="ghost" size="sm" to="/doctor/appointments">View all</Button> : null}
              />
              {apptsQ.isLoading ? (
                <Skeleton className="h-36 rounded-2xl" />
              ) : apptsQ.isError ? (
                <ErrorState error={apptsQ.error} onRetry={() => apptsQ.refetch()} className="py-6" />
              ) : pending.length === 0 ? (
                <p className="rounded-2xl bg-cream px-4 py-5 text-center text-sm text-ink-3">No requests waiting. Patients find you through the MedoShield directory.</p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {pending.slice(0, 3).map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appt={a}
                        compact
                        busy={decision.isPending && decision.variables?.id === a.id}
                        onAccept={(x) => decision.mutate({ id: x.id, accept: true })}
                        onDecline={setDeclining}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader icon={BellRing} tone="teal" title="Recent activity" subtitle="Flags, uploads and requests" />
              {notifQ.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : (notifQ.data?.notifications || []).length === 0 ? (
                <p className="rounded-2xl bg-cream px-4 py-5 text-center text-sm text-ink-3">Quiet so far. Risk flags, new videos and lab uploads will show up here.</p>
              ) : (
                <ol className="space-y-1">
                  {notifQ.data.notifications.slice(0, 6).map((n) => {
                    const c = CATEGORY[n.category] || { icon: BellRing, cls: 'bg-cream text-ink-3' }
                    return (
                      <li key={n.id} className="flex gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-cream">
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', c.cls)}><c.icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium text-ink">
                            <span className="truncate">{n.title}</span>
                            {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-apricot-400" aria-label="Unread" />}
                          </p>
                          <p className="line-clamp-2 text-xs text-ink-3">{n.message}</p>
                        </div>
                        <time className="shrink-0 text-[0.7rem] text-ink-4" dateTime={n.created_at}>{fmtRelative(n.created_at)}</time>
                      </li>
                    )
                  })}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}

      <DeclineDialog
        appt={declining}
        onClose={() => setDeclining(null)}
        loading={decision.isPending}
        onConfirm={(note) => decision.mutate({ id: declining.id, accept: false, note }, { onSuccess: () => setDeclining(null) })}
      />
    </div>
  )
}

function AttentionRow({ p }) {
  const level = levelOf(p.latest_risk)
  return (
    <motion.li layout className="group relative flex flex-wrap items-center gap-3 rounded-2xl py-3.5 pl-4 pr-2 transition-colors hover:bg-cream/80 sm:flex-nowrap">
      <span aria-hidden className={cn('absolute bottom-3 left-0 top-3 w-1 rounded-full', RISK_ACCENT[level])} />
      <Avatar name={p.full_name} size={44} className="ring-2 ring-white shadow-soft" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-ink">{p.full_name}</p>
          <RiskBadge level={level} pulse short />
        </div>
        <p className="truncate text-xs text-ink-3">
          {patientMeta(p) || '—'} · last check {fmtRelative(p.latest_risk?.created_at)}
          {(p.conditions || []).length > 0 && <> · {p.conditions.slice(0, 2).join(', ')}</>}
        </p>
      </div>
      <div className="flex w-full items-center justify-between gap-3 pl-[3.5rem] sm:w-auto sm:justify-end sm:pl-0">
        <div className="text-right">
          <p className="text-[0.65rem] font-medium uppercase tracking-[.12em] text-ink-4">Motor</p>
          <MiniBar value={motorOf(p.latest_risk)} level={level} />
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            to={`/doctor/messages/${p.id}`}
            aria-label={`Message ${p.full_name}${p.unread_messages ? `, ${p.unread_messages} unread` : ''}`}
            className="relative"
          >
            <MessageSquare className="h-4 w-4" />
            {p.unread_messages > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-apricot-400 px-1 text-[0.6rem] font-bold text-white">{p.unread_messages}</span>
            )}
          </Button>
          <Button variant="soft" size="sm" iconRight={ArrowRight} to={`/doctor/patients/${p.id}`} aria-label={`Open chart for ${p.full_name}`} className="transition-transform group-hover:translate-x-0.5">Chart</Button>
        </div>
      </div>
    </motion.li>
  )
}

function NewDoctorWelcome() {
  const steps = [
    { icon: Stethoscope, title: 'Complete your profile', text: 'Add your clinic, fee and a short bio so patients know who they’re reaching.', to: '/doctor/settings', cta: 'Edit profile' },
    { icon: HeartHandshake, title: 'Accept a request', text: 'Patients discover you in the directory and send a request. Accepting creates a secure care link.' },
    { icon: Activity, title: 'Monitor between visits', text: 'Their movement checks, lab reports and video reviews flow into a single chart, triaged by risk.' },
  ]
  return (
    <Card className="card-tint-teal overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="eyebrow mb-5">Your clinic is ready</span>
        <h2 className="text-[1.9rem] font-semibold leading-tight sm:text-[2.4rem] text-balance">
          Your first patients will <span className="serif-accent">appear here</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[0.9375rem] text-ink-3 text-pretty">
          MedoShield never lets a doctor add patients on their own. Patients choose you, and the care link starts the moment you accept their request.
        </p>
        <div className="mt-9 grid gap-4 text-left sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              className="card-interactive rounded-3xl border border-white/80 bg-paper/90 p-5 shadow-soft backdrop-blur"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700"><s.icon className="h-[18px] w-[18px]" /></span>
                <span className="num text-xs font-semibold text-ink-4">0{i + 1}</span>
              </div>
              <h3 className="text-[0.98rem] font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-3 text-pretty">{s.text}</p>
              {s.to && <Button variant="soft" size="sm" className="mt-4" to={s.to} iconRight={ArrowRight}>{s.cta}</Button>}
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  )
}
