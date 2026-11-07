import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

/** id of the help/error line for a control id — wire it to aria-describedby. */
export const describedBy = (id) => (id ? `${id}-desc` : undefined)

/**
 * Label + control + help/error. Pass the control as children, or use Input/Textarea/Select below.
 * Custom children can point `aria-describedby` at `describedBy(htmlFor)` (or pass `descId`).
 */
export function Field({ label, help, error, className, children, htmlFor, optional, descId }) {
  const msgId = descId || describedBy(htmlFor)
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label text-[0.875rem]">
          {label} {optional && <span className="font-normal text-ink-3">(optional)</span>}
        </label>
      )}
      {children}
      {error
        ? <p id={msgId} className="error-text text-[0.8125rem] text-rose-600" role="alert">{error}</p>
        : help ? <p id={msgId} className="help text-[0.8125rem]">{help}</p> : null}
    </div>
  )
}

const aria = (id, error, help, own) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': [own, error || help ? describedBy(id) : null].filter(Boolean).join(' ') || undefined,
})

export const Input = forwardRef(function Input({ label, help, error, className, wrapClass, optional, icon: Icon, id: idProp, 'aria-describedby': own, ...rest }, ref) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <div className="relative">
        {Icon && <Icon aria-hidden strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />}
        <input id={id} ref={ref} {...aria(id, error, help, own)} className={cn('input', Icon && 'pl-10', error && 'input-error', className)} {...rest} />
      </div>
    </Field>
  )
})

export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', help, error, wrapClass, id: idProp, 'aria-describedby': own, ...rest }, ref) {
  const auto = useId()
  const id = idProp || auto
  const [show, setShow] = useState(false)
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass}>
      <div className="relative">
        <input id={id} ref={ref} type={show ? 'text' : 'password'} {...aria(id, error, help, own)} className={cn('input pr-12', error && 'input-error')} {...rest} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-ink-3 transition-colors duration-150 hover:text-ink"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          aria-controls={id}
        >
          {show ? <EyeOff aria-hidden className="h-4 w-4" strokeWidth={1.8} /> : <Eye aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
        </button>
      </div>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, help, error, className, wrapClass, optional, id: idProp, 'aria-describedby': own, ...rest }, ref) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <textarea id={id} ref={ref} {...aria(id, error, help, own)} className={cn('input', error && 'input-error', className)} {...rest} />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, help, error, className, wrapClass, children, optional, id: idProp, 'aria-describedby': own, ...rest }, ref) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field label={label} help={help} error={error} htmlFor={id} className={wrapClass} optional={optional}>
      <select id={id} ref={ref} {...aria(id, error, help, own)} className={cn('input', error && 'input-error', className)} {...rest}>
        {children}
      </select>
    </Field>
  )
})

/** Password strength meter matching the backend policy. */
export function PasswordStrength({ value = '' }) {
  const checks = [
    { ok: value.length >= 10, label: '10+ characters' },
    { ok: /[a-z]/.test(value) && /[A-Z]/.test(value), label: 'Upper and lower case' },
    { ok: /\d/.test(value), label: 'A number' },
    { ok: /[^A-Za-z0-9]/.test(value), label: 'A symbol' },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-line', 'bg-rose-400', 'bg-butter-300', 'bg-butter-400', 'bg-teal-500']
  const words = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-valuetext={words[score]}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i < score ? colors[score] : 'bg-line')} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li key={c.label} className={cn('flex items-center gap-1.5 text-[0.8125rem] transition-colors', c.ok ? 'text-teal-700' : 'text-ink-3')}>
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', c.ok ? 'bg-teal-500' : 'bg-line')} /> {c.label}
            <span className="sr-only">{c.ok ? '(met)' : '(not met)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
