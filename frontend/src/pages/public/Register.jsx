import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import AuthLayout from '../../features/auth/AuthLayout'
import Button from '../../components/ui/Button'
import { Input, PasswordInput, PasswordStrength, Select } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, errorMessage } from '../../lib/utils'

const strong = z.string().min(10, 'At least 10 characters').max(128)
  .regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number').regex(/[^A-Za-z0-9]/, 'Add a symbol')

const schema = z.object({
  first_name: z.string().trim().min(1, 'Required').max(60).regex(/^[\p{L} .,'-]+$/u, 'Letters only'),
  last_name: z.string().trim().min(1, 'Required').max(60).regex(/^[\p{L} .,'-]+$/u, 'Letters only'),
  email: z.string().trim().email('Enter a valid email'),
  password: strong,
  date_of_birth: z.string().optional().refine((v) => !v || (new Date(v) < new Date() && new Date(v) > new Date('1900-01-01')), 'Enter a valid date'),
  gender: z.enum(['', 'M', 'F', 'O', 'N']).optional(),
  accept_terms: z.literal(true, { errorMap: () => ({ message: 'Please accept to continue' }) }),
})

const STEPS = ['Account', 'About you', 'Consent']
const FIELDS = [['first_name', 'last_name', 'email', 'password'], ['date_of_birth', 'gender'], ['accept_terms']]

export default function Register() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const { register, handleSubmit, trigger, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { gender: '', accept_terms: false },
  })
  const password = watch('password') || ''

  async function next() {
    if (await trigger(FIELDS[step])) setStep((s) => s + 1)
  }

  async function onSubmit(v) {
    setError('')
    try {
      const body = { first_name: v.first_name, last_name: v.last_name, email: v.email, password: v.password, accept_terms: true }
      if (v.date_of_birth) body.date_of_birth = v.date_of_birth
      if (v.gender) body.gender = v.gender
      const session = await api.auth.registerPatient(body)
      setSession(session)
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#3A6652', '#D08560', '#B6AAC5', '#ECD99C'] })
      toast.success('Your account is ready!')
      navigate('/app/check', { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Could not create your account.'))
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[2.4rem] font-semibold leading-tight tracking-tight">Start <span className="serif-accent text-teal-600">caring</span> smarter</h1>
      <p className="mt-2 text-ink-3">Free for patients. Takes under a minute.</p>

      <ol className="mt-7 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors', i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-ink text-white' : 'bg-line text-ink-4')}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('hidden text-sm font-medium sm:inline', i === step ? 'text-ink' : 'text-ink-4')}>{s}</span>
            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-teal-300' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7" noValidate>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register('first_name')} />
                  <Input label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register('last_name')} />
                </div>
                <Input label="Email" type="email" icon={Mail} autoComplete="email" error={errors.email?.message} {...register('email')} />
                <div>
                  <PasswordInput autoComplete="new-password" error={errors.password?.message} {...register('password')} />
                  <PasswordStrength value={password} />
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <Input label="Date of birth" type="date" optional max={new Date().toISOString().slice(0, 10)} help="Helps us use age-appropriate reference ranges." error={errors.date_of_birth?.message} {...register('date_of_birth')} />
                <Select label="Gender" optional {...register('gender')}>
                  <option value="">Prefer not to say</option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="O">Other</option>
                </Select>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-3 rounded-3xl border border-line bg-paper p-5 text-sm text-ink-2">
                  {[
                    'Movement checks run on your device; only body-landmark numbers are uploaded.',
                    'Doctors see your data only after you book them and they accept.',
                    'You can download or permanently delete your data any time in Settings.',
                    'MedoShield supports, but never replaces, professional medical care.',
                  ].map((t) => <p key={t} className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {t}</p>)}
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-1 text-sm text-ink-2">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 rounded-md accent-teal-500" {...register('accept_terms')} />
                  I understand and agree to how MedoShield handles my health data.
                </label>
                {errors.accept_terms && <p className="error-text">{errors.accept_terms.message}</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <Notice tone="danger" className="mt-4">{error}</Notice>}

        <div className="mt-6 flex gap-3">
          {step > 0 && <Button type="button" variant="outline" size="lg" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button type="button" variant="primary" size="lg" className="flex-1" iconRight={ArrowRight} onClick={next}>Continue</Button>
            : <Button type="submit" variant="brand" size="lg" className="flex-1" loading={isSubmitting} iconRight={ArrowRight}>Create my account</Button>}
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-ink-3">
        Already have an account? <Link to="/login" className="font-semibold text-teal-700 hover:underline">Sign in</Link>
        <span className="mx-2 text-line">|</span>
        <Link to="/join/doctor" className="font-semibold text-teal-700 hover:underline">I'm a clinician</Link>
      </p>
    </AuthLayout>
  )
}
