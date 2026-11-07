import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HeartHandshake, Mail, Phone, Save, Siren, Stethoscope, UserRound } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { Input, Select, Textarea } from '../../../components/ui/Field'
import { api } from '../../../lib/api'
import { errorMessage } from '../../../lib/utils'
import { useAuth } from '../../../store/auth'
import { TagInput, todayISO } from '../shared'
import { Section } from '../kit'

const NAME_RX = /^[\p{L}\p{N}_ .,'-]+$/u
const PHONE_RX = /^\+?[0-9 ()-]{7,20}$/

/** Shared save mutation: PATCH /patients/me then refresh the auth store + cache. */
function useSaveProfile(successMsg) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.patient.update(body),
    onSuccess: (updated) => {
      useAuth.getState().setUser(updated)
      qc.setQueryData(['patient', 'me'], updated)
      qc.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      toast.success(successMsg)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
}

function SaveBar({ dirty, loading }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
      {dirty && <span className="font-mono text-[0.8125rem] text-ink-3" aria-live="polite">Unsaved changes</span>}
      <Button variant="primary" type="submit" icon={Save} loading={loading} disabled={!dirty}>Save changes</Button>
    </div>
  )
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export function ProfileForm({ me }) {
  const init = { first_name: me.first_name || '', last_name: me.last_name || '', date_of_birth: me.date_of_birth?.slice(0, 10) || '', gender: me.gender || '', phone: me.phone || '' }
  const [f, setF] = useState(init)
  const [base, setBase] = useState(init)
  const [errors, setErrors] = useState({})
  const save = useSaveProfile('Profile updated')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    const errs = {}
    for (const k of ['first_name', 'last_name']) {
      const v = f[k].trim()
      if (!v) errs[k] = 'Required'
      else if (v.length > 60 || !NAME_RX.test(v)) errs[k] = 'Letters, spaces and . , \' - only'
    }
    if (f.date_of_birth && (f.date_of_birth > todayISO() || f.date_of_birth < '1900-01-01')) errs.date_of_birth = 'Enter a valid date of birth'
    if (f.phone.trim() && !PHONE_RX.test(f.phone.trim())) errs.phone = 'Use digits, spaces, + ( ) - (7–20 characters)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const body = { first_name: f.first_name.trim(), last_name: f.last_name.trim(), date_of_birth: f.date_of_birth || null, gender: f.gender || null, phone: f.phone.trim() || null }
    save.mutate(body, { onSuccess: () => setBase(f) })
  }

  return (
    <Section id="profile" icon={UserRound} kicker="How you appear to your care team" title="Profile">
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={f.first_name} onChange={set('first_name')} maxLength={60} error={errors.first_name} autoComplete="given-name" />
          <Input label="Last name" value={f.last_name} onChange={set('last_name')} maxLength={60} error={errors.last_name} autoComplete="family-name" />
          <Input label="Date of birth" type="date" max={todayISO()} min="1900-01-01" value={f.date_of_birth} onChange={set('date_of_birth')} error={errors.date_of_birth} />
          <Select label="Gender" value={f.gender} onChange={set('gender')}>
            <option value="">Select…</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="O">Other</option>
            <option value="N">Prefer not to say</option>
          </Select>
          <Input label="Phone" icon={Phone} type="tel" value={f.phone} onChange={set('phone')} maxLength={20} placeholder="+91 98765 43210" error={errors.phone} autoComplete="tel" />
          <Input label="Email" icon={Mail} value={me.email || ''} readOnly disabled help="Contact support to change your sign-in email." />
        </div>
        <SaveBar dirty={!same(f, base)} loading={save.isPending} />
      </form>
    </Section>
  )
}

export function HealthForm({ me }) {
  const init = { conditions: me.conditions || [], allergies: me.allergies || [], current_medications: me.current_medications || [], medical_history: me.medical_history || '' }
  const [f, setF] = useState(init)
  const [base, setBase] = useState(init)
  const save = useSaveProfile('Health profile saved')
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  function submit(e) {
    e.preventDefault()
    const body = { ...f, medical_history: f.medical_history.trim().slice(0, 1500) }
    save.mutate(body, { onSuccess: () => setBase(f) })
  }

  return (
    <Section id="health" icon={Stethoscope} kicker="Helps Medo and medicine guidance keep you safe" title="Health profile">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TagInput label="Conditions" value={f.conditions} onChange={set('conditions')} max={20} maxLength={60} placeholder="e.g. Parkinson’s disease" tone="teal" />
        <TagInput label="Allergies" value={f.allergies} onChange={set('allergies')} max={20} maxLength={60} placeholder="e.g. Penicillin" tone="apricot" help="We screen medicine suggestions against these." />
        <TagInput label="Other medicines you take" value={f.current_medications} onChange={set('current_medications')} max={30} maxLength={80} placeholder="e.g. Vitamin D" tone="teal" />
        <Textarea label="Medical history" optional value={f.medical_history} onChange={(e) => set('medical_history')(e.target.value)} maxLength={1500} placeholder="Past surgeries, diagnoses, family history — anything your doctor should know." help={`${f.medical_history.length}/1500`} />
        <SaveBar dirty={!same(f, base)} loading={save.isPending} />
      </form>
    </Section>
  )
}

export function EmergencyForm({ me }) {
  const init = { emergency_contact_name: me.emergency_contact_name || '', emergency_contact_phone: me.emergency_contact_phone || '' }
  const [f, setF] = useState(init)
  const [base, setBase] = useState(init)
  const [errors, setErrors] = useState({})
  const save = useSaveProfile('Emergency contact saved')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    const errs = {}
    if (f.emergency_contact_phone.trim() && !PHONE_RX.test(f.emergency_contact_phone.trim())) errs.emergency_contact_phone = 'Use digits, spaces, + ( ) - (7–20 characters)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    save.mutate(
      { emergency_contact_name: f.emergency_contact_name.trim().slice(0, 80) || null, emergency_contact_phone: f.emergency_contact_phone.trim() || null },
      { onSuccess: () => setBase(f) },
    )
  }

  const missing = !base.emergency_contact_phone
  return (
    <Section id="emergency" icon={HeartHandshake} kicker="The person we alert when you use SOS" title="Emergency contact">
      <p className={missing ? 'mb-4 flex items-start gap-2.5 rounded-xl border border-butter-100 bg-butter-50 px-4 py-3 text-[0.9375rem] text-[#6E5716]' : 'mb-4 flex items-start gap-2.5 text-[0.9375rem] text-ink-3'}>
        <Siren className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
        {missing
          ? 'No contact saved yet. When you hold the SOS button, we text this person your location and alert your care team.'
          : 'When you hold the SOS button, we text this person your location and alert your care team.'}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={f.emergency_contact_name} onChange={set('emergency_contact_name')} maxLength={80} placeholder="e.g. Priya (daughter)" />
          <Input label="Mobile number" icon={Phone} type="tel" value={f.emergency_contact_phone} onChange={set('emergency_contact_phone')} maxLength={20} placeholder="+91 98765 43210" error={errors.emergency_contact_phone} help="Include the country code so SMS can reach them." />
        </div>
        <SaveBar dirty={!same(f, base)} loading={save.isPending} />
      </form>
    </Section>
  )
}
