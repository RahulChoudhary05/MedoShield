import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, PlayCircle, Stethoscope, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '../../features/auth/AuthLayout'
import Button from '../../components/ui/Button'
import Segmented from '../../components/ui/Segmented'
import { Input, PasswordInput } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { homeFor, useAuth } from '../../store/auth'
import { errorMessage } from '../../lib/utils'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD
const DEMO = { patient: 'demo.patient@medoshield.dev', doctor: 'sarah.johnson@medoshield.dev' }

export default function Login() {
  const [role, setRole] = useState('patient')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuth((s) => s.setSession)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit(values, asRole = role) {
    setError('')
    try {
      const session = await api.auth.login({ ...values, role: asRole })
      setSession(session)
      toast.success(`Welcome back, ${session.user.first_name || 'there'}!`)
      const from = location.state?.from
      navigate(from && from.startsWith(homeFor(session.role)) ? from : homeFor(session.role), { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Could not sign you in.'))
    }
  }

  async function demo(asRole) {
    setRole(asRole)
    setValue('email', DEMO[asRole])
    setValue('password', DEMO_PASSWORD)
    await onSubmit({ email: DEMO[asRole], password: DEMO_PASSWORD }, asRole)
  }

  return (
    <AuthLayout variant={role}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[2.4rem] font-semibold leading-tight tracking-tight">Welcome <span className="serif-accent text-teal-600">back</span></h1>
        <p className="mt-2 text-ink-3">Sign in to continue your monitoring.</p>

        <Segmented className="mt-7 w-full [&>button]:flex-1 [&>button]:justify-center" value={role} onChange={setRole}
          options={[{ value: 'patient', label: 'Patient', icon: UserRound }, { value: 'doctor', label: 'Clinician', icon: Stethoscope }]} />

        <form onSubmit={handleSubmit((v) => onSubmit(v))} className="mt-6 space-y-4" noValidate>
          <Input label="Email" type="email" autoComplete="email" icon={Mail} placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
          <PasswordInput autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>
            Sign in as {role === 'doctor' ? 'clinician' : 'patient'}
          </Button>
        </form>

        {DEMO_PASSWORD && (
          <div className="mt-6 rounded-3xl border border-dashed border-teal-200 bg-teal-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-800"><PlayCircle className="h-4 w-4" /> Explore with demo data</p>
            <p className="mt-1 text-xs text-teal-700/80">Pre-filled accounts with 5 weeks of synthetic movement data.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" icon={UserRound} onClick={() => demo('patient')} disabled={isSubmitting}>Demo patient</Button>
              <Button type="button" variant="outline" size="sm" icon={Stethoscope} onClick={() => demo('doctor')} disabled={isSubmitting}>Demo doctor</Button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-ink-3">
          New here?{' '}
          {role === 'doctor'
            ? <Link to="/join/doctor" className="font-semibold text-teal-700 hover:underline">Join as a clinician</Link>
            : <Link to="/register" className="font-semibold text-teal-700 hover:underline">Create a patient account</Link>}
        </p>
      </motion.div>
    </AuthLayout>
  )
}
