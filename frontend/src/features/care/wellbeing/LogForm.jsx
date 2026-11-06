import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Footprints, HeartPulse, Moon, NotebookPen, Ruler, Scale } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { readLocal, todayISO, writeLocal } from '../shared'

const MOODS = [
  { max: 2, emoji: '😌', label: 'Calm' },
  { max: 4, emoji: '🙂', label: 'Mostly fine' },
  { max: 6, emoji: '😐', label: 'Some pressure' },
  { max: 8, emoji: '😟', label: 'Stressed' },
  { max: 10, emoji: '😣', label: 'Overwhelmed' },
]
const moodOf = (v) => MOODS.find((m) => v <= m.max) || MOODS[4]
const HEIGHT_KEY = 'medo:height-cm'

const blank = (date) => ({ date, sleep_hours: '', stress_level: 4, walking_distance: '', heart_rate: '', weight_kg: '', notes: '' })
const str = (v) => (v == null ? '' : String(v))

export function bmiFrom(weight, heightCm) {
  const w = Number(weight)
  const h = Number(heightCm) / 100
  if (!w || !h) return null
  const b = w / (h * h)
  return b >= 10 && b <= 80 ? Math.round(b * 10) / 10 : null
}

export function bmiBand(b) {
  if (b == null) return null
  if (b < 18.5) return { label: 'Under range', cls: 'text-teal-500' }
  if (b < 25) return { label: 'Healthy range', cls: 'text-teal-600' }
  if (b < 30) return { label: 'Above range', cls: 'text-apricot-600' }
  return { label: 'Well above range', cls: 'text-apricot-600' }
}

export default function LogForm({ records = [] }) {
  const qc = useQueryClient()
  const [f, setF] = useState(() => blank(todayISO()))
  const [height, setHeight] = useState(() => str(readLocal(HEIGHT_KEY, '')))
  const [errors, setErrors] = useState({})
  const existing = useMemo(() => records.find((r) => r.date === f.date), [records, f.date])

  // When the chosen date already has a log, load it so saving edits it in place.
  useEffect(() => {
    if (existing) {
      setF({
        date: existing.date, sleep_hours: str(existing.sleep_hours), stress_level: existing.stress_level ?? 4,
        walking_distance: str(existing.walking_distance), heart_rate: str(existing.heart_rate), weight_kg: str(existing.weight_kg), notes: existing.notes || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const bmi = bmiFrom(f.weight_kg, height)
  const band = bmiBand(bmi)
  const mood = moodOf(Number(f.stress_level))

  const save = useMutation({
    mutationFn: (body) => api.fitness.add(body),
    onSuccess: () => {
      toast.success(existing ? 'Log updated' : 'Day logged — thank you for checking in')
      qc.invalidateQueries({ queryKey: ['fitness'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function submit(e) {
    e.preventDefault()
    const errs = {}
    const n = (k, min, max, int = false) => {
      if (f[k] === '' || f[k] == null) return null
      const v = Number(f[k])
      if (Number.isNaN(v) || v < min || v > max || (int && !Number.isInteger(v))) {
        errs[k] = `Enter ${int ? 'a whole number ' : ''}between ${min} and ${max}`
        return null
      }
      return v
    }
    if (!f.date) errs.date = 'Pick a date'
    else if (f.date > todayISO()) errs.date = 'The date can’t be in the future'
    const body = {
      date: f.date,
      sleep_hours: n('sleep_hours', 0, 24),
      stress_level: Number(f.stress_level),
      walking_distance: n('walking_distance', 0, 100),
      heart_rate: n('heart_rate', 25, 230, true),
      weight_kg: n('weight_kg', 2, 400),
      bmi,
      notes: f.notes.trim().slice(0, 300),
    }
    if (height !== '' && (Number(height) < 50 || Number(height) > 250)) errs.height = 'Between 50 and 250 cm'
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (height) writeLocal(HEIGHT_KEY, Number(height))
    save.mutate(body)
  }

  return (
    <Card>
      <CardHeader icon={NotebookPen} tone="apricot" title="Daily check-in" subtitle={existing ? 'Editing your log for this day' : 'Takes less than a minute'} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Date" type="date" value={f.date} max={todayISO()} onChange={(e) => {
          const date = e.target.value
          setF((s) => (records.some((r) => r.date === date) ? { ...s, date } : { ...blank(date), stress_level: s.stress_level }))
        }} error={errors.date} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Sleep (hours)" icon={Moon} type="number" inputMode="decimal" step="0.5" min={0} max={24} placeholder="7.5" value={f.sleep_hours} onChange={set('sleep_hours')} error={errors.sleep_hours} />
          <Input label="Walked (km)" icon={Footprints} type="number" inputMode="decimal" step="0.1" min={0} max={100} placeholder="2.4" value={f.walking_distance} onChange={set('walking_distance')} error={errors.walking_distance} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="stress" className="label mb-0">Stress today</label>
            <span className="text-sm text-ink-3"><span className="num font-semibold text-ink">{f.stress_level}</span>/10</span>
          </div>
          <div className="tile flex items-center gap-4 px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.span key={mood.emoji} initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="text-3xl leading-none" aria-hidden>
                {mood.emoji}
              </motion.span>
            </AnimatePresence>
            <div className="min-w-0 flex-1">
              <input id="stress" type="range" min={1} max={10} step={1} value={f.stress_level} onChange={set('stress_level')} className="w-full" aria-valuetext={`${f.stress_level} of 10, ${mood.label}`} />
              <div className="flex justify-between text-[0.7rem] text-ink-4"><span>Calm</span><span className="font-medium text-ink-2">{mood.label}</span><span>Very high</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Resting heart rate" icon={HeartPulse} type="number" inputMode="numeric" min={25} max={230} placeholder="72 bpm" value={f.heart_rate} onChange={set('heart_rate')} error={errors.heart_rate} />
          <Input label="Weight (kg)" icon={Scale} type="number" inputMode="decimal" step="0.1" min={2} max={400} placeholder="68" value={f.weight_kg} onChange={set('weight_kg')} error={errors.weight_kg} />
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          <Input label="Height (cm)" icon={Ruler} type="number" inputMode="numeric" min={50} max={250} placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} error={errors.height} />
          <div className={cn('tile flex h-12 items-center justify-between px-4', !bmi && 'opacity-70')}>
            <span className="text-xs font-medium text-ink-3">BMI</span>
            <span className="text-right leading-tight">
              <span className="num block font-semibold text-ink">{bmi ?? '—'}</span>
              {band && <span className={cn('block text-[0.65rem] font-medium', band.cls)}>{band.label}</span>}
            </span>
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink-4">Height stays on this device — we only save the BMI.</p>

        <div>
          <label htmlFor="wb-notes" className="label">Notes <span className="font-normal text-ink-4">(optional)</span></label>
          <textarea id="wb-notes" className="input min-h-[80px]" maxLength={300} placeholder="Anything worth remembering — a fall, a great walk, a bad night…" value={f.notes} onChange={set('notes')} />
        </div>

        <Button variant="brand" type="submit" loading={save.isPending} className="w-full">{existing ? 'Update this day' : 'Save check-in'}</Button>
      </form>
    </Card>
  )
}
