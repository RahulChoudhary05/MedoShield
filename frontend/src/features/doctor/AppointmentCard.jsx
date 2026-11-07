import { motion } from 'framer-motion'
import { CalendarDays, Check, Clock3, FileText, MessageSquare, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Data'
import { cn, fmtDate, fmtRelative } from '../../lib/utils'
import { MEETING, inr, patientMeta } from './shared'

const STATUS = {
  pending: { tone: 'apricot', label: 'Awaiting you' },
  accepted: { tone: 'teal', label: 'Accepted' },
  rejected: { tone: 'ink', label: 'Declined' },
  cancelled: { tone: 'ink', label: 'Cancelled by patient' },
  completed: { tone: 'teal', label: 'Completed' },
}

/**
 * One appointment request. `compact` is the dense variant used on the doctor home.
 * onAccept / onDecline receive the appointment.
 */
export default function AppointmentCard({ appt, compact = false, busy = false, onAccept, onDecline }) {
  const mode = MEETING[appt.meeting_mode] || MEETING.video_call
  const ModeIcon = mode.icon
  const name = appt.patient?.full_name || 'Former patient'
  const status = STATUS[appt.status] || STATUS.pending
  const pending = appt.status === 'pending'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(compact ? 'rounded-xl border border-line bg-cream/40 p-4' : 'card card-pad')}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} size={compact ? 40 : 44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[1rem] font-medium">{name}</h3>
            {!compact && <Badge tone={status.tone} dot>{status.label}</Badge>}
          </div>
          <p className="text-[0.8125rem] text-ink-3">{patientMeta(appt.patient) || 'Details unavailable'} · requested {fmtRelative(appt.created_at)}</p>
        </div>
        {!compact && appt.appointment_fee > 0 && <span className="num shrink-0 font-mono text-[0.9375rem] text-ink">{inr(appt.appointment_fee)}</span>}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.875rem] text-ink-2">
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">Date</dt>
          <CalendarDays aria-hidden strokeWidth={1.8} className="h-4 w-4 text-ink-3" />
          <dd>{fmtDate(appt.preferred_date, 'EEE, d MMM')}</dd>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">Time</dt>
          <Clock3 aria-hidden strokeWidth={1.8} className="h-4 w-4 text-ink-3" />
          <dd className="num font-mono">{appt.preferred_time || '—'}</dd>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">Meeting mode</dt>
          <ModeIcon aria-hidden strokeWidth={1.8} className="h-4 w-4 text-ink-3" />
          <dd>{mode.label}</dd>
        </div>
        {compact && appt.appointment_fee > 0 && (
          <div className="inline-flex items-center gap-1.5">
            <dt className="sr-only">Fee</dt>
            <dd className="num font-mono">{inr(appt.appointment_fee)}</dd>
          </div>
        )}
      </dl>

      {appt.message && (
        <blockquote className={cn('mt-3 border-l-2 border-line pl-3 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty', compact && 'line-clamp-2')}>
          {appt.message}
        </blockquote>
      )}

      {pending && (onAccept || onDecline) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="brand" icon={Check} loading={busy} onClick={() => onAccept?.(appt)} aria-label={`Accept request from ${name}`}>Accept</Button>
          <Button variant="outline" icon={X} disabled={busy} onClick={() => onDecline?.(appt)} aria-label={`Decline request from ${name}`}>Decline</Button>
        </div>
      )}

      {appt.status === 'accepted' && appt.patient_id && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" icon={FileText} to={`/doctor/patients/${appt.patient_id}`}>Open chart</Button>
          <Button variant="ghost" icon={MessageSquare} to={`/doctor/messages/${appt.patient_id}`}>Message</Button>
        </div>
      )}
    </motion.article>
  )
}
