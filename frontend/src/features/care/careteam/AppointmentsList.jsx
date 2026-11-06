import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { CalendarClock, MessageCircle, MessagesSquare, Quote, Stethoscope, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Data'
import { api } from '../../../lib/api'
import { cn, errorMessage, fmtDate, fmtRelative } from '../../../lib/utils'
import { ConfirmDialog } from '../shared'
import { MODES } from './RequestDialog'

const STATUS = {
  pending: { label: 'Awaiting reply', cls: 'bg-apricot-50 text-apricot-600 ring-apricot-100', bar: 'bg-apricot-300' },
  accepted: { label: 'Accepted', cls: 'bg-teal-50 text-teal-700 ring-teal-100', bar: 'bg-teal-500' },
  rejected: { label: 'Declined', cls: 'bg-rose-50 text-rose-600 ring-rose-100', bar: 'bg-rose-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-ink/[.05] text-ink-3 ring-line', bar: 'bg-line' },
  completed: { label: 'Completed', cls: 'bg-teal-50 text-teal-600 ring-teal-100', bar: 'bg-teal-300' },
}

function to12(t) {
  if (!t) return ''
  const h = Number(t.slice(0, 2))
  return `${((h + 11) % 12) + 1}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`
}

export default function AppointmentsList({ items }) {
  const qc = useQueryClient()
  const [cancelling, setCancelling] = useState(null)
  const cancel = useMutation({
    mutationFn: (id) => api.doctors.cancelAppointment(id),
    onSuccess: () => {
      toast.success('Appointment cancelled')
      setCancelling(null)
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <>
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((a, i) => {
            const st = STATUS[a.status] || STATUS.pending
            const mode = MODES.find((m) => m.value === a.meeting_mode) || MODES[0]
            const d = a.doctor
            const canCancel = a.status === 'pending' || a.status === 'accepted'
            return (
              <motion.li key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }} className="card relative overflow-hidden">
                <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', st.bar)} />
                <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <Avatar name={d?.full_name || 'Doctor'} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-ink">{d?.full_name || 'Doctor no longer available'}</p>
                        <span className={cn('badge ring-1 ring-inset', st.cls)}>{st.label}</span>
                      </div>
                      {d?.specialty && <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-3"><Stethoscope className="h-3.5 w-3.5" /> {d.specialty}</p>}
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
                        <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-ink-4" /> {fmtDate(a.preferred_date, 'EEE, d MMM yyyy')} · {to12(a.preferred_time)}</span>
                        <span className="inline-flex items-center gap-1.5"><mode.icon className="h-4 w-4 text-ink-4" /> {mode.label}</span>
                        {Number(a.appointment_fee) > 0 && <span className="num text-ink-3">₹{Number(a.appointment_fee).toLocaleString('en-IN')}</span>}
                      </div>
                      {a.message && <p className="mt-2.5 line-clamp-2 text-sm text-ink-3">“{a.message}”</p>}
                      {a.doctor_note && (
                        <div className="mt-3 flex gap-2 rounded-2xl bg-cream px-3.5 py-2.5 text-sm text-ink-2 ring-1 ring-inset ring-line/60">
                          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                          <span><span className="font-medium text-ink">Note from your doctor: </span>{a.doctor_note}</span>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-ink-4">Requested {fmtRelative(a.created_at)}</p>
                    </div>
                  </div>
                  {(canCancel || a.status === 'accepted') && (
                    <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
                      {a.status === 'accepted' && d?.id && (
                        <Link to={`/app/messages/${d.id}`} className="btn btn-sm btn-brand flex-1 sm:flex-none">
                          <MessageCircle className="h-4 w-4" /> Message
                        </Link>
                      )}
                      {canCancel && (
                        <button onClick={() => setCancelling(a)} className="btn btn-sm btn-ghost flex-1 text-rose-600 hover:bg-rose-50 hover:text-rose-600 sm:flex-none">
                          <XCircle className="h-4 w-4" /> Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink-4">
        <MessagesSquare className="h-3.5 w-3.5" /> Secure messaging opens as soon as a doctor accepts your request.
      </p>
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this appointment?"
        description={cancelling?.doctor?.full_name ? `${cancelling.doctor.full_name} will be told you cancelled.` : undefined}
        confirmLabel="Cancel appointment"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(cancelling.id)}
      >
        <p className="text-sm text-ink-3">You can always send a new request later.</p>
      </ConfirmDialog>
    </>
  )
}
