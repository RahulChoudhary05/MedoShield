import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { CalendarCheck2, CalendarHeart, CalendarX2, Inbox, Undo2 } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, toDate } from '../../lib/utils'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import AppointmentCard from '../../features/doctor/AppointmentCard'
import { DeclineDialog, MEETING, useAppointmentDecision } from '../../features/doctor/shared'

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
        eyebrow="Schedule"
        title="Appointment"
        accent="requests"
        subtitle="Accepting a request creates a secure care link — the patient’s monitoring data becomes visible to you and you can message each other."
      />

      {q.isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-28 rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <WeekStrip appts={all.filter((a) => a.status === 'accepted')} />

          <div className="mb-5">
            <Segmented value={status} onChange={setStatus} size="sm" options={STATUSES.map((s) => ({ value: s.value, label: s.label, icon: s.icon, count: counts[s.value] || 0 }))} />
          </div>

          {list.length === 0 ? (
            <Card><EmptyState icon={meta.icon} title={meta.empty.title} text={meta.empty.text} /></Card>
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
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl icon-tile icon-teal"><CalendarHeart className="h-5 w-5" /></span>
          <div>
            <h3 className="text-[1.05rem] font-semibold">Next 7 days</h3>
            <p className="text-sm text-ink-3">{total ? `${total} accepted ${total === 1 ? 'visit' : 'visits'}` : 'No accepted visits this week'}</p>
          </div>
        </div>
      </div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {days.map((d, i) => {
          const list = byDay[i]
          const isToday = i === 0
          return (
            <div
              key={d.toISOString()}
              className={cn('min-w-[7.5rem] flex-1 snap-start rounded-2xl border p-3 transition', isToday ? 'border-teal-200 bg-teal-50' : 'border-line/70 bg-cream', list.length && !isToday && 'bg-paper shadow-soft')}
            >
              <p className={cn('text-[0.7rem] font-semibold uppercase tracking-[.12em]', isToday ? 'text-teal-700' : 'text-ink-4')}>{isToday ? 'Today' : format(d, 'EEE')}</p>
              <p className={cn('num text-xl font-semibold', isToday ? 'text-teal-800' : 'text-ink')}>{format(d, 'd')}</p>
              <ul className="mt-2 space-y-1">
                {list.length === 0 && <li className={cn('text-[0.7rem]', 'text-ink-4')}>Free</li>}
                {list.slice(0, 3).map((a) => {
                  const Icon = (MEETING[a.meeting_mode] || MEETING.video_call).icon
                  return (
                    <li key={a.id} className="flex items-center gap-1.5 truncate rounded-lg bg-paper px-1.5 py-1 text-[0.7rem] text-ink-2 ring-1 ring-line/70" title={`${a.preferred_time} · ${a.patient?.full_name || ''}`}>
                      <Icon className="h-3 w-3 shrink-0 text-teal-600" />
                      <span className="num font-semibold">{a.preferred_time}</span>
                      <span className="truncate">{a.patient?.full_name?.split(' ')[0]}</span>
                    </li>
                  )
                })}
                {list.length > 3 && <li className="text-[0.7rem] text-ink-4">+{list.length - 3} more</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
