import { cn, riskOf } from '../../lib/utils'

/** Tonal badge: rounded-md, 13px, colour carries meaning only. */
const TONES = {
  teal: 'bg-teal-50 text-teal-800 ring-teal-100',
  apricot: 'bg-apricot-50 text-apricot-600 ring-apricot-100',
  lilac: 'bg-cream text-ink-3 ring-line',
  sky: 'bg-sky-50 text-sky-500 ring-sky-100',
  butter: 'bg-butter-50 text-ink-2 ring-butter-200',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  ink: 'bg-cream text-ink-2 ring-line',
  dark: 'bg-ink text-paper ring-ink',
}

export function Badge({ tone = 'ink', dot = false, className, children }) {
  return (
    <span className={cn('badge whitespace-nowrap ring-1 ring-inset', TONES[tone] || TONES.ink, className)}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Canonical risk colours (DESIGN.md hex) — for SVG/chart strokes and dots. */
export const RISK_HEX = { LOW: '#1E8A52', MEDIUM: '#C98A12', HIGH: '#C93A33', CALIBRATING: '#6B778B', UNKNOWN: '#A9B2C1' }

const RISK_CLS = {
  LOW: 'bg-mint-50 text-mint-600 ring-mint-100',
  MEDIUM: 'bg-butter-50 text-ink-2 ring-butter-200',
  HIGH: 'bg-rose-50 text-rose-600 ring-rose-100',
  CALIBRATING: 'bg-cream text-ink-2 ring-line',
  UNKNOWN: 'bg-cream text-ink-3 ring-line',
}

/** Normalise any backend risk level to LOW | MEDIUM | HIGH | CALIBRATING | UNKNOWN. */
export function riskKey(level) {
  if (level === 'BASELINE_LEARNING') return 'CALIBRATING'
  return RISK_CLS[level] ? level : 'UNKNOWN'
}

/**
 * Risk badge used everywhere: LOW | MEDIUM | HIGH | CALIBRATING | UNKNOWN.
 * `pulse` keeps its signature but renders a calm static halo on HIGH (no infinite loop).
 */
export function RiskBadge({ level, short = false, className, pulse = false }) {
  const r = riskOf(level)
  const k = riskKey(level)
  return (
    <span className={cn('badge whitespace-nowrap ring-1 ring-inset', RISK_CLS[k], className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', pulse && k === 'HIGH' && 'ring-[3px] ring-rose-200')} style={{ background: RISK_HEX[k] }} />
      {short ? r.short : r.label}
    </span>
  )
}

export default Badge
