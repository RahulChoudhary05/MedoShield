import { useReducedMotion } from 'framer-motion'

/** Chart palette — hex values from DESIGN.md (SVG strokes may use raw hex). */
export const C = {
  ink: '#0B1526',
  ink2: '#283347',
  ink3: '#536075',
  ink4: '#6B778B',
  pine: '#1D3AA6',
  pineMid: '#3860E6',
  pineSoft: '#8AA6FB',
  ember: '#D9522A',
  emberSoft: '#F98E66',
  stone: '#6B778B',
  stoneSoft: '#D0D6E0',
  line: '#DFE4EC',
  paper: '#FFFFFF',
  cream: '#EBEFF5',
  rose: '#C93A33',
  butter: '#C98A12',
}

export const TICK = { fill: C.ink3, fontSize: 13, fontFamily: '"Geist Mono Variable", ui-monospace, monospace' }
export const GRID = { stroke: C.line, strokeOpacity: 0.65, vertical: false }
export const CURSOR = { stroke: C.stoneSoft, strokeDasharray: '3 4' }

/** Line/area draw-in that respects reduced motion (the chart is fully readable either way). */
export function useChartMotion(duration = 900) {
  const reduce = useReducedMotion()
  return { isAnimationActive: !reduce, animationDuration: duration, animationEasing: 'ease-out' }
}

/** Tooltip styled as a paper card. rows: [{ label, value, color }] */
export function TipCard({ title, rows = [], foot }) {
  return (
    <div className="min-w-[11rem] rounded-xl border border-line bg-paper px-3.5 py-2.5 shadow-float">
      {title && <p className="font-mono text-[0.8125rem] text-ink-3">{title}</p>}
      <dl className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-6 text-[0.8125rem]">
            <dt className="flex items-center gap-2 text-ink-3">
              {r.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </dt>
            <dd className="num font-medium text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
      {foot && <p className="mt-1.5 border-t border-line pt-1.5 text-[0.8125rem] text-ink-3">{foot}</p>}
    </div>
  )
}

/** Mono axis caption shown above a chart ("Index 0–100 · by date"). */
export function AxisCaption({ children, className = '' }) {
  return <p className={`font-mono text-[0.8125rem] text-ink-3 ${className}`}>{children}</p>
}
