import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Phone, Video } from 'lucide-react'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import { Textarea } from '../../components/ui/Field'
import { Badge, RISK_HEX, riskKey } from '../../components/ui/Badge'
import { CHART } from '../../components/ui/Data'
import { api } from '../../lib/api'
import { cn, errorMessage, fmtDate, num } from '../../lib/utils'

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

/** Biomarker sub-scores in a fixed order (for micro charts). */
export const SUBSCORE_KEYS = ['tremor', 'speed', 'symmetry', 'balance', 'rhythm', 'arm_swing', 'cadence']
export function subscoresOf(risk) {
  const mi = risk?.motor_index
  if (!mi || typeof mi !== 'object') return []
  return SUBSCORE_KEYS.map((k) => (mi[k] == null ? null : Number(mi[k])))
}

export const MEETING = {
  video_call: { label: 'Video call', icon: Video },
  in_person: { label: 'In person', icon: Building2 },
  phone: { label: 'Phone', icon: Phone },
}

export const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

/** Recharts styling shared by every doctor chart (DESIGN.md hex values). */
export const AXIS = { tick: { fill: CHART.stone, fontSize: 13, fontFamily: '"Geist Mono Variable", ui-monospace, monospace' }, axisLine: { stroke: CHART.grid }, tickLine: false }
export const GRID = { stroke: CHART.grid, strokeDasharray: '2 4', vertical: false }

/** Paper chart tooltip. `rows` = [{ label, value, color }] */
export function ChartTip({ title, rows = [] }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-2 text-[0.8125rem] shadow-float">
      {title && <p className="font-mono text-ink-3">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="mt-0.5 flex items-center gap-2 text-ink-2">
          {r.color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          {r.label}
          <span className="num ml-auto pl-3 text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Recharts tooltip content for a single-series chart keyed by `date`. */
export function DateTip({ active, payload, unit = '', label: name, digits = 1 }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return <ChartTip title={fmtDate(p.payload.date, 'EEE d MMM')} rows={[{ label: name, value: `${num(p.value, digits)}${unit}`, color: p.color || p.stroke || p.fill }]} />
}

// ── Tiny presentational atoms ───────────────────────────────────────────
export function Tag({ children, tone = 'teal', className }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-800 ring-teal-100',
    lilac: 'bg-cream text-ink-3 ring-line',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    apricot: 'bg-apricot-50 text-apricot-600 ring-apricot-100',
    sky: 'bg-sky-50 text-sky-500 ring-sky-100',
    ink: 'bg-cream text-ink-2 ring-line',
  }
  return <span className={cn('inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-[0.8125rem] ring-1 ring-inset', tones[tone] || tones.ink, className)}>{children}</span>
}

/** Compact horizontal motor-index bar coloured by risk. */
export function MiniBar({ value, level, className }) {
  const v = value == null ? null : Math.max(0, Math.min(100, Number(value)))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-cream ring-1 ring-inset ring-line/60" aria-hidden>
        {v != null && <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: RISK_HEX[riskKey(level)] }} />}
      </div>
      <span className="num w-7 text-[0.9375rem] text-ink">{v == null ? '—' : Math.round(v)}</span>
    </div>
  )
}

/** Card-contained horizontal scroller so wide tables never scroll the page. */
export function TableScroll({ children, className }) {
  return <div className={cn('-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6', className)}>{children}</div>
}

const LAB_KEY = { Low: 'LOW', Normal: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Critical: 'HIGH' }

/** Lab report overall-risk badge (Low | Normal | Medium | High | Critical). */
export function LabRiskBadge({ risk, className }) {
  const k = LAB_KEY[risk] || 'UNKNOWN'
  const tone = { LOW: 'teal', MEDIUM: 'butter', HIGH: 'rose', UNKNOWN: 'ink' }[k]
  return (
    <Badge tone={tone} className={className}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_HEX[k] }} />
      {risk || 'Unrated'}
    </Badge>
  )
}

/** Table header cell: mono, sentence case, hairline below (set on <thead>). */
export function Th({ children, className }) {
  return <th scope="col" className={cn('whitespace-nowrap px-3 py-3 text-left font-mono text-[0.8125rem] font-normal text-ink-3', className)}>{children}</th>
}

/** Mono section label used inside cards (sentence case). */
export function Label({ children, icon: Icon, className, as: As = 'p' }) {
  return (
    <As className={cn('kicker flex items-center gap-1.5', className)}>
      {Icon && <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} />}
      {children}
    </As>
  )
}

/**
 * Card/section heading: optional quiet icon, title (h2 by default so pages keep a valid outline),
 * subtitle, and a right-aligned action.
 */
export function Head({ icon: Icon, title, subtitle, action, level = 2, className }) {
  const H = `h${level}`
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-ink-2 ring-1 ring-inset ring-line">
            <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0">
          <H className="text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] text-ink">{title}</H>
          {subtitle && <p className="mt-0.5 text-[0.875rem] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
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
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="md" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {description && <p className="text-base leading-relaxed text-ink-2 text-pretty">{description}</p>}
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
          <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>Keep pending</Button>
          <Button variant="danger" size="md" loading={loading} onClick={() => onConfirm(note.trim())}>Decline request</Button>
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
