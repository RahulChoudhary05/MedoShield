import { cn } from '../../lib/utils'

export function Card({ className, children, pad = true, as: As = 'div', ...rest }) {
  return (
    <As className={cn('card', pad && 'card-pad', className)} {...rest}>
      {children}
    </As>
  )
}

/** Card header: title (+ optional icon, subtitle) on the left, actions on the right. */
export function CardHeader({ icon: Icon, title, subtitle, action, tone = 'teal', className }) {
  const tones = {
    teal: 'icon-teal text-white shadow-glow', apricot: 'icon-coral text-white shadow-glow-apricot', lilac: 'icon-violet text-white shadow-glow-violet',
    sky: 'icon-sky text-white', butter: 'icon-sun text-white', rose: 'icon-coral text-white', ink: 'bg-cream text-ink-2',
  }
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', tones[tone])}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[1.05rem] font-semibold">{title}</h3>
          {subtitle && <p className="truncate text-sm text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default Card
