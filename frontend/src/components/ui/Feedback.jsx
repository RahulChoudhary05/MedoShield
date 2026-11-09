import { createElement } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { cn, errorMessage } from '../../lib/utils'
import Button from './Button'

export function Skeleton({ className }) {
  return <div aria-hidden className={cn('skeleton', className)} />
}

export function Spinner({ className, label }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-[0.9375rem] text-ink-3', className)}>
      <Loader2 aria-hidden className="h-5 w-5 animate-spin text-teal-600" strokeWidth={1.8} />
      {label || <span className="sr-only">Loading</span>}
    </div>
  )
}

/**
 * Calm empty state: tonal icon square, one-line explanation, one verb+object action.
 * `headingLevel` (default 3) keeps the outline valid where it's used.
 */
export function EmptyState({ icon: Icon, title, text, action, className, tone = 'teal', headingLevel = 3 }) {
  const tones = {
    teal: 'icon-teal', apricot: 'icon-coral', lilac: 'icon-violet', sky: 'icon-sky', ink: 'icon-violet',
  }
  const level = Math.min(6, Math.max(1, headingLevel))
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className={cn('mb-5 grid h-14 w-14 place-items-center rounded-2xl', tones[tone] || tones.teal)}>
          <Icon aria-hidden className="h-6 w-6" strokeWidth={1.8} />
        </span>
      )}
      {createElement(`h${level}`, { className: 'font-serif text-[1.5rem] font-semibold leading-tight text-ink' }, title)}
      {text && <p className="mt-2 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-3 text-pretty">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Error panel: one-line explanation and a single retry action. */
export function ErrorState({ error, onRetry, className, retryLabel = 'Load again' }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50/60 px-6 py-10 text-center', className)}>
      <AlertTriangle aria-hidden className="h-5 w-5 text-rose-500" strokeWidth={1.8} />
      <p className="max-w-[46ch] text-[0.9375rem] text-rose-600">{errorMessage(error, 'We couldn’t load this right now.')}</p>
      {onRetry && <Button variant="outline" size="md" icon={RefreshCw} onClick={() => onRetry()}>{retryLabel}</Button>}
    </div>
  )
}

/** Inline notice banner. tone: info | warn | danger | success (teal) | lilac */
export function Notice({ tone = 'info', icon: Icon, title, children, className, action }) {
  const tones = {
    info: 'border-line bg-cream/60 text-ink-2',
    lilac: 'border-line bg-cream/60 text-ink-2',
    warn: 'border-butter-100 bg-butter-50 text-ink-2',
    danger: 'border-rose-100 bg-rose-50 text-rose-600',
    success: 'border-teal-100 bg-teal-50 text-teal-800',
    teal: 'border-teal-100 bg-teal-50 text-teal-800',
  }
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[0.9375rem] leading-relaxed', tones[tone] || tones.info, className)}>
      {Icon && <Icon aria-hidden className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.8} />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
