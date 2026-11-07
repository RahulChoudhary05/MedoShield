import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Mail, Stethoscope, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import AuthShell, { AuthHeading } from '../../features/auth/AuthShell'
import { FormError, PasswordField, RoleToggle, TextField } from '../../features/auth/AuthFields'
import Button from '../../components/ui/Button'
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
    <AuthShell variant={role}>
      <AuthHeading kicker="Sign in" lede="Continue your monitoring where you left off.">
        Welcome <span className="serif-accent">back</span>
      </AuthHeading>

      <RoleToggle className="mt-8" value={role} onChange={setRole} />

      <form onSubmit={handleSubmit((v) => onSubmit(v))} className="mt-6 space-y-5" noValidate aria-busy={isSubmitting}>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          icon={Mail}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>
          Sign in as {role === 'doctor' ? 'clinician' : 'patient'}
        </Button>
      </form>

      {DEMO_PASSWORD && (
        <section aria-labelledby="demo-heading" className="mt-8 border-t border-line pt-6">
          <h2 id="demo-heading" className="text-[0.9375rem] font-medium text-ink">Explore with demo data</h2>
          <p className="mt-1 text-[0.875rem] text-ink-3">Two pre-filled accounts with five weeks of synthetic movement data.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="lg" className="text-[0.9375rem]" icon={UserRound} onClick={() => demo('patient')} disabled={isSubmitting}>Demo patient</Button>
            <Button type="button" variant="outline" size="lg" className="text-[0.9375rem]" icon={Stethoscope} onClick={() => demo('doctor')} disabled={isSubmitting}>Demo doctor</Button>
          </div>
        </section>
      )}

      <p className="mt-8 text-[0.9375rem] text-ink-3">
        New here?{' '}
        {role === 'doctor'
          ? <Link to="/join/doctor" className="link font-medium">Join as a clinician</Link>
          : <Link to="/register" className="link font-medium">Create a patient account</Link>}
      </p>
    </AuthShell>
  )
}
