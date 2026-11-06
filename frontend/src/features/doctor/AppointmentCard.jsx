import { motion } from 'framer-motion'
import { CalendarDays, Check, Clock3, FileText, MessageSquare, Quote, X } from 'lucide-react'
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
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn(compact ? 'tile p-4 transition hover:border-teal-200 hover:bg-paper hover:shadow-soft' : 'card card-pad card-interactive')}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} size={compact ? 40 : 46} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[0.98rem] font-semibold">{name}</h3>
            {!compact && <Badge tone={status.tone} dot>{status.label}</Badge>}
          </div>
          <p className="text-xs text-ink-3">{patientMeta(appt.patient) || 'Details unavailable'} · requested {fmtRelative(appt.created_at)}</p>
        </div>
        {!compact && appt.appointment_fee > 0 && <span className="num shrink-0 text-sm font-semibold text-ink">{inr(appt.appointment_fee)}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">
          <CalendarDays className="h-3.5 w-3.5 text-teal-600" /> {fmtDate(appt.preferred_date, 'EEE, d MMM')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">
          <Clock3 className="h-3.5 w-3.5 text-apricot-500" /> {appt.preferred_time || '—'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">
          <ModeIcon className="h-3.5 w-3.5 text-teal-600" /> {mode.label}
        </span>
        {compact && appt.appointment_fee > 0 && (
          <span className="inline-flex items-center rounded-full bg-paper px-2.5 py-1 font-medium ring-1 ring-line">{inr(appt.appointment_fee)}</span>
        )}
      </div>

      {appt.message && (
        <p className={cn('mt-3 flex gap-2 text-sm text-ink-2 text-pretty', compact && 'line-clamp-2')}>
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden />
          <span>{appt.message}</span>
        </p>
      )}

      {pending && (onAccept || onDecline) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="brand" icon={Check} loading={busy} onClick={() => onAccept?.(appt)} aria-label={`Accept request from ${name}`}>Accept</Button>
          <Button size="sm" variant="outline" icon={X} disabled={busy} onClick={() => onDecline?.(appt)} aria-label={`Decline request from ${name}`}>Decline</Button>
        </div>
      )}

      {appt.status === 'accepted' && appt.patient_id && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="soft" icon={FileText} to={`/doctor/patients/${appt.patient_id}`}>Open chart</Button>
          <Button size="sm" variant="ghost" icon={MessageSquare} to={`/doctor/messages/${appt.patient_id}`}>Message</Button>
        </div>
      )}
    </motion.article>
  )
}
