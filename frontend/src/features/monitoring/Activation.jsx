import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const KEY = 'medo:activation-dismissed'
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

/**
 * First-run activation checklist: the few steps that make MedoShield useful, derived from real
 * dashboard data (nothing is asked twice). Disappears once complete; can be dismissed early.
 */
export default function Activation({ data }) {
  const [dismissed, setDismissed] = useState(read)
  const checks = data?.stats?.movement_checks || 0
  const patient = data?.patient || {}
  const steps = [
    { done: checks >= 1, label: 'Take your first movement check', hint: 'Ten seconds in front of your camera.', to: '/app/check' },
    { done: checks >= 5, label: 'Build your personal baseline', hint: `${Math.min(checks, 5)} of 5 checks — after that, results compare with your own normal.`, to: '/app/check' },
    { done: (data?.medications || []).length > 0, label: 'Add your medicines', hint: 'Get reminders and see doses next to your checks.', to: '/app/medications?add=1' },
    { done: (data?.care_team || []).length > 0, label: 'Connect a clinician', hint: 'They see your trend only after you send a request.', to: '/app/care' },
    ...('emergency_contact_phone' in patient
      ? [{ done: !!patient.emergency_contact_phone, label: 'Add an emergency contact', hint: 'The person we alert when you press SOS.', to: '/app/settings#emergency' }]
      : []),
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (dismissed || doneCount === steps.length) return null

  function dismiss() {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <section aria-labelledby="activation-title" className="card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id="activation-title" className="text-[1.125rem] font-semibold leading-snug">Set up MedoShield</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-3"><span className="num">{doneCount}</span> of <span className="num">{steps.length}</span> done</p>
        </div>
        <button type="button" onClick={dismiss} className="-mr-2 -mt-1 grid h-11 w-11 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-cream hover:text-ink" aria-label="Hide setup checklist">
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </header>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-cream" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
        <div className="h-full rounded-full bg-teal-600 transition-[width] duration-500 ease-out" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 divide-y divide-line">
        {steps.map((s) => (
          <li key={s.label}>
            <Link to={s.to} className={cn('group flex items-center gap-3 py-3', s.done && 'pointer-events-none')} aria-disabled={s.done || undefined} tabIndex={s.done ? -1 : undefined}>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border', s.done ? 'border-teal-600 bg-teal-600 text-paper' : 'border-line bg-paper')}>
                {s.done && <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block font-medium', s.done ? 'text-ink-3 line-through decoration-ink-4' : 'text-ink')}>{s.label}{s.done && <span className="sr-only"> (done)</span>}</span>
                {!s.done && <span className="block text-[0.875rem] text-ink-3">{s.hint}</span>}
              </span>
              {!s.done && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px] group-hover:text-ink" strokeWidth={1.8} />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
