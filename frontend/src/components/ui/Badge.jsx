import { cn, riskOf } from '../../lib/utils'

const TONES = {
  teal: 'bg-teal-50 text-teal-700', apricot: 'bg-apricot-50 text-apricot-600', lilac: 'bg-lilac-50 text-lilac-600',
  sky: 'bg-sky-50 text-sky-500', butter: 'bg-butter-50 text-[#9A6410]', rose: 'bg-rose-50 text-rose-600',
  ink: 'bg-ink/[.06] text-ink-2', dark: 'bg-ink text-white',
}

export function Badge({ tone = 'ink', dot = false, className, children }) {
  return (
    <span className={cn('badge', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Risk pill used everywhere: LOW | MEDIUM | HIGH | CALIBRATING | UNKNOWN */
export function RiskBadge({ level, short = false, className, pulse = false }) {
  const r = riskOf(level)
  return (
    <span className={cn('badge ring-1 ring-inset', r.bg, r.text, r.ring, className)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && level === 'HIGH' && <span className="absolute inline-flex h-full w-full animate-pulse2 rounded-full" style={{ background: r.color }} />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
      </span>
      {short ? r.short : r.label}
    </span>
  )
}

export default Badge
