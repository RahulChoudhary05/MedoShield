import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import Dialog from '../../../components/ui/Dialog'
import Button from '../../../components/ui/Button'
import { Input, Select, Textarea } from '../../../components/ui/Field'
import { api } from '../../../lib/api'
import { errorMessage } from '../../../lib/utils'
import { TagInput } from '../shared'

const FREQUENCIES = [
  { value: 'once daily', slots: ['08:00'] },
  { value: 'twice daily', slots: ['08:00', '20:00'] },
  { value: 'three times daily', slots: ['08:00', '14:00', '20:00'] },
  { value: 'four times daily', slots: ['08:00', '12:00', '16:00', '20:00'] },
  { value: 'at bedtime', slots: ['21:00'] },
  { value: 'as needed', slots: ['09:00'] },
]

const EMPTY = { name: '', dosage: '', frequency: 'once daily', time_slots: ['08:00'], duration_days: '', instructions: '', side_effects: [] }
const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/

export default function AddMedDialog({ open, onOpenChange }) {
  const qc = useQueryClient()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }))

  const add = useMutation({
    mutationFn: (item) => api.meds.add(item),
    onSuccess: (_, item) => {
      toast.success(`${item.name} added to your plan`)
      qc.invalidateQueries({ queryKey: ['meds'] })
      setF(EMPTY)
      onOpenChange(false)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function setFrequency(e) {
    const value = e.target.value
    const preset = FREQUENCIES.find((x) => x.value === value)
    setF((s) => ({ ...s, frequency: value, time_slots: preset ? [...preset.slots] : s.time_slots }))
  }

  function setSlot(i, v) {
    setF((s) => ({ ...s, time_slots: s.time_slots.map((t, j) => (j === i ? v : t)) }))
  }

  function submit(e) {
    e.preventDefault()
    const errs = {}
    const name = f.name.trim()
    if (!name) errs.name = 'Please enter the medicine name'
    const slots = [...new Set(f.time_slots.filter(Boolean))]
    if (slots.some((t) => !TIME_RX.test(t))) errs.time_slots = 'Use the HH:MM format for each time'
    const days = f.duration_days === '' ? null : Number(f.duration_days)
    if (days != null && (!Number.isInteger(days) || days < 1 || days > 3650)) errs.duration_days = 'Between 1 and 3650 days'
    setErrors(errs)
    if (Object.keys(errs).length) return
    add.mutate({
      name: name.slice(0, 80),
      dosage: f.dosage.trim().slice(0, 60),
      frequency: f.frequency,
      time_slots: slots.sort(),
      duration_days: days,
      instructions: f.instructions.trim().slice(0, 300),
      side_effects: f.side_effects,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a medicine"
      description="Track something you take. We’ll remind you at each time you set."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" type="submit" form="add-med-form" loading={add.isPending}>Save medicine</Button>
        </>
      }
    >
      <form id="add-med-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Medicine name" placeholder="e.g. Levodopa / Carbidopa" value={f.name} onChange={set('name')} maxLength={80} error={errors.name} wrapClass="sm:col-span-2" autoFocus />
        <Input label="Dose" optional placeholder="e.g. 100/25 mg" value={f.dosage} onChange={set('dosage')} maxLength={60} />
        <Select label="How often" value={f.frequency} onChange={setFrequency}>
          {FREQUENCIES.map((x) => <option key={x.value} value={x.value}>{x.value[0].toUpperCase() + x.value.slice(1)}</option>)}
        </Select>

        <div className="sm:col-span-2">
          <p className="label">Reminder times</p>
          <div className="flex flex-wrap items-center gap-2">
            <AnimatePresence initial={false}>
              {f.time_slots.map((t, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex h-11 items-center gap-1 rounded-lg border border-line bg-paper pl-3 pr-1">
                  <input type="time" value={t} onChange={(e) => setSlot(i, e.target.value)} aria-label={`Reminder time ${i + 1}`} className="num bg-transparent text-base text-ink outline-none" />
                  <button type="button" onClick={() => setF((s) => ({ ...s, time_slots: s.time_slots.filter((_, j) => j !== i) }))} className="grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ink" aria-label={`Remove time ${t}`}>
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {f.time_slots.length < 8 && (
              <button type="button" onClick={() => setF((s) => ({ ...s, time_slots: [...s.time_slots, '12:00'] }))} className="btn btn-outline h-11 px-4 text-[0.9375rem]">
                <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Add a time
              </button>
            )}
          </div>
          {errors.time_slots ? <p className="error-text">{errors.time_slots}</p> : <p className="help">Leave empty and we’ll pick sensible times from the frequency.</p>}
        </div>

        <Input label="For how many days" optional type="number" inputMode="numeric" min={1} max={3650} placeholder="Ongoing" value={f.duration_days} onChange={set('duration_days')} error={errors.duration_days} />
        <div className="hidden sm:block" />
        <Textarea label="Instructions" optional placeholder="e.g. Take 30 minutes before meals, with water" value={f.instructions} onChange={set('instructions')} maxLength={300} wrapClass="sm:col-span-2" className="min-h-[84px]" />
        <div className="sm:col-span-2">
          <TagInput label="Side effects to watch for (optional)" value={f.side_effects} onChange={set('side_effects')} max={10} maxLength={60} placeholder="e.g. nausea" tone="apricot" />
        </div>
      </form>
    </Dialog>
  )
}
