import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Mail } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import AuthShell, { AuthHeading } from '../../features/auth/AuthShell'
import { FormError, PasswordChecklist, PasswordField, SelectField, TextField } from '../../features/auth/AuthFields'
import Button from '../../components/ui/Button'
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
const EASE = [0.2, 0.8, 0.2, 1]

const PROMISES = [
  'Movement checks run on your device; only body-landmark numbers are uploaded.',
  'Doctors see your data only after you request them and they accept.',
  'You can download or permanently delete your data any time in Settings.',
  'MedoShield supports, but never replaces, professional medical care.',
]

export default function Register() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const stepHeading = useRef(null)
  const firstRender = useRef(true)
  const { register, handleSubmit, trigger, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { gender: '', accept_terms: false },
  })
  const password = watch('password') || ''

  // Move focus to the new step's heading so keyboard and screen-reader users keep their place.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    stepHeading.current?.focus()
  }, [step])

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
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#234A38', '#DE9068', '#B5AC9F', '#E6D293'], disableForReducedMotion: true })
      toast.success('Your account is ready!')
      navigate('/app/check', { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Could not create your account.'))
    }
  }

  return (
    <AuthShell variant="patient">
      <AuthHeading kicker="Create a patient account" lede="Free for patients. Takes under a minute.">
        Start caring <span className="serif-accent">smarter</span>
      </AuthHeading>

      <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Sign-up progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <span className={cn('block h-[3px] rounded-full transition-colors duration-300', i <= step ? 'bg-teal-700' : 'bg-line')} aria-hidden="true" />
            <span className={cn('mt-2 flex items-center gap-1.5 font-mono text-[0.8125rem]', i === step ? 'text-ink' : i < step ? 'text-teal-700' : 'text-ink-3')}>
              {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" /> : <span aria-hidden="true">{i + 1}.</span>}
              {s}
              <span className="sr-only">{i < step ? ' (done)' : i === step ? ' (current)' : ''}</span>
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate aria-busy={isSubmitting}>
        <h2 ref={stepHeading} tabIndex={-1} className="text-[1.0625rem] font-medium text-ink focus:outline-none">
          Step {step + 1} of {STEPS.length}: {STEPS[step].toLowerCase()}
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="mt-5 space-y-5"
          >
            {step === 0 && (
              <>
                <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
                  <TextField label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register('first_name')} />
                  <TextField label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register('last_name')} />
                </div>
                <TextField label="Email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} icon={Mail} autoComplete="email" error={errors.email?.message} {...register('email')} />
                <PasswordField autoComplete="new-password" error={errors.password?.message} describedByExtra="reg-pw-rules" {...register('password')}>
                  <PasswordChecklist id="reg-pw-rules" value={password} />
                </PasswordField>
              </>
            )}
            {step === 1 && (
              <>
                <TextField
                  label="Date of birth"
                  type="date"
                  optional
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  help="Helps us use age-appropriate reference ranges."
                  error={errors.date_of_birth?.message}
                  {...register('date_of_birth')}
                />
                <SelectField label="Gender" optional autoComplete="sex" {...register('gender')}>
                  <option value="">Prefer not to say</option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="O">Other</option>
                </SelectField>
              </>
            )}
            {step === 2 && (
              <>
                <ul className="divide-y divide-line border-y border-line">
                  {PROMISES.map((t, i) => (
                    <li key={t} className="flex gap-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink-2">
                      <span className="pt-0.5 font-mono text-[0.8125rem] text-ink-3" aria-hidden="true">0{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 rounded"
                      aria-invalid={errors.accept_terms ? true : undefined}
                      aria-describedby={errors.accept_terms ? 'accept-terms-error' : undefined}
                      {...register('accept_terms')}
                    />
                    <span>
                      I have read the{' '}
                      <Link to="/terms" target="_blank" className="link font-medium">terms</Link> and{' '}
                      <Link to="/privacy" target="_blank" className="link font-medium">privacy policy</Link>, and I agree to how MedoShield handles my health data.
                    </span>
                  </label>
                  {errors.accept_terms && <p id="accept-terms-error" className="mt-1.5 text-[0.8125rem] font-medium text-rose-500">{errors.accept_terms.message}</p>}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <div className="mt-5"><FormError>{error}</FormError></div>}

        <div className="mt-7 flex gap-3">
          {step > 0 && <Button type="button" variant="outline" size="lg" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button type="button" variant="primary" size="lg" className="flex-1" iconRight={ArrowRight} onClick={next}>Continue</Button>
            : <Button type="submit" variant="brand" size="lg" className="flex-1" loading={isSubmitting} iconRight={ArrowRight}>Create my account</Button>}
        </div>
      </form>

      <p className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-[0.9375rem] text-ink-3">
        <span>Already have an account? <Link to="/login" className="link font-medium">Sign in</Link></span>
        <Link to="/join/doctor" className="link font-medium">I’m a clinician</Link>
      </p>
    </AuthShell>
  )
}
