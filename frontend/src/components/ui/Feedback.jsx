import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { cn, errorMessage } from '../../lib/utils'
import Button from './Button'

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />
}

export function Spinner({ className, label }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-ink-3', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-teal-500" /> {label}
    </div>
  )
}

/** Friendly empty state with an illustrated blob icon. */
export function EmptyState({ icon: Icon, title, text, action, className, tone = 'teal' }) {
  const tones = { teal: 'from-teal-100 to-teal-50 text-teal-700', apricot: 'from-apricot-100 to-apricot-50 text-apricot-600', lilac: 'from-cream to-paper text-ink-2', sky: 'from-teal-50 to-paper text-teal-700' }
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className={cn('relative mb-5 grid h-16 w-16 place-items-center rounded-[1.6rem] bg-gradient-to-br shadow-inset', tones[tone])}>
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </div>
      )}
      <h4 className="text-lg font-semibold">{title}</h4>
      {text && <p className="mt-1.5 max-w-sm text-sm text-ink-3 text-pretty">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50/60 px-6 py-10 text-center', className)}>
      <AlertTriangle className="h-6 w-6 text-rose-500" />
      <p className="max-w-sm text-sm text-rose-600">{errorMessage(error, 'We couldn’t load this right now.')}</p>
      {onRetry && <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  )
}

/** Inline notice banner. tone: info | warn | danger | success */
export function Notice({ tone = 'info', icon: Icon, title, children, className, action }) {
  const tones = {
    info: 'border-line bg-cream/60 text-ink-2',
    warn: 'border-butter-100 bg-butter-50 text-[#7A5F18]',
    danger: 'border-rose-100 bg-rose-50 text-rose-600',
    success: 'border-teal-100 bg-teal-50 text-teal-700',
    lilac: 'border-line bg-cream/60 text-ink-2',
  }
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
