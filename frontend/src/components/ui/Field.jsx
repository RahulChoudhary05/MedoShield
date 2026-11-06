import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

/** Label + control + help/error. Pass the control as children, or use Input/Textarea/Select below. */
export function Field({ label, help, error, className, children, htmlFor, optional }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label} {optional && <span className="font-normal text-ink-4">(optional)</span>}
        </label>
      )}
      {children}
      {error ? <p className="error-text" role="alert">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, help, error, className, wrapClass, optional, icon: Icon, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />}
        <input id={id} ref={ref} aria-invalid={!!error} className={cn('input', Icon && 'pl-11', error && 'input-error', className)} {...rest} />
      </div>
    </Field>
  )
})

export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', help, error, wrapClass, ...rest }, ref) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass}>
      <div className="relative">
        <input id={id} ref={ref} type={show ? 'text' : 'password'} aria-invalid={!!error} className={cn('input pr-12', error && 'input-error')} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-ink/5" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, help, error, className, wrapClass, optional, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <textarea id={id} ref={ref} aria-invalid={!!error} className={cn('input', error && 'input-error', className)} {...rest} />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, help, error, className, wrapClass, children, optional, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <select id={id} ref={ref} aria-invalid={!!error} className={cn('input', error && 'input-error', className)} {...rest}>
        {children}
      </select>
    </Field>
  )
})

/** Password strength meter matching the backend policy. */
export function PasswordStrength({ value = '' }) {
  const checks = [
    { ok: value.length >= 10, label: '10+ characters' },
    { ok: /[a-z]/.test(value) && /[A-Z]/.test(value), label: 'Upper & lower case' },
    { ok: /\d/.test(value), label: 'A number' },
    { ok: /[^A-Za-z0-9]/.test(value), label: 'A symbol' },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-line', 'bg-rose-400', 'bg-apricot-300', 'bg-butter-300', 'bg-teal-400']
  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i < score ? colors[score] : 'bg-line')} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li key={c.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', c.ok ? 'text-teal-600' : 'text-ink-4')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', c.ok ? 'bg-teal-500' : 'bg-line')} /> {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
