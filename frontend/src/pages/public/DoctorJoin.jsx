import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, BadgeCheck, Building2, IdCard, IndianRupee, Mail } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell, { AuthHeading } from '../../features/auth/AuthShell'
import { FormError, PasswordChecklist, PasswordField, SelectField, TextField } from '../../features/auth/AuthFields'
import Button from '../../components/ui/Button'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { errorMessage } from '../../lib/utils'

const SPECIALTIES = ['Neurologist', 'Physiotherapist', 'General Practitioner', 'Cardiologist', 'Psychiatrist', 'Therapist', 'Orthopedist', 'Geriatrician', 'Endocrinologist', 'Physiatrist']

const schema = z.object({
  first_name: z.string().trim().min(1, 'Required').max(60),
  last_name: z.string().trim().min(1, 'Required').max(60),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(10, 'At least 10 characters').regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number').regex(/[^A-Za-z0-9]/, 'Add a symbol'),
  license_number: z.string().trim().min(3, 'Enter your registration number').max(40).regex(/^[A-Za-z0-9\-/]+$/, 'Letters, numbers, - and / only'),
  specialty: z.string().min(2, 'Choose a specialty'),
  clinic_name: z.string().max(120).optional(),
  appointment_fee: z.coerce.number().min(0).max(100000).optional(),
})

function Group({ title, children }) {
  return (
    <fieldset className="space-y-5 border-t border-line pt-5">
      <legend className="float-left mb-1 w-full font-mono text-[0.8125rem] text-ink-3">{title}</legend>
      <div className="clear-left space-y-5">{children}</div>
    </fieldset>
  )
}

export default function DoctorJoin() {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { specialty: 'Neurologist', appointment_fee: 500 } })

  async function onSubmit(v) {
    setError('')
    try {
      const session = await api.auth.registerDoctor({ ...v, clinic_name: v.clinic_name || null, appointment_fee: v.appointment_fee || 0 })
      setSession(session)
      toast.success('Welcome to MedoShield, doctor!')
      navigate('/doctor', { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Could not create your account.'))
    }
  }

  return (
    <AuthShell variant="doctor">
      <AuthHeading kicker="Clinician sign-up" lede="Monitor patients between visits with objective tremor, gait and balance measurements.">
        Join as a <span className="serif-accent">clinician</span>
      </AuthHeading>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-7" noValidate aria-busy={isSubmitting}>
        <Group title="Your account">
          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
            <TextField label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register('first_name')} />
            <TextField label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <TextField label="Work email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} icon={Mail} autoComplete="email" error={errors.email?.message} {...register('email')} />
          <PasswordField autoComplete="new-password" error={errors.password?.message} describedByExtra="doc-pw-rules" {...register('password')}>
            <PasswordChecklist id="doc-pw-rules" value={watch('password') || ''} />
          </PasswordField>
        </Group>

        <Group title="Your practice">
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
            <TextField label="Medical registration no." icon={IdCard} autoCapitalize="characters" spellCheck={false} placeholder="MCI-12345" error={errors.license_number?.message} {...register('license_number')} />
            <SelectField label="Specialty" error={errors.specialty?.message} {...register('specialty')}>
              {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
            </SelectField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
            <TextField label="Clinic / hospital" optional icon={Building2} autoComplete="organization" {...register('clinic_name')} />
            <TextField label="Consultation fee" type="number" inputMode="numeric" min="0" icon={IndianRupee} error={errors.appointment_fee?.message} {...register('appointment_fee')} />
          </div>
          <p className="flex gap-3 rounded-xl border border-line bg-cream/60 px-4 py-3 text-[0.875rem] leading-relaxed text-ink-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden="true" />
            Your registration number is checked by our team before a “verified” badge appears to patients.
          </p>
        </Group>

        <FormError>{error}</FormError>
        <div>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>Create clinician account</Button>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
            By creating an account you agree to the <Link to="/terms" className="link">terms</Link> and <Link to="/privacy" className="link">privacy policy</Link>.
          </p>
        </div>
      </form>

      <p className="mt-8 text-[0.9375rem] text-ink-3">Already registered? <Link to="/login" className="link font-medium">Sign in</Link></p>
    </AuthShell>
  )
}
