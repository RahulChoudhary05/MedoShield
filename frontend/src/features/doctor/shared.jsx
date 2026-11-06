import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Phone, Video } from 'lucide-react'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import { Textarea } from '../../components/ui/Field'
import { api } from '../../lib/api'
import { cn, errorMessage, riskOf } from '../../lib/utils'

// ── Small formatting helpers ────────────────────────────────────────────
export const GENDER = { M: 'Male', F: 'Female', O: 'Other', N: 'Not stated' }

export function patientMeta(p) {
  if (!p) return ''
  return [p.age != null ? `${p.age} yrs` : null, GENDER[p.gender]].filter(Boolean).join(' · ')
}

/** latest_risk.motor_index is a dict {overall, tremor, ...}; tolerate a bare number. */
export function motorOf(risk) {
  const mi = risk?.motor_index
  if (mi == null) return null
  return typeof mi === 'object' ? mi.overall ?? null : Number(mi)
}

export const levelOf = (risk) => risk?.level || 'UNKNOWN'

export const MEETING = {
  video_call: { label: 'Video call', icon: Video },
  in_person: { label: 'In person', icon: Building2 },
  phone: { label: 'Phone', icon: Phone },
}

export const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// ── Tiny presentational atoms ───────────────────────────────────────────
export function Tag({ children, tone = 'teal', className }) {
  const tones = {
    teal: 'border-teal-100 bg-teal-50 text-teal-700',
    lilac: 'border-lilac-100 bg-lilac-50 text-lilac-600',
    rose: 'border-rose-100 bg-rose-50 text-rose-600',
    apricot: 'border-apricot-100 bg-apricot-50 text-apricot-600',
    sky: 'border-sky-100 bg-sky-50 text-sky-500',
    ink: 'border-line bg-cream text-ink-2',
  }
  return <span className={cn('inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

/** Compact horizontal motor-index bar coloured by risk. */
export function MiniBar({ value, level, className }) {
  const v = value == null ? null : Math.max(0, Math.min(100, Number(value)))
  const color = riskOf(level).color
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F0E9DD]" aria-hidden>
        {v != null && <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: color }} />}
      </div>
      <span className="num w-7 text-sm font-semibold text-ink">{v == null ? '—' : Math.round(v)}</span>
    </div>
  )
}

/** Card-contained horizontal scroller so wide tables never scroll the page. */
export function TableScroll({ children, className }) {
  return <div className={cn('-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6', className)}>{children}</div>
}

export function Th({ children, className }) {
  return <th scope="col" className={cn('whitespace-nowrap px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-[.12em] text-ink-4', className)}>{children}</th>
}

// ── Dialogs ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', tone = 'primary', loading, onConfirm, children }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {description && <p className="text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{description}</p>}
      {children}
    </Dialog>
  )
}

/** Shared accept / decline mutation; invalidates every doctor query. */
export function useAppointmentDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accept, note = '' }) => (accept ? api.doctors.accept(id, note) : api.doctors.reject(id, note)),
    onSuccess: (_, v) => {
      toast.success(v.accept ? 'Request accepted — the patient is now on your panel' : 'Request declined. The patient has been notified.')
      qc.invalidateQueries({ queryKey: ['doctor'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}

/** Decline-with-optional-note dialog. `appt` null = closed. */
export function DeclineDialog({ appt, onClose, onConfirm, loading }) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (appt) setNote('')
  }, [appt])
  const name = appt?.patient?.full_name || 'this patient'
  return (
    <Dialog
      open={!!appt}
      onOpenChange={(o) => !o && onClose()}
      title="Decline request"
      description={`Let ${name} know why you can’t take this one. The note is optional and is shared with them.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Keep pending</Button>
          <Button variant="danger" size="sm" loading={loading} onClick={() => onConfirm(note.trim())}>Decline request</Button>
        </>
      }
    >
      <Textarea
        label="Note to patient"
        optional
        maxLength={400}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. I’m fully booked this month — Dr. Rao at the same clinic can see you sooner."
        help={`${note.length}/400`}
      />
    </Dialog>
  )
}
