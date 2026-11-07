import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { CalendarCheck2, CalendarX2, Inbox, Undo2 } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, toDate } from '../../lib/utils'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import AppointmentCard from '../../features/doctor/AppointmentCard'
import { DeclineDialog, Head, MEETING, useAppointmentDecision } from '../../features/doctor/shared'

const STATUSES = [
  { value: 'pending', label: 'Pending', icon: Inbox, empty: { title: 'No pending requests', text: 'New requests from patients who find you in the directory will appear here.' } },
  { value: 'accepted', label: 'Accepted', icon: CalendarCheck2, empty: { title: 'No accepted visits', text: 'Accepted requests become active care links and show up here.' } },
  { value: 'rejected', label: 'Declined', icon: CalendarX2, empty: { title: 'Nothing declined', text: 'Requests you decline are kept here for reference.' } },
  { value: 'cancelled', label: 'Cancelled', icon: Undo2, empty: { title: 'No cancellations', text: 'If a patient withdraws a request, it’s listed here.' } },
]

export default function Appointments() {
  const q = useQuery({ queryKey: ['doctor', 'appointments'], queryFn: () => api.doctors.appointments() })
  const decision = useAppointmentDecision()
  const [status, setStatus] = useState('pending')
  const [declining, setDeclining] = useState(null)

  const all = useMemo(() => q.data?.appointments ?? [], [q.data])
  const counts = useMemo(() => all.reduce((c, a) => ({ ...c, [a.status]: (c[a.status] || 0) + 1 }), {}), [all])
  const list = useMemo(() => {
    const rows = all.filter((a) => a.status === status)
    // Pending & accepted read best by visit date; history by most recent first.
    if (status === 'pending' || status === 'accepted') return [...rows].sort((a, b) => `${a.preferred_date} ${a.preferred_time}`.localeCompare(`${b.preferred_date} ${b.preferred_time}`))
    return rows
  }, [all, status])
  const meta = STATUSES.find((s) => s.value === status)

  return (
    <div>
      <PageHeader
        kicker="Schedule"
        title="Appointment"
        accent="requests"
        description="Accepting a request creates a secure care link — the patient’s monitoring data becomes visible to you and you can message each other."
      />

      {q.isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <WeekStrip appts={all.filter((a) => a.status === 'accepted')} />

          <h2 className="sr-only">Requests by status</h2>
          <div className="mb-5">
            <Segmented aria-label="Filter requests by status" value={status} onChange={setStatus} size="sm" options={STATUSES.map((s) => ({ value: s.value, label: s.label, icon: s.icon, count: counts[s.value] || 0 }))} />
          </div>

          {list.length === 0 ? (
            <Card><EmptyState icon={meta.icon} tone="ink" title={meta.empty.title} text={meta.empty.text} /></Card>
          ) : (
            <motion.div layout className="grid gap-4 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {list.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    busy={decision.isPending && decision.variables?.id === a.id}
                    onAccept={(x) => decision.mutate({ id: x.id, accept: true })}
                    onDecline={setDeclining}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
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

/** Seven-day strip of accepted visits starting today. */
function WeekStrip({ appts }) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const byDay = days.map((d) => appts.filter((a) => {
    const ad = toDate(a.preferred_date)
    return ad && isSameDay(ad, d)
  }).sort((a, b) => (a.preferred_time || '').localeCompare(b.preferred_time || '')))
  const total = byDay.reduce((s, l) => s + l.length, 0)

  return (
    <Card pad={false} className="mb-8 overflow-hidden">
      <div className="px-5 pt-5 sm:px-6">
        <Head title="Next 7 days" subtitle={total ? `${total} accepted ${total === 1 ? 'visit' : 'visits'}` : 'No accepted visits this week'} className="mb-4" />
      </div>
      <ol className="flex snap-x overflow-x-auto border-t border-line no-scrollbar">
        {days.map((d, i) => {
          const list = byDay[i]
          const isToday = i === 0
          return (
            <li
              key={d.toISOString()}
              aria-label={`${format(d, 'EEEE d MMMM')}: ${list.length ? `${list.length} ${list.length === 1 ? 'visit' : 'visits'}` : 'free'}`}
              className={cn('relative min-w-[8.5rem] flex-1 snap-start border-r border-line px-4 py-4 last:border-r-0', isToday && 'bg-teal-50/50')}
            >
              {isToday && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-teal-700" />}
              <p className={cn('font-mono text-[0.8125rem]', isToday ? 'text-teal-800' : 'text-ink-3')}>{isToday ? 'Today' : format(d, 'EEE')}</p>
              <p className="num font-serif text-[1.75rem] leading-tight text-ink">{format(d, 'd')}</p>
              <ul className="mt-2 space-y-1.5">
                {list.length === 0 && <li className="text-[0.8125rem] text-ink-4">Free</li>}
                {list.slice(0, 3).map((a) => {
                  const Icon = (MEETING[a.meeting_mode] || MEETING.video_call).icon
                  return (
                    <li key={a.id} className="flex items-center gap-1.5 truncate text-[0.8125rem] text-ink-2" title={`${a.preferred_time} · ${a.patient?.full_name || ''}`}>
                      <Icon aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                      <span className="num font-mono text-ink">{a.preferred_time}</span>
                      <span className="truncate">{a.patient?.full_name?.split(' ')[0]}</span>
                    </li>
                  )
                })}
                {list.length > 3 && <li className="font-mono text-[0.8125rem] text-ink-3">+{list.length - 3} more</li>}
              </ul>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
