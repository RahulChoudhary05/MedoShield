import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Plus, X } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Feedback'

export const FREQUENCIES = [
  { value: 'once daily', slots: ['08:00'] },
  { value: 'twice daily', slots: ['08:00', '20:00'] },
  { value: 'three times daily', slots: ['08:00', '14:00', '20:00'] },
  { value: 'four times daily', slots: ['08:00', '12:00', '16:00', '20:00'] },
  { value: 'at bedtime', slots: ['21:00'] },
  { value: 'every 12 hours', slots: ['08:00', '20:00'] },
  { value: 'every 8 hours', slots: ['06:00', '14:00', '22:00'] },
  { value: 'weekly', slots: ['09:00'] },
  { value: 'as needed', slots: [] },
]

const EMPTY = { name: '', dosage: '', frequency: 'once daily', time_slots: ['08:00'], duration_days: '', instructions: '', side_effects: '' }
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export default function PrescribeDialog({ open, onOpenChange, patientId, patientName, existing = [] }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [slotsTouched, setSlotsTouched] = useState(false)
  const [newSlot, setNewSlot] = useState('')
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const reset = () => {
    setForm(EMPTY)
    setSlotsTouched(false)
    setNewSlot('')
    setErrors({})
  }

  const add = useMutation({
    mutationFn: (item) => api.meds.add(item, patientId),
    onSuccess: (_, item) => {
      toast.success(`${item.name} added to ${patientName}’s plan`)
      ;['meds', 'overview', 'timeline'].forEach((k) => qc.invalidateQueries({ queryKey: ['doctor', k, patientId] }))
      onOpenChange(false)
      reset()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const changeFrequency = (value) => {
    set('frequency', value)
    if (!slotsTouched) set('time_slots', FREQUENCIES.find((f) => f.value === value)?.slots ?? [])
  }

  const addSlot = () => {
    if (!TIME_RE.test(newSlot)) return
    setSlotsTouched(true)
    setForm((f) => ({ ...f, time_slots: [...new Set([...f.time_slots, newSlot])].sort().slice(0, 8) }))
    setNewSlot('')
  }
  const removeSlot = (s) => {
    setSlotsTouched(true)
    setForm((f) => ({ ...f, time_slots: f.time_slots.filter((x) => x !== s) }))
  }

  const sideEffects = form.side_effects.split(',').map((s) => s.trim()).filter(Boolean)
  const replaces = form.name.trim() && existing.some((m) => (m.name || '').toLowerCase() === form.name.trim().toLowerCase())

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    const name = form.name.trim()
    if (!name) errs.name = 'Enter the medicine name'
    else if (name.length > 80) errs.name = 'Keep it under 80 characters'
    if (form.dosage.length > 60) errs.dosage = 'Keep it under 60 characters'
    const days = form.duration_days === '' ? null : Number(form.duration_days)
    if (days != null && (!Number.isInteger(days) || days < 1 || days > 3650)) errs.duration_days = 'Whole days between 1 and 3650'
    if (sideEffects.length > 10) errs.side_effects = 'List up to 10 side effects'
    else if (sideEffects.some((s) => s.length > 60)) errs.side_effects = 'Each side effect must be under 60 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return
    add.mutate({
      name,
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      time_slots: form.time_slots,
      duration_days: days,
      instructions: form.instructions.trim(),
      side_effects: sideEffects,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
      size="lg"
      title="Prescribe a medicine"
      description={`Adds to ${patientName}’s plan and reminders. They’ll be notified straight away.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={add.isPending}>Cancel</Button>
          <Button variant="brand" type="submit" form="prescribe-form" loading={add.isPending}>{replaces ? 'Replace prescription' : 'Add to plan'}</Button>
        </>
      }
    >
      <form id="prescribe-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Medicine" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Levodopa/Carbidopa" maxLength={80} error={errors.name} autoFocus wrapClass="sm:col-span-2" />
        {replaces && (
          <Notice tone="warn" className="sm:col-span-2">A medicine with this name is already in the plan — saving will replace it.</Notice>
        )}
        <Input label="Dosage" optional value={form.dosage} onChange={(e) => set('dosage', e.target.value)} placeholder="e.g. 100/25 mg, 1 tablet" maxLength={60} error={errors.dosage} />
        <Select label="Frequency" value={form.frequency} onChange={(e) => changeFrequency(e.target.value)}>
          {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.value[0].toUpperCase() + f.value.slice(1)}</option>)}
        </Select>

        <Field label="Reminder times" descId="rx-slots-desc" help={form.time_slots.length ? '24-hour clock. Up to 8 times a day.' : 'No reminders — the server will pick a default time.'} className="sm:col-span-2">
          <div role="group" aria-label="Reminder times" aria-describedby="rx-slots-desc" className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-cream/50 p-2">
            <AnimatePresence initial={false}>
              {form.time_slots.map((s) => (
                <motion.span
                  key={s}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-paper pl-3 text-[0.9375rem] text-ink ring-1 ring-inset ring-line"
                >
                  <Clock3 aria-hidden strokeWidth={1.8} className="h-4 w-4 text-teal-700" />
                  <span className="num">{s}</span>
                  <button type="button" onClick={() => removeSlot(s)} aria-label={`Remove ${s}`} className="grid h-11 w-10 place-items-center rounded-r-lg text-ink-3 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600">
                    <X aria-hidden strokeWidth={1.8} className="h-4 w-4" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {form.time_slots.length < 8 && (
              <span className="inline-flex items-center gap-1">
                <input
                  type="time"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSlot() } }}
                  aria-label="New reminder time"
                  className="h-11 rounded-lg border border-line bg-paper px-3 text-[0.9375rem] text-ink focus:border-teal-500 focus:outline-none focus:ring-[3px] focus:ring-teal-100"
                />
                <Button type="button" variant="soft" icon={Plus} className="h-11 px-3.5" onClick={addSlot} disabled={!TIME_RE.test(newSlot)}>Add time</Button>
              </span>
            )}
          </div>
        </Field>

        <Input label="Duration (days)" optional type="number" inputMode="numeric" min={1} max={3650} value={form.duration_days} onChange={(e) => set('duration_days', e.target.value)} placeholder="Ongoing if blank" error={errors.duration_days} />
        <Input label="Possible side effects" optional value={form.side_effects} onChange={(e) => set('side_effects', e.target.value)} placeholder="Nausea, dizziness" help="Separate with commas" error={errors.side_effects} />
        <Textarea label="Instructions" optional value={form.instructions} onChange={(e) => set('instructions', e.target.value)} maxLength={300} rows={3} placeholder="e.g. Take 30 minutes before meals. Avoid high-protein meals close to the dose." help={`${form.instructions.length}/300`} wrapClass="sm:col-span-2" />
      </form>
    </Dialog>
  )
}
