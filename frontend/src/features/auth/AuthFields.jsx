import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff, Stethoscope, UserRound } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Accessible form controls for the auth pages: visible label, inline error wired with
 * aria-invalid + aria-describedby, 16px text, 44px targets.
 */
function Describe({ id, error, help }) {
  if (error) return <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-rose-500">{error}</p>
  if (help) return <p id={`${id}-help`} className="mt-1.5 text-[0.8125rem] text-ink-3">{help}</p>
  return null
}
const describedBy = (id, error, help, extra) =>
  [error ? `${id}-error` : help ? `${id}-help` : null, extra].filter(Boolean).join(' ') || undefined

function Label({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[0.875rem] font-medium text-ink-2">
      {children}
      {optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
    </label>
  )
}

export const TextField = forwardRef(function TextField(
  { label, error, help, optional, icon: Icon, className, wrapClass, describedByExtra, ...rest }, ref,
) {
  const id = useId()
  return (
    <div className={wrapClass}>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" strokeWidth={1.8} aria-hidden="true" />}
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, help, describedByExtra)}
          className={cn('input text-base', Icon && 'pl-10', error && 'input-error', className)}
          {...rest}
        />
      </div>
      <Describe id={id} error={error} help={help} />
    </div>
  )
})

export const SelectField = forwardRef(function SelectField({ label, error, help, optional, children, wrapClass, ...rest }, ref) {
  const id = useId()
  return (
    <div className={wrapClass}>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, help)}
        className={cn('input text-base', error && 'input-error')}
        {...rest}
      >
        {children}
      </select>
      <Describe id={id} error={error} help={help} />
    </div>
  )
})

export const PasswordField = forwardRef(function PasswordField(
  { label = 'Password', error, help, wrapClass, describedByExtra, children, ...rest }, ref,
) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <div className={wrapClass}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, help, describedByExtra)}
          className={cn('input pr-12 text-base', error && 'input-error')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          aria-controls={id}
          className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-ink-3 transition-colors duration-150 hover:text-ink"
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        </button>
      </div>
      <Describe id={id} error={error} help={help} />
      {children}
    </div>
  )
})

/** Password policy checklist that mirrors the backend rules (same checks as the zod schema). */
export function PasswordChecklist({ value = '', id }) {
  const checks = [
    { ok: value.length >= 10, label: '10+ characters' },
    { ok: /[a-z]/.test(value) && /[A-Z]/.test(value), label: 'Upper and lower case' },
    { ok: /\d/.test(value), label: 'A number' },
    { ok: /[^A-Za-z0-9]/.test(value), label: 'A symbol' },
  ]
  const score = checks.filter((c) => c.ok).length
  return (
    <div id={id} className="mt-3">
      <div className="flex gap-1" aria-hidden="true">
        {checks.map((c, i) => (
          <span key={c.label} className={cn('h-[3px] flex-1 rounded-full transition-colors duration-300', i < score ? (score === 4 ? 'bg-teal-600' : 'bg-ink-3') : 'bg-line')} />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <li key={c.label} className={cn('flex items-center gap-2 font-mono text-[0.8125rem] transition-colors', c.ok ? 'text-teal-700' : 'text-ink-3')}>
            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', c.ok ? 'bg-teal-600' : 'bg-line')} />
            {c.label}<span className="sr-only">{c.ok ? ', met' : ', not yet met'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Patient / clinician switch. Native radio inputs so arrow keys and screen readers just work. */
export function RoleToggle({ value, onChange, className }) {
  const name = useId()
  const options = [
    { value: 'patient', label: 'Patient', icon: UserRound },
    { value: 'doctor', label: 'Clinician', icon: Stethoscope },
  ]
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-[0.875rem] font-medium text-ink-2">I am signing in as</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-cream/60 p-1">
        {options.map((o) => {
          const active = value === o.value
          const Icon = o.icon
          return (
            <label
              key={o.value}
              className={cn(
                'relative flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-[0.9375rem] font-medium transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-600',
                active ? 'border border-line bg-paper text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
              <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Inline form-level error (server responses). */
export function FormError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-[0.875rem] text-rose-600">
      {children}
    </p>
  )
}
