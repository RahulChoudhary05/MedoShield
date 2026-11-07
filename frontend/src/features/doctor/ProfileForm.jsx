import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Building2, Save } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, errorMessage } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Head } from './shared'
import { Input, Textarea } from '../../components/ui/Field'

const fromProfile = (p = {}) => ({
  clinic_name: p.clinic_name || '',
  appointment_fee: p.appointment_fee != null ? String(p.appointment_fee) : '0',
  experience_years: p.experience_years != null ? String(p.experience_years) : '',
  bio: p.bio || '',
  accepting_patients: p.accepting_patients !== false,
})

export function Switch({ checked, onChange, label, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-cream/40 px-4 py-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[0.9375rem] font-medium text-ink">{label}</label>
        {description && <p id={`${id}-desc`} className="mt-0.5 text-[0.875rem] text-ink-3 text-pretty">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className="group relative -my-2 -mr-1 grid h-11 w-14 shrink-0 place-items-center rounded-lg"
      >
        <span aria-hidden className={cn('relative inline-flex h-6 w-11 items-center rounded-full ring-1 ring-inset transition-colors duration-200', checked ? 'bg-teal-700 ring-teal-700' : 'bg-line ring-ink-4/30')}>
          <motion.span
            className="absolute left-0.5 h-5 w-5 rounded-full bg-paper shadow-soft"
            animate={{ x: checked ? 20 : 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </span>
      </button>
    </div>
  )
}

export default function ProfileForm({ profile }) {
  const qc = useQueryClient()
  const initial = useMemo(() => fromProfile(profile), [profile])
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  useEffect(() => {
    setForm(initial)
  }, [initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const save = useMutation({
    mutationFn: (body) => api.doctors.updateProfile(body),
    onSuccess: (updated) => {
      useAuth.getState().setUser(updated)
      qc.setQueryData(['doctor', 'profile'], updated)
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    const fee = Number(form.appointment_fee)
    if (form.appointment_fee === '' || isNaN(fee) || fee < 0 || fee > 100000) errs.appointment_fee = 'Enter a fee between ₹0 and ₹1,00,000'
    const exp = form.experience_years === '' ? null : Number(form.experience_years)
    if (exp != null && (!Number.isInteger(exp) || exp < 0 || exp > 70)) errs.experience_years = 'Whole years between 0 and 70'
    if (form.clinic_name.length > 120) errs.clinic_name = 'Keep it under 120 characters'
    if (form.bio.length > 600) errs.bio = 'Keep it under 600 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const next = { clinic_name: form.clinic_name.trim(), appointment_fee: fee, experience_years: exp, bio: form.bio.trim(), accepting_patients: form.accepting_patients }
    const prev = { clinic_name: initial.clinic_name, appointment_fee: Number(initial.appointment_fee), experience_years: initial.experience_years === '' ? null : Number(initial.experience_years), bio: initial.bio, accepting_patients: initial.accepting_patients }
    const body = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== prev[k]))
    if (!Object.keys(body).length) return
    save.mutate(body)
  }

  return (
    <Card as="form" onSubmit={submit} noValidate>
      <Head icon={Building2} title="Practice details" subtitle="Shown to patients in the MedoShield directory" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Clinic or hospital" value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} maxLength={120} placeholder="e.g. Lakeside Neuro Clinic" error={errors.clinic_name} wrapClass="sm:col-span-2" />
        <Input label="Consultation fee (₹)" type="number" inputMode="decimal" min={0} max={100000} step="50" value={form.appointment_fee} onChange={(e) => set('appointment_fee', e.target.value)} error={errors.appointment_fee} />
        <Input label="Years of experience" type="number" inputMode="numeric" min={0} max={70} value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} error={errors.experience_years} />
        <Textarea
          label="Short bio"
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="Your clinical focus, languages you consult in, and how you like to work with patients between visits."
          help={`${form.bio.length}/600`}
          error={errors.bio}
          wrapClass="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <Switch
            id="accepting-patients"
            checked={form.accepting_patients}
            onChange={(v) => set('accepting_patients', v)}
            label="Accepting new patients"
            description={form.accepting_patients ? 'Patients can send you appointment requests.' : 'You’re hidden from new requests. Existing patients are unaffected.'}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {dirty && <Button type="button" variant="ghost" onClick={() => { setForm(initial); setErrors({}) }}>Discard changes</Button>}
        <Button type="submit" variant="primary" icon={Save} loading={save.isPending} disabled={!dirty}>Save changes</Button>
      </div>
    </Card>
  )
}
