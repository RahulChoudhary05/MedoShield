import { motion } from 'framer-motion'
import { cn, initials } from '../../lib/utils'
import { CountUp } from './motion'

/** Circular score gauge (0-100). */
export function ScoreRing({ value, size = 132, stroke = 11, color = '#3A6652', track = '#F0E9DD', label, sub, className }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {value == null ? <span className="num text-3xl text-ink-4">—</span> : <CountUp value={v} className="text-[2rem] font-semibold leading-none" />}
          {label && <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[.14em] text-ink-3">{label}</div>}
          {sub && <div className="text-xs text-ink-4">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

/** Horizontal labelled bar, 0-100. */
export function ScoreBar({ label, value, hint, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const auto = v >= 70 ? '#4A7C64' : v >= 45 ? '#C9A845' : '#B8513F'
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink-2">{label}</span>
        <span className="num text-ink">{value == null ? '—' : Math.round(v)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#F0E9DD]">
        <motion.div className="h-full rounded-full" style={{ background: color || auto }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }} />
      </div>
      {hint && <p className="mt-1 text-xs text-ink-4">{hint}</p>}
    </div>
  )
}

/** Compact KPI tile. */
export function Stat({ icon: Icon, label, value, decimals = 0, suffix, hint, tone = 'teal', className }) {
  const tones = {
    teal: 'icon-teal text-white', apricot: 'icon-coral text-white', lilac: 'icon-violet text-white',
    sky: 'icon-sky text-white', butter: 'icon-sun text-white', rose: 'icon-coral text-white',
  }
  const washes = {
    teal: 'from-teal-50/80', apricot: 'from-apricot-50/80', lilac: 'from-lilac-50/80', sky: 'from-sky-50/80', butter: 'from-butter-50/80', rose: 'from-rose-50/80',
  }
  return (
    <div className={cn('card card-pad card-glow card-interactive group overflow-hidden bg-gradient-to-br to-white', washes[tone], className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink-3">{label}</p>
        {Icon && (
          <span className={cn('grid h-9 w-9 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110', tones[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 text-[2rem] font-semibold leading-none text-ink">
        {typeof value === 'number' ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : <span className="num">{value ?? '—'}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-ink-4">{hint}</p>}
    </div>
  )
}

export function Avatar({ name, size = 40, className, tone }) {
  const palette = ['from-teal-200 to-teal-100 text-teal-800', 'from-apricot-200 to-apricot-100 text-apricot-600', 'from-lilac-200 to-lilac-100 text-lilac-600', 'from-sky-200 to-sky-100 text-sky-500', 'from-butter-200 to-butter-100 text-[#8A5A0B]']
  const idx = tone ?? ((name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length)
  return (
    <span className={cn('inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-display font-semibold', palette[idx], className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

export function PageHeader({ eyebrow, title, accent, subtitle, actions, className }) {
  return (
    <div className={cn('mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-teal-600">{eyebrow}</p>}
        <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.5rem] text-balance">
          {title} {accent && <span className="serif-accent text-teal-600">{accent}</span>}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[0.9375rem] text-ink-3 text-pretty">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
