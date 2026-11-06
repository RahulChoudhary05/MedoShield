import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, BadgeCheck, Building2, IdCard, IndianRupee, Mail } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '../../features/auth/AuthLayout'
import Button from '../../components/ui/Button'
import { Input, PasswordInput, PasswordStrength, Select } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { errorMessage } from '../../lib/utils'
import { useState } from 'react'

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
    <AuthLayout variant="doctor">
      <h1 className="text-[2.4rem] font-semibold leading-tight tracking-tight">Join as a <span className="serif-accent text-teal-600">clinician</span></h1>
      <p className="mt-2 text-ink-3">Monitor patients between visits with objective motion biomarkers.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
          <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
        </div>
        <Input label="Work email" type="email" icon={Mail} autoComplete="email" error={errors.email?.message} {...register('email')} />
        <div>
          <PasswordInput autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          <PasswordStrength value={watch('password') || ''} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Medical registration no." icon={IdCard} placeholder="MCI-12345" error={errors.license_number?.message} {...register('license_number')} />
          <Select label="Specialty" error={errors.specialty?.message} {...register('specialty')}>
            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Clinic / hospital" optional icon={Building2} {...register('clinic_name')} />
          <Input label="Consultation fee" type="number" min="0" icon={IndianRupee} error={errors.appointment_fee?.message} {...register('appointment_fee')} />
        </div>
        <Notice tone="lilac" icon={BadgeCheck}>Your registration number is verified by our team before a "verified" badge appears to patients.</Notice>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>Create clinician account</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-3">Already registered? <Link to="/login" className="font-semibold text-teal-700 hover:underline">Sign in</Link></p>
    </AuthLayout>
  )
}
