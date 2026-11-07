import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from '../../components/ui/Button'
import { cn, errorMessage } from '../../lib/utils'

/**
 * Small "Field Notes" building blocks shared by the signed-in patient screens.
 * One card level only: a Section is a card; what goes inside uses hairlines, not more boxes.
 */

/** Card section with a mono kicker, a plain h2 title and an optional action on the right. */
export function Section({ id, kicker, title, description, action, icon: Icon, className, bodyClassName, children, as: As = 'section', labelledBy }) {
  const headingId = labelledBy || (id ? `${id}-title` : undefined)
  return (
    <As id={id} aria-labelledby={title ? headingId : undefined} className={cn('card scroll-mt-24 p-5 sm:p-6', className)}>
      {(title || action || kicker) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-teal-700 ring-1 ring-inset ring-line">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {kicker && <p className="kicker">{kicker}</p>}
              {title && <h2 id={headingId} className="text-[1.125rem] font-semibold leading-snug">{title}</h2>}
              {description && <p className="mt-1 max-w-prose text-[0.9375rem] text-ink-3">{description}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </As>
  )
}

/** A measured value: mono label, tabular number, unit and an optional hint. */
export function Readout({ label, value, unit, hint, tone, className, size = 'md' }) {
  const sizes = { sm: 'text-[1.25rem]', md: 'text-[1.75rem]', lg: 'text-[2.5rem]' }
  return (
    <div className={cn('min-w-0', className)}>
      <p className="kicker truncate">{label}</p>
      <p className={cn('mt-1.5 flex items-baseline gap-1 leading-none', sizes[size])}>
        <span className={cn('num text-ink', tone)}>{value ?? '—'}</span>
        {unit && value != null && value !== '—' && <span className="font-mono text-[0.8125rem] font-normal text-ink-3">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[0.8125rem] text-ink-3">{hint}</p>}
    </div>
  )
}

/** Empty state: one line of explanation and a verb + object action. */
export function Empty({ icon: Icon, title, text, action, className }) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-5 py-6 sm:flex-row sm:items-center', className)}>
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream text-ink-3">
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-ink">{title}</p>}
        {text && <p className="text-[0.9375rem] text-ink-3">{text}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Inline error with a retry action. */
export function InlineError({ error, onRetry, className, fallback = 'We couldn’t load this right now.' }) {
  return (
    <div role="alert" className={cn('flex flex-col items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3.5 sm:flex-row sm:items-center', className)}>
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" strokeWidth={1.8} aria-hidden />
      <p className="min-w-0 flex-1 text-[0.9375rem] text-rose-600">{errorMessage(error, fallback)}</p>
      {onRetry && <Button variant="outline" size="md" icon={RefreshCw} onClick={() => onRetry()}>Try again</Button>}
    </div>
  )
}

/** Skeleton list rows. */
export function SkeletonRows({ rows = 3, className, rowClassName = 'h-14' }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className={cn('skeleton', rowClassName)} />)}
    </div>
  )
}

/** Mono sub-heading used inside a section. */
export function SubLabel({ children, className, as: As = 'p' }) {
  return <As className={cn('kicker mb-3', className)}>{children}</As>
}

/** Thin horizontal meter 0–100. */
export function Meter({ value, color = '#234A38', className, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-cream', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v}%`, background: color }} />
    </div>
  )
}
