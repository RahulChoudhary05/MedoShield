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
  pending: { label: 'Awaiting reply', cls: 'text-apricot-600', dot: 'bg-apricot-500' },
  accepted: { label: 'Accepted', cls: 'text-teal-700', dot: 'bg-teal-600' },
  rejected: { label: 'Declined', cls: 'text-rose-600', dot: 'bg-rose-500' },
  cancelled: { label: 'Cancelled', cls: 'text-ink-3', dot: 'bg-ink-4' },
  completed: { label: 'Completed', cls: 'text-teal-700', dot: 'bg-teal-400' },
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
      <ul className="card divide-y divide-line px-5 sm:px-6">
        <AnimatePresence initial={false}>
          {items.map((a, i) => {
            const st = STATUS[a.status] || STATUS.pending
            const mode = MODES.find((m) => m.value === a.meeting_mode) || MODES[0]
            const d = a.doctor
            const canCancel = a.status === 'pending' || a.status === 'accepted'
            return (
              <motion.li key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04, duration: 0.35 }}>
                <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <Avatar name={d?.full_name || 'Doctor'} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-ink">{d?.full_name || 'Doctor no longer available'}</p>
                        <span className={cn('inline-flex items-center gap-1.5 font-mono text-[0.8125rem]', st.cls)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />{st.label}</span>
                      </div>
                      {d?.specialty && <p className="mt-0.5 flex items-center gap-1 text-[0.9375rem] text-ink-3"><Stethoscope className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> {d.specialty}</p>}
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.9375rem] text-ink-2">
                        <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-ink-3" strokeWidth={1.8} aria-hidden /> <span className="num">{fmtDate(a.preferred_date, 'EEE, d MMM yyyy')} · {to12(a.preferred_time)}</span></span>
                        <span className="inline-flex items-center gap-1.5"><mode.icon className="h-4 w-4 text-ink-3" strokeWidth={1.8} aria-hidden /> {mode.label}</span>
                        {Number(a.appointment_fee) > 0 && <span className="num text-ink-3">₹{Number(a.appointment_fee).toLocaleString('en-IN')}</span>}
                      </div>
                      {a.message && <p className="mt-2.5 line-clamp-2 text-[0.9375rem] text-ink-3">“{a.message}”</p>}
                      {a.doctor_note && (
                        <div className="mt-3 flex gap-2 rounded-lg bg-cream/60 px-3 py-2 text-[0.9375rem] text-ink-2">
                          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
                          <span><span className="font-medium text-ink">Note from your doctor: </span>{a.doctor_note}</span>
                        </div>
                      )}
                      <p className="mt-2 font-mono text-[0.8125rem] text-ink-3">Requested {fmtRelative(a.created_at)}</p>
                    </div>
                  </div>
                  {(canCancel || a.status === 'accepted') && (
                    <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
                      {a.status === 'accepted' && d?.id && (
                        <Link to={`/app/messages/${d.id}`} className="btn btn-md btn-brand flex-1 sm:flex-none">
                          <MessageCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Message doctor
                        </Link>
                      )}
                      {canCancel && (
                        <button onClick={() => setCancelling(a)} className="btn btn-md btn-ghost flex-1 text-rose-600 hover:bg-rose-50 hover:text-rose-600 sm:flex-none">
                          <XCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Cancel visit
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
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[0.8125rem] text-ink-3">
        <MessagesSquare className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> Secure messaging opens as soon as a doctor accepts your request.
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
        <p className="text-[0.9375rem] text-ink-3">You can always send a new request later.</p>
      </ConfirmDialog>
    </>
  )
}
