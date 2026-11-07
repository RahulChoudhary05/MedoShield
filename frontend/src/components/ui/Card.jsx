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
    teal: 'icon-teal', apricot: 'icon-coral', lilac: 'icon-violet', sky: 'icon-sky', butter: 'icon-sun', rose: 'icon-coral', ink: 'icon-violet',
  }
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tones[tone] || tones.teal)}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">{title}</h3>
          {subtitle && <p className="truncate text-sm text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default Card
