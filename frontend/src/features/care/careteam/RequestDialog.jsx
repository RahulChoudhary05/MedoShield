import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Phone, Video } from 'lucide-react'
import Dialog from '../../../components/ui/Dialog'
import Button from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'
import { Avatar } from '../../../components/ui/Data'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { todayISO } from '../shared'

export const MODES = [
  { value: 'video_call', label: 'Video call', icon: Video },
  { value: 'in_person', label: 'In person', icon: Building2 },
  { value: 'phone', label: 'Phone', icon: Phone },
]

const tomorrow = () => todayISO(new Date(Date.now() + 86_400_000))

export default function RequestDialog({ doctor: current, onOpenChange, onDone }) {
  // Keep showing the last doctor while the dialog animates closed.
  const last = useRef(current)
  if (current) last.current = current
  const doctor = current || last.current
  const qc = useQueryClient()
  const [f, setF] = useState({ date: tomorrow(), time: '10:00', mode: 'video_call', message: '' })
  const [errors, setErrors] = useState({})
  useEffect(() => {
    if (doctor) {
      setF({ date: tomorrow(), time: '10:00', mode: 'video_call', message: '' })
      setErrors({})
    }
  }, [current])

  const req = useMutation({
    mutationFn: (body) => api.doctors.requestAppointment(body),
    onSuccess: () => {
      toast.success('Request sent', { description: `${doctor?.full_name} will reply soon — we’ll notify you.` })
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] })
      onOpenChange(false)
      onDone?.()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!f.date || f.date < todayISO()) errs.date = 'Choose today or a later date'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) errs.time = 'Pick a time'
    setErrors(errs)
    if (Object.keys(errs).length) return
    req.mutate({ doctor_id: doctor.id, preferred_date: f.date, preferred_time: f.time, meeting_mode: f.mode, message: f.message.trim().slice(0, 600) })
  }

  const fee = Number(doctor?.appointment_fee || 0)
  return (
    <Dialog
      open={!!current}
      onOpenChange={onOpenChange}
      title="Request an appointment"
      description="Your doctor confirms the final time. Once they accept, secure messaging opens."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" type="submit" form="appt-form" loading={req.isPending}>Send request</Button>
        </>
      }
    >
      {doctor && (
        <form id="appt-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <Avatar name={doctor.full_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{doctor.full_name}</p>
              <p className="truncate text-[0.9375rem] text-ink-3">{doctor.specialty}{doctor.clinic_name ? ` · ${doctor.clinic_name}` : ''}</p>
            </div>
            <p className="num shrink-0 text-ink">{fee > 0 ? `₹${fee.toLocaleString('en-IN')}` : 'Free'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Preferred date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} error={errors.date} />
            <Input label="Preferred time" type="time" value={f.time} onChange={(e) => setF((s) => ({ ...s, time: e.target.value }))} error={errors.time} />
          </div>

          <fieldset>
            <legend className="label">How would you like to meet?</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Meeting mode">
              {MODES.map((m) => {
                const on = f.mode === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setF((s) => ({ ...s, mode: m.value }))}
                    className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-[0.8125rem] font-medium transition duration-150', on ? 'border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-700' : 'border-line bg-paper text-ink-2 hover:border-ink-4')}
                  >
                    <m.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden /> {m.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="appt-msg" className="label">Anything they should know? <span className="font-normal text-ink-3">(optional)</span></label>
            <textarea id="appt-msg" className="input min-h-[96px]" maxLength={600} placeholder="e.g. My tremor has felt stronger in the mornings for two weeks." value={f.message} onChange={(e) => setF((s) => ({ ...s, message: e.target.value }))} />
            <p className="help text-right">{f.message.length}/600</p>
          </div>
        </form>
      )}
    </Dialog>
  )
}
