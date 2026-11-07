import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/*
 * Small, honest data visuals for the landing page. All SVG, drawn in on first view.
 * Colours are the DESIGN.md hex values (SVG strokes may use raw hex).
 *   ink #171614 · ink-3 #67615A · ink-4 #8F887D · line #E3DCCF · cream #EFE9DE
 *   pine #234A38 / #3F6D56 · ember #CF7146 · stone #B5AC9F
 */
const EASE = [0.2, 0.8, 0.2, 1]
const VIEW = { once: true, margin: '-60px' }
const MONO = { fontFamily: '"Geist Mono Variable", ui-monospace, monospace' }

/* ─────────────── Tremor spectrum ─────────────── */
// Deterministic illustrative power spectrum: voluntary motion < 3 Hz, a flat
// landmark-jitter floor, and one genuine peak inside the 4–12 Hz band.
const PEAK_HZ = 5.4
function power(f) {
  const voluntary = 0.85 * Math.exp(-((f / 1.2) ** 2))
  const floor = 0.07 + 0.018 * Math.sin(f * 3.7) + 0.012 * Math.sin(f * 7.3 + 1)
  const peak = 0.7 * Math.exp(-(((f - PEAK_HZ) / 0.42) ** 2))
  const harmonic = 0.1 * Math.exp(-(((f - PEAK_HZ * 2) / 0.5) ** 2))
  return voluntary + floor + peak + harmonic
}

export function TremorSpectrum({ className, axis = true, label = true }) {
  const W = 360
  const H = 180
  const pl = axis ? 30 : 8
  const pr = 10
  const pt = 18
  const pb = axis ? 30 : 10
  const fMax = 16
  const x = (f) => pl + (f / fMax) * (W - pl - pr)
  const y = (p) => H - pb - Math.min(p, 1) * (H - pt - pb)
  let d = ''
  for (let f = 0; f <= fMax + 1e-6; f += 0.1) d += `${f === 0 ? 'M' : 'L'}${x(f).toFixed(1)},${y(power(f)).toFixed(1)}`
  const px = x(PEAK_HZ)
  const py = y(power(PEAK_HZ))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} role="img"
      aria-label={`Illustrative tremor power spectrum with a peak at ${PEAK_HZ} hertz inside the 4 to 12 hertz band`}>
      {/* the analysed band */}
      <rect x={x(4)} y={pt - 6} width={x(12) - x(4)} height={H - pb - pt + 6} fill="#EFE9DE" />
      {axis && (
        <text x={x(4) + 6} y={pt + 10} fontSize="16" fill="#67615A" style={MONO}>4–12 Hz band</text>
      )}
      {/* voluntary zone */}
      {axis && <line x1={x(3)} x2={x(3)} y1={pt} y2={H - pb} stroke="#E3DCCF" strokeDasharray="3 4" />}
      {/* baseline */}
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="#E3DCCF" />
      {axis && [0, 4, 8, 12, 16].map((f) => (
        <g key={f}>
          <line x1={x(f)} x2={x(f)} y1={H - pb} y2={H - pb + 4} stroke="#B5AC9F" />
          <text x={x(f)} y={H - pb + 18} fontSize="16" textAnchor={f === 16 ? 'end' : f === 0 ? 'start' : 'middle'} fill="#67615A" style={MONO}>{f === 16 ? '16 Hz' : f}</text>
        </g>
      ))}
      <motion.path d={d} fill="none" stroke="#234A38" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }} />
      <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW} transition={{ delay: 1.2, duration: 0.5, ease: EASE }}>
        <line x1={px} x2={px} y1={py} y2={H - pb} stroke="#CF7146" strokeDasharray="2 3" />
        <circle cx={px} cy={py} r="4.5" fill="#CF7146" />
        {label && <text x={px + 10} y={py + 30} fontSize="16" fill="#984826" style={MONO}>peak {PEAK_HZ} Hz</text>}
      </motion.g>
    </svg>
  )
}

/* ─────────────── Baseline trend ─────────────── */
const TREND = [71, 74, 70, 73, 72, 72, 74, 73, 75, 72, 71, 73, 70, 69, 68, 67, 66, 64]
export function TrendLine({ className, axis = true }) {
  const labels = axis
  const W = 360
  const H = 180
  const pl = 10
  const pr = 14
  const pt = 22
  const pb = axis ? 30 : 12
  const x = (i) => pl + (i / (TREND.length - 1)) * (W - pl - pr)
  const y = (v) => pt + ((80 - v) / 25) * (H - pt - pb)
  const pts = TREND.map((v, i) => [x(i), y(v)])
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('')
  const last = pts.at(-1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} role="img"
      aria-label="Illustrative trend of 18 checks: the first five set a personal baseline band, later checks drift below it">
      {/* baseline band (median ± MAD of sessions 1–5) */}
      <rect x={pl} y={y(74.5)} width={W - pl - pr} height={y(70.5) - y(74.5)} fill="#EFE9DE" />
      <line x1={pl} x2={W - pr} y1={y(72.5)} y2={y(72.5)} stroke="#B5AC9F" strokeDasharray="3 4" />
      {labels && <text x={W - pr} y={y(74.5) - 6} fontSize="16" textAnchor="end" fill="#67615A" style={MONO}>your baseline</text>}
      <line x1={x(4.5)} x2={x(4.5)} y1={pt - 6} y2={H - pb} stroke="#E3DCCF" />
      {axis && (
        <>
          <text x={pl} y={H - 8} fontSize="16" fill="#8F887D" style={MONO}>calibrating</text>
          <text x={W - pr} y={H - 8} fontSize="16" textAnchor="end" fill="#8F887D" style={MONO}>compared with you</text>
        </>
      )}
      <motion.path d={d} fill="none" stroke="#234A38" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }} />
      {pts.map(([a, b], i) => (
        <motion.circle key={i} cx={a} cy={b} r={i === pts.length - 1 ? 4.5 : 2.6}
          fill={i === pts.length - 1 ? '#CF7146' : i < 5 ? '#B5AC9F' : '#234A38'}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW}
          transition={{ delay: 0.2 + (i / pts.length) * 1.3, duration: 0.3 }} />
      ))}
      {labels && <motion.text x={last[0] - 6} y={last[1] + 20} fontSize="16" textAnchor="end" fill="#984826" style={MONO}
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW} transition={{ delay: 1.6, duration: 0.4 }}>
        −2.1 MAD · flagged
      </motion.text>}
    </svg>
  )
}

/* ─────────────── Gait: left / right step times ─────────────── */
const STEPS = [['L', 0.54], ['R', 0.57], ['L', 0.55], ['R', 0.58], ['L', 0.54], ['R', 0.57]]
export function StepBars({ className }) {
  return (
    <figure className={cn('w-full', className)}>
      <ul className="space-y-2" aria-label="Illustrative step times, alternating left and right">
        {STEPS.map(([side, s], i) => (
          <li key={i} className="grid grid-cols-[1.5rem_1fr_3.5rem] items-center gap-3 font-mono text-[0.8125rem] text-ink-3">
            <span>{side}</span>
            <span className="h-2 overflow-hidden rounded-full bg-cream">
              <motion.span className={cn('block h-full origin-left rounded-full', side === 'L' ? 'bg-teal-600' : 'bg-lilac-400')}
                style={{ width: `${(s / 0.7) * 100}%` }}
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={VIEW} transition={{ delay: i * 0.06, duration: 0.6, ease: EASE }} />
            </span>
            <span className="text-right tabular-nums text-ink-2">{s.toFixed(2)} s</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 font-mono text-[0.8125rem] text-ink-3">
        <span>cadence <span className="text-ink">107 spm</span></span>
        <span>symmetry <span className="text-ink">95%</span></span>
      </figcaption>
    </figure>
  )
}

/* ─────────────── Balance: trunk sway trace ─────────────── */
function swayPath() {
  let d = ''
  for (let i = 0; i <= 240; i++) {
    const t = i / 240
    const a = t * Math.PI * 2 * 5
    const r = 22 + 10 * Math.sin(t * 17) + 6 * Math.sin(t * 41)
    const px = 120 + Math.cos(a) * r * 1.45 + 6 * Math.sin(t * 9)
    const py = 80 + Math.sin(a * 1.07) * r * 0.75
    d += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`
  }
  return d
}
const SWAY = swayPath()
export function SwayPlot({ className }) {
  return (
    <svg viewBox="0 0 240 160" className={cn('h-auto w-full', className)} role="img" aria-label="Illustrative top-down trace of trunk sway while standing still">
      <line x1="120" x2="120" y1="12" y2="148" stroke="#E3DCCF" />
      <line x1="16" x2="224" y1="80" y2="80" stroke="#E3DCCF" />
      <ellipse cx="120" cy="80" rx="64" ry="34" fill="none" stroke="#B5AC9F" strokeDasharray="3 4" />
      <motion.path d={SWAY} fill="none" stroke="#234A38" strokeWidth="1.4" strokeLinejoin="round" strokeOpacity="0.85"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1] }} />
      <text x="16" y="152" fontSize="12" fill="#8F887D" style={MONO}>left</text>
      <text x="224" y="152" fontSize="12" textAnchor="end" fill="#8F887D" style={MONO}>right</text>
    </svg>
  )
}

/* ─────────────── Tiny sparkline for the clinician table ─────────────── */
export function Spark({ values, tone = 'pine', className }) {
  const W = 88
  const H = 26
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (W - 4), H - 3 - ((v - min) / (max - min || 1)) * (H - 6)])
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('')
  const stroke = tone === 'ember' ? '#B95A31' : tone === 'stone' ? '#8F887D' : '#3F6D56'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} aria-hidden="true">
      <motion.path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 0.9, ease: EASE }} />
    </svg>
  )
}
