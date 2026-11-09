import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { isToday } from 'date-fns'
import {
  ArrowRight, BellRing, CalendarCheck2, CalendarDays, CalendarHeart, FileHeart, MessageSquare, Pill,
  ShieldAlert, Users, Video,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, fmtDate, fmtRelative, greeting, toDate } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { RiskBadge, RISK_HEX, riskKey } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { CountUp, PageHeader, Stagger, StaggerItem } from '../../components/ui/motion'
import AppointmentCard from '../../features/doctor/AppointmentCard'
import { DeclineDialog, Head, MEETING, MiniBar, levelOf, motorOf, patientMeta, useAppointmentDecision } from '../../features/doctor/shared'

const CATEGORY = {
  risk: ShieldAlert, video: Video, report: FileHeart, appointment: CalendarHeart, message: MessageSquare, chat: MessageSquare, medication: Pill,
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
  const todays = useMemo(
    () => appts
      .filter((a) => a.status === 'accepted' && toDate(a.preferred_date) && isToday(toDate(a.preferred_date)))
      .sort((a, b) => (a.preferred_time || '').localeCompare(b.preferred_time || '')),
    [appts],
  )
  const attention = useMemo(() => {
    const rank = { HIGH: 0, MEDIUM: 1 }
    return patients
      .filter((p) => levelOf(p.latest_risk) in rank)
      .sort((a, b) => rank[levelOf(a.latest_risk)] - rank[levelOf(b.latest_risk)] || new Date(b.latest_risk?.created_at || 0) - new Date(a.latest_risk?.created_at || 0))
  }, [patients])
  // Steady patients who are still waiting on a reply: second tier of the worklist.
  const replies = useMemo(() => {
    const ids = new Set(attention.map((p) => p.id))
    return patients.filter((p) => !ids.has(p.id) && p.unread_messages > 0).sort((a, b) => b.unread_messages - a.unread_messages)
  }, [patients, attention])
  const highCount = patients.filter((p) => levelOf(p.latest_risk) === 'HIGH').length
  const unread = patients.reduce((s, p) => s + (p.unread_messages || 0), 0)
  const loading = patientsQ.isLoading || apptsQ.isLoading
  const isNew = !loading && !patientsQ.isError && patients.length === 0 && pending.length === 0

  const lastName = user?.last_name || (user?.full_name || '').split(' ').slice(-1)[0] || ''
  const lede = loading ? 'Pulling together your clinic…'
    : attention.length ? `${attention.length} ${attention.length === 1 ? 'patient needs' : 'patients need'} a closer look today${pending.length ? `, and ${pending.length} new ${pending.length === 1 ? 'request is' : 'requests are'} waiting.` : '.'}`
      : pending.length ? `Your panel looks steady. ${pending.length} new ${pending.length === 1 ? 'request is' : 'requests are'} waiting for you.`
        : 'Your panel looks steady. Nothing urgent right now.'

  const counts = [
    { label: 'Patients on panel', value: patients.length },
    { label: 'Flagged high', value: highCount , signal: highCount > 0 },
    { label: 'Pending requests', value: pending.length },
    { label: 'Unread messages', value: unread },
  ]

  return (
    <div>
      <PageHeader
        kicker={fmtDate(new Date(), 'EEEE, d MMMM')}
        title={`${greeting()},`}
        accent={lastName ? `Dr. ${lastName}` : 'Doctor'}
        description={lede}
        actions={
          <>
            <Button variant="primary" icon={Users} to="/doctor/patients">Open patient list</Button>
            <Button variant="outline" icon={CalendarDays} to="/doctor/appointments">Review requests</Button>
          </>
        }
      />

      {/* Clinic counts: one hairline strip, not four boxes */}
      <section aria-label="Clinic at a glance" className="card mb-8 overflow-hidden">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {counts.map((c, i) => (
            <div key={c.label} className={cn('relative border-line px-5 py-5 sm:px-6', ['border-b border-r lg:border-b-0', 'border-b lg:border-b-0 lg:border-r', 'border-r', ''][i])}>
              <dt className="kicker flex items-center gap-2">
                {c.signal && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-risk-high" />}
                {c.label}
              </dt>
              <dd className="mt-2 text-[2.25rem] leading-none text-ink">
                {loading ? <Skeleton className="h-9 w-14" /> : <CountUp value={c.value} />}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {patientsQ.isError ? (
        <ErrorState error={patientsQ.error} onRetry={() => patientsQ.refetch()} />
      ) : isNew ? (
        <NewDoctorWelcome />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Worklist */}
          <Card pad={false} className="overflow-hidden">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <Head
                title="Worklist"
                subtitle="Flagged checks first, then patients waiting on a reply"
                action={<Button variant="ghost" size="sm" iconRight={ArrowRight} to="/doctor/patients" className="h-11">All patients</Button>}
                className="mb-3"
              />
            </div>
            {loading ? (
              <div className="space-y-3 px-5 pb-6 sm:px-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
            ) : attention.length === 0 && replies.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="Nothing needs you right now"
                text={patients.length ? 'No latest check is flagged medium or high, and every message has a reply.' : 'Patients appear here once you accept their requests.'}
                action={!patients.length && pending.length ? <Button variant="brand" to="/doctor/appointments">Review requests</Button> : null}
                className="pb-10 pt-6"
              />
            ) : (
              <>
                {attention.length > 0 && (
                  <WorkGroup label={`Flagged by latest check · ${attention.length}`}>
                    {attention.map((p) => <WorkRow key={p.id} p={p} />)}
                  </WorkGroup>
                )}
                {replies.length > 0 && (
                  <WorkGroup label={`Waiting on a reply · ${replies.length}`}>
                    {replies.map((p) => <WorkRow key={p.id} p={p} reply />)}
                  </WorkGroup>
                )}
              </>
            )}
          </Card>

          <div className="space-y-6">
            {/* Today */}
            <Card>
              <Head
                title="Today’s visits"
                subtitle={apptsQ.isLoading ? 'Loading…' : todays.length ? `${todays.length} accepted ${todays.length === 1 ? 'visit' : 'visits'}` : 'No visits booked for today'}
                action={<Button variant="ghost" size="sm" to="/doctor/appointments" className="h-11">Open schedule</Button>}
              />
              {apptsQ.isLoading ? (
                <Skeleton className="h-20" />
              ) : apptsQ.isError ? (
                <ErrorState error={apptsQ.error} onRetry={() => apptsQ.refetch()} className="py-6" />
              ) : todays.length === 0 ? (
                <p className="rounded-xl bg-cream/70 px-4 py-4 text-[0.9375rem] text-ink-3">Accepted visits for today will be listed here in time order.</p>
              ) : (
                <ol className="divide-y divide-line border-y border-line">
                  {todays.map((a) => {
                    const mode = MEETING[a.meeting_mode] || MEETING.video_call
                    return (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <span className="num w-14 shrink-0 font-mono text-[0.9375rem] text-ink">{a.preferred_time || '—'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] font-medium text-ink">{a.patient?.full_name || 'Patient'}</p>
                          <p className="flex items-center gap-1.5 text-[0.8125rem] text-ink-3"><mode.icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} /> {mode.label}</p>
                        </div>
                        {a.patient_id && (
                          <Button variant="ghost" size="icon" className="h-11 w-11" to={`/doctor/patients/${a.patient_id}`} aria-label={`Open chart for ${a.patient?.full_name || 'patient'}`}>
                            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </Card>

            {/* Requests */}
            <Card>
              <Head
                title="New requests"
                subtitle={pending.length ? `${pending.length} waiting for a decision` : 'You’re all caught up'}
                action={pending.length > 3 ? <Button variant="ghost" size="sm" to="/doctor/appointments" className="h-11">View all {pending.length}</Button> : null}
              />
              {apptsQ.isLoading ? (
                <Skeleton className="h-36" />
              ) : apptsQ.isError ? null : pending.length === 0 ? (
                <p className="rounded-xl bg-cream/70 px-4 py-4 text-[0.9375rem] text-ink-3">No requests waiting. Patients find you through the MedoShield directory.</p>
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

            {/* Activity */}
            <Card>
              <Head title="Recent activity" subtitle="Flags, uploads and requests" />
              {notifQ.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : (notifQ.data?.notifications || []).length === 0 ? (
                <p className="rounded-xl bg-cream/70 px-4 py-4 text-[0.9375rem] text-ink-3">Quiet so far. Risk flags, new videos and lab uploads will show up here.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {notifQ.data.notifications.slice(0, 6).map((n) => {
                    const Icon = CATEGORY[n.category] || BellRing
                    return (
                      <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', n.category === 'risk' ? 'text-apricot-500' : 'text-ink-3')} strokeWidth={1.8} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
                            <span className="truncate">{n.title}</span>
                            {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-apricot-500"><span className="sr-only">Unread</span></span>}
                          </p>
                          <p className="line-clamp-2 text-[0.875rem] text-ink-3">{n.message}</p>
                        </div>
                        <time className="shrink-0 font-mono text-[0.8125rem] text-ink-4" dateTime={n.created_at}>{fmtRelative(n.created_at)}</time>
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

function WorkGroup({ label, children }) {
  return (
    <section className="border-t border-line">
      <h3 className="kicker bg-cream/40 px-5 py-2.5 sm:px-6">{label}</h3>
      <ul className="divide-y divide-line border-t border-line">{children}</ul>
    </section>
  )
}

function WorkRow({ p, reply = false }) {
  const level = levelOf(p.latest_risk)
  const k = riskKey(level)
  return (
    <motion.li layout className="group relative flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors duration-150 hover:bg-cream/50 sm:flex-nowrap sm:px-6">
      {!reply && <span aria-hidden className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r" style={{ background: RISK_HEX[k] }} />}
      <Avatar name={p.full_name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-ink">{p.full_name}</p>
          {!reply && <RiskBadge level={level} pulse short />}
        </div>
        <p className="truncate text-[0.875rem] text-ink-3">
          {reply
            ? <>{p.unread_messages} unread {p.unread_messages === 1 ? 'message' : 'messages'} · {patientMeta(p) || 'details not shared'}</>
            : <>{patientMeta(p) || '—'} · last check {fmtRelative(p.latest_risk?.created_at)}{(p.conditions || []).length > 0 && <> · {p.conditions.slice(0, 2).join(', ')}</>}</>}
        </p>
      </div>
      <div className="flex w-full items-center justify-between gap-3 pl-14 sm:w-auto sm:justify-end sm:pl-0">
        {!reply && (
          <div className="text-right">
            <p className="kicker">Motor index</p>
            <MiniBar value={motorOf(p.latest_risk)} level={level} />
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            to={`/doctor/messages/${p.id}`}
            aria-label={`Message ${p.full_name}${p.unread_messages ? `, ${p.unread_messages} unread` : ''}`}
            className="relative h-11 w-11"
          >
            <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {p.unread_messages > 0 && (
              <span aria-hidden className="num absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-apricot-500 px-1 font-mono text-[0.8125rem] leading-none text-paper">{p.unread_messages}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" iconRight={ArrowRight} to={`/doctor/patients/${p.id}`} aria-label={`Open chart for ${p.full_name}`} className="h-11">Chart</Button>
        </div>
      </div>
    </motion.li>
  )
}

function NewDoctorWelcome() {
  const steps = [
    { title: 'Complete your profile', text: 'Add your clinic, fee and a short bio so patients know who they’re reaching.', to: '/doctor/settings', cta: 'Edit your profile' },
    { title: 'Accept a request', text: 'Patients find you in the directory and send a request. Accepting creates a secure care link.', to: '/doctor/appointments', cta: 'Open requests' },
    { title: 'Monitor between visits', text: 'Movement checks (tremor 4–12 Hz, gait, balance), lab reports and video reviews flow into one chart, triaged by risk.' },
  ]
  return (
    <Card className="px-6 py-10 sm:px-10 sm:py-12">
      <div className="max-w-2xl">
        <p className="kicker">Your clinic is ready</p>
        <h2 className="mt-2 font-serif text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">
          Your first patients will <span className="text-teal-600">appear here</span>
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          MedoShield never lets a doctor add patients on their own. Patients choose you, and the care link starts the moment you accept their request.
        </p>
      </div>
      <Stagger className="mt-10 grid border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
        {steps.map((s, i) => (
          <StaggerItem key={s.title} className="border-b border-line py-6 sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <span className="num font-mono text-[0.875rem] text-ink-4">0{i + 1}</span>
            <h3 className="mt-2 text-[1.0625rem] font-medium">{s.title}</h3>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-3">{s.text}</p>
            {s.to && <Button variant="ghost" size="sm" className="-ml-3 mt-3 h-11" to={s.to} iconRight={ArrowRight}>{s.cta}</Button>}
          </StaggerItem>
        ))}
      </Stagger>
    </Card>
  )
}
