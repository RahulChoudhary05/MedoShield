import { motion } from 'framer-motion'
import { cn, initials } from '../../lib/utils'
import { CountUp, PageHeader as FieldNotesHeader } from './motion'

const EASE = [0.2, 0.8, 0.2, 1]
/** DESIGN.md chart hex values (SVG strokes may use raw hex). */
export const CHART = { ink: '#171614', pine: '#234A38', pine2: '#3F6D56', ember: '#B95A31', stone: '#8F887D', grid: '#E3DCCF', track: '#EFE9DE', butter: '#B8963A', rose: '#AF4A39' }

/** Score colour scale shared by rings and bars. */
export const scoreHex = (v) => (v == null ? CHART.stone : v >= 70 ? CHART.pine2 : v >= 45 ? CHART.butter : CHART.rose)

/** Circular score gauge (0-100). */
export function ScoreRing({ value, size = 132, stroke = 11, color = CHART.pine2, track = CHART.track, label, sub, className }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'}: ${value == null ? 'no data' : Math.round(v)}${sub ? ` ${sub}` : ''}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" aria-hidden>
        <div>
          {value == null ? <span className="num text-3xl text-ink-4">—</span> : <CountUp value={v} className="text-[2rem] leading-none text-ink" />}
          {label && <div className="mt-1 font-mono text-[0.8125rem] text-ink-3">{label}</div>}
          {sub && <div className="font-mono text-[0.8125rem] text-ink-4">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

/** Horizontal labelled bar, 0-100. */
export function ScoreBar({ label, value, hint, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="text-ink-2">{label}</span>
        <span className="num text-ink">{value == null ? '—' : Math.round(v)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cream" role="presentation">
        <motion.div className="h-full rounded-full" style={{ background: color || scoreHex(value == null ? null : v) }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }} />
      </div>
      {hint && <p className="mt-1 text-[0.8125rem] text-ink-3">{hint}</p>}
    </div>
  )
}

/** Compact KPI tile: mono label, tabular number, optional quiet icon. */
export function Stat({ icon: Icon, label, value, decimals = 0, suffix, hint, tone = 'teal', className }) {
  const tones = { teal: 'text-teal-700', apricot: 'text-apricot-600', lilac: 'text-ink-3', sky: 'text-teal-700', butter: 'text-butter-400', rose: 'text-rose-500' }
  return (
    <div className={cn('card card-pad', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="kicker">{label}</p>
        {Icon && <Icon aria-hidden className={cn('h-[18px] w-[18px] shrink-0', tones[tone] || tones.teal)} strokeWidth={1.8} />}
      </div>
      <div className="mt-3 text-[2.25rem] leading-none text-ink">
        {typeof value === 'number' ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : <span className="num">{value ?? '—'}</span>}
      </div>
      {hint && <p className="mt-2 text-[0.8125rem] text-ink-3">{hint}</p>}
    </div>
  )
}

/** Inline metric: mono label over a tabular value with an optional unit. No box. */
export function Metric({ label, value, unit, hint, className, size = 'md' }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="kicker truncate">{label}</dt>
      <dd className={cn('num mt-1 leading-none text-ink', size === 'lg' ? 'text-[2.25rem]' : size === 'sm' ? 'text-lg' : 'text-[1.625rem]')}>
        {value ?? '—'}{unit && value != null && value !== '—' && <span className="ml-1 font-mono text-[0.8125rem] font-normal text-ink-3">{unit}</span>}
      </dd>
      {hint && <p className="mt-1 text-[0.8125rem] text-ink-3">{hint}</p>}
    </div>
  )
}

/** Tiny line sparkline (values in any range). Decorative unless `label` is given. */
export function Sparkline({ values = [], width = 72, height = 22, color = CHART.pine2, label, className }) {
  const v = values.filter((x) => x != null && !isNaN(x)).map(Number)
  if (v.length < 2) return <span className={cn('inline-block font-mono text-[0.8125rem] text-ink-4', className)} style={{ width }}>—</span>
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1
  const pts = v.map((x, i) => [(i / (v.length - 1)) * (width - 4) + 2, height - 2 - ((x - min) / span) * (height - 4)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <motion.path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  )
}

/** Tiny bar sparkline for 0-100 values (e.g. a biomarker profile). */
export function MicroBars({ values = [], width = 72, height = 22, color = CHART.pine2, label, className }) {
  const v = values.map((x) => (x == null || isNaN(x) ? null : Math.max(0, Math.min(100, Number(x)))))
  if (!v.some((x) => x != null)) return <span className={cn('inline-block font-mono text-[0.8125rem] text-ink-4', className)} style={{ width }}>—</span>
  const gap = 2
  const bw = (width - gap * (v.length - 1)) / v.length
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {v.map((x, i) => {
        const h = x == null ? 2 : Math.max(2, (x / 100) * height)
        return <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx="1" fill={x == null ? CHART.grid : color} opacity={x == null ? 1 : 0.35 + (x / 100) * 0.65} />
      })}
    </svg>
  )
}

/** Monogram on cream with ink text. `tone` is accepted for compatibility and ignored. */
// eslint-disable-next-line no-unused-vars
export function Avatar({ name, size = 40, className, tone }) {
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 select-none place-items-center rounded-full bg-cream font-sans font-medium text-ink ring-1 ring-inset ring-line', className)}
      style={{ width: size, height: size, fontSize: Math.max(13, size * 0.36), letterSpacing: '0.01em' }}
    >
      {initials(name)}
    </span>
  )
}

/**
 * Legacy page header API (eyebrow / subtitle). Renders the Field Notes PageHeader from motion.jsx.
 * Also accepts kicker / description.
 */
export function PageHeader({ eyebrow, kicker, title, accent, subtitle, description, actions, className }) {
  return <FieldNotesHeader kicker={kicker ?? eyebrow} title={title} accent={accent} description={description ?? subtitle} actions={actions} className={className} />
}
