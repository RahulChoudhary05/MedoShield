import { motion, useReducedMotion } from 'framer-motion'
import { Info } from 'lucide-react'
import { RiskBadge } from '../ui/Badge'
import { CountUp } from '../ui/motion'
import { cn, num, riskOf } from '../../lib/utils'
import { C } from './theme'

const EASE = [0.2, 0.8, 0.2, 1]

/* ── Tremor spectrum (0–15 Hz) ───────────────────────────────────────
 * The API returns the dominant frequency and the band strength, not the raw spectrum,
 * so the curve is drawn from those two measured values on top of a fixed noise floor. */
const W = 320
const H = 120
const FMAX = 15
const xOf = (hz) => (hz / FMAX) * W

function spectrumPath(freq, strength) {
  const amp = freq ? Math.max(0.12, Math.min(1, strength || 0.2)) : 0
  const pts = []
  for (let i = 0; i <= 120; i++) {
    const hz = (i / 120) * FMAX
    const floor = 0.06 + 0.025 * Math.sin(hz * 2.3) + 0.02 * Math.cos(hz * 4.1)
    const peak = freq ? amp * Math.exp(-((hz - freq) ** 2) / (2 * 0.55 ** 2)) : 0
    const y = H - 10 - Math.min(1, floor + peak) * (H - 22)
    pts.push(`${i ? 'L' : 'M'}${xOf(hz).toFixed(1)},${y.toFixed(1)}`)
  }
  const peakY = freq ? H - 10 - Math.min(1, 0.06 + amp) * (H - 22) : null
  return { d: pts.join(' '), peakY }
}

export function TremorSpectrum({ frequency, strength, className }) {
  const reduce = useReducedMotion()
  const { d, peakY } = spectrumPath(frequency, strength)
  const label = frequency
    ? `Tremor spectrum: dominant peak at ${num(frequency, 1)} hertz, strength ${Math.round((strength || 0) * 100)} percent, inside the 4 to 12 hertz band.`
    : 'Tremor spectrum: no peak found in the 4 to 12 hertz band.'
  return (
    <figure className={className}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={label}>
          <rect x={xOf(4)} y="0" width={xOf(12) - xOf(4)} height={H - 10} fill={C.cream} opacity="0.7" />
          {[0, 4, 8, 12].map((hz) => <line key={hz} x1={xOf(hz)} x2={xOf(hz)} y1="0" y2={H - 10} stroke={C.line} strokeWidth="1" />)}
          <line x1="0" x2={W} y1={H - 10} y2={H - 10} stroke={C.line} strokeWidth="1" />
          <motion.path d={d} fill="none" stroke={C.ink2} strokeWidth="1.6" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE }} />
          {frequency && peakY != null && (
            <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.4 }}>
              <line x1={xOf(frequency)} x2={xOf(frequency)} y1={peakY} y2={H - 10} stroke={C.ember} strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={xOf(frequency)} cy={peakY} r="4" fill={C.ember} />
            </motion.g>
          )}
        </svg>
        <div className="relative mt-1 h-5 font-mono text-[0.8125rem] text-ink-3" aria-hidden>
          {[0, 4, 8, 12].map((hz) => (
            <span key={hz} className="absolute -translate-x-1/2" style={{ left: `${(hz / FMAX) * 100}%` }}>{hz}</span>
          ))}
          <span className="absolute right-0">Hz</span>
        </div>
      </div>
      <figcaption className="mt-2 text-[0.8125rem] text-ink-3">Shaded: the 4–12 Hz tremor band. Curve drawn from the measured peak and strength.</figcaption>
    </figure>
  )
}

/* ── Gait symmetry scale ─────────────────────────────────────────── */
function SymmetryScale({ value }) {
  const v = value == null ? null : Math.max(0, Math.min(1, value))
  return (
    <div>
      <div className="relative h-8" role="img" aria-label={v == null ? 'Gait symmetry not measured' : `Gait symmetry ${Math.round(v * 100)} percent`}>
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-teal-50" style={{ left: '85%', right: 0 }} />
        {[0, 0.5, 1].map((t) => <span key={t} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-line" style={{ left: `${t * 100}%` }} />)}
        {v != null && (
          <motion.span className="absolute top-2 h-4 w-1 rounded-full bg-teal-700" style={{ left: `calc(${v * 100}% - 2px)` }} initial={{ opacity: 0, scaleY: 0.2 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} />
        )}
      </div>
      <div className="flex justify-between font-mono text-[0.8125rem] text-ink-3" aria-hidden><span>0%</span><span>50%</span><span>100%</span></div>
    </div>
  )
}

/* ── Sway target ─────────────────────────────────────────────────── */
function SwayTarget({ sway }) {
  const s = sway == null ? null : Math.max(0, Math.min(1, sway / 0.09))
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" role="img" aria-label={s == null ? 'Sway not measured' : `Trunk sway ${num(sway * 100, 1)} percent of body height`}>
      {[46, 32, 18].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={C.line} strokeWidth="1" />)}
      <line x1="4" x2="96" y1="50" y2="50" stroke={C.line} strokeWidth="1" />
      <line x1="50" x2="50" y1="4" y2="96" stroke={C.line} strokeWidth="1" />
      {s != null && (
        <motion.ellipse cx="50" cy="50" rx={6 + s * 40} ry={4 + s * 26} fill={C.pine} fillOpacity="0.1" stroke={C.pine} strokeWidth="1.5"
          initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: '50px 50px' }} />
      )}
      <circle cx="50" cy="50" r="2" fill={C.ink} />
    </svg>
  )
}

function Row({ label, value, unit }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[0.9375rem] text-ink-3">{label}</dt>
      <dd className="num text-ink">{value ?? '—'}{value != null && value !== '—' && unit ? <span className="ml-1 font-mono text-[0.8125rem] font-normal text-ink-3">{unit}</span> : null}</dd>
    </div>
  )
}

const scoreColor = (v) => (v >= 70 ? C.pine : v >= 45 ? C.butter : C.rose)

/**
 * Renders the response of POST /api/analysis/sessions
 * { motor_index{overall,...}, components[{key,label,score}], risk{classification,score,confidence,basis},
 *   features{cadence,tremor_frequency,tremor_side,gait_symmetry,...}, quality{score,notes,fps,duration_s}, recommendations[] }
 * `figure` (optional) is rendered beside the headline readout — e.g. the 3D human for the task.
 */
export default function MovementResult({ result, compact = false, figure }) {
  if (!result) return null
  const { motor_index: mi = {}, components = [], risk = {}, features: f = {}, quality: q = {}, recommendations = [], baseline } = result
  const r = riskOf(risk.classification)
  const basePct = baseline ? Math.min(100, (baseline.sessions / Math.max(1, baseline.required)) * 100) : 0
  const side = f.tremor_side ? `${f.tremor_side[0].toUpperCase()}${f.tremor_side.slice(1)}` : null

  return (
    <div className="space-y-5">
      {/* Headline readout */}
      <section className="card p-5 sm:p-6" aria-label="Motor index">
        <div className={cn('grid gap-6', figure && !compact && 'md:grid-cols-[minmax(0,15rem)_1fr] md:items-center')}>
          {figure && !compact && <div className="h-56 overflow-hidden rounded-xl bg-cream/70 md:h-64">{figure}</div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="kicker">Motor index</p>
              <RiskBadge level={risk.classification} />
            </div>
            <p className="mt-2 flex items-baseline gap-2 leading-none">
              <CountUp value={mi.overall} className="text-[3.5rem] font-medium text-ink sm:text-[4rem]" />
              <span className="font-mono text-[0.9375rem] text-ink-3">/ 100</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
              <motion.div className="h-full rounded-full" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, mi.overall || 0))}%` }} transition={{ duration: 1.1, ease: EASE }} />
            </div>
            <p className="mt-4 max-w-prose text-[0.9375rem] text-ink-2">
              Compared with {risk.basis || 'reference ranges'}. Confidence <span className="num text-ink">{Math.round((risk.confidence || 0) * 100)}%</span>.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <dt className="kicker">Personal baseline</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">{baseline ? (baseline.calibrated ? 'Calibrated' : <><span className="num">{Math.min(baseline.sessions, baseline.required)}</span> of <span className="num">{baseline.required}</span> checks</>) : '—'}</dd>
                {baseline && !baseline.calibrated && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream" aria-hidden><div className="h-full rounded-full bg-lilac-400" style={{ width: `${basePct}%` }} /></div>
                )}
              </div>
              <div>
                <dt className="kicker">Recording</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">{q.fps ? <><span className="num">{num(q.duration_s, 1)}</span> s · <span className="num">{Math.round(q.fps)}</span> fps</> : '—'}</dd>
              </div>
              <div className="col-span-2 mt-3 sm:col-span-1 sm:mt-0">
                <dt className="kicker">Signal quality</dt>
                <dd className="mt-1 text-[0.9375rem] text-ink">{q.score != null ? <span className="num">{Math.round(q.score * 100)}%</span> : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Instrument panel: tremor · gait · balance */}
      <section className="card p-5 sm:p-6" aria-labelledby="instrument-title">
        <h3 id="instrument-title" className="text-[1.125rem] font-semibold">Measurements</h3>
        <div className="mt-4 grid divide-y divide-line lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
          <div className="pb-5 lg:pb-0 lg:pr-6">
            <p className="kicker">Tremor · 4–12 Hz</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              {f.tremor_frequency ? (
                <><span className="num text-[1.75rem] leading-none text-apricot-600">{num(f.tremor_frequency, 1)}</span><span className="font-mono text-[0.8125rem] text-ink-3">Hz peak{side ? ` · ${side} side` : ''}</span></>
              ) : (
                <span className="text-[0.9375rem] text-ink-2">No clear peak in the band</span>
              )}
            </p>
            <TremorSpectrum frequency={f.tremor_frequency} strength={f.tremor_index} className="mt-4" />
          </div>
          <div className="py-5 lg:px-6 lg:py-0">
            <p className="kicker">Gait symmetry</p>
            <p className="mt-1.5 flex items-baseline gap-1"><span className="num text-[1.75rem] leading-none text-ink">{f.gait_symmetry != null ? Math.round(f.gait_symmetry * 100) : '—'}</span>{f.gait_symmetry != null && <span className="font-mono text-[0.8125rem] text-ink-3">%</span>}</p>
            <div className="mt-4"><SymmetryScale value={f.gait_symmetry} /></div>
            <dl className="mt-3 divide-y divide-line">
              <Row label="Cadence" value={f.cadence ? num(f.cadence) : null} unit="steps/min" />
              <Row label="Step-time variation" value={f.step_time_cv != null ? num(f.step_time_cv * 100, 1) : null} unit="%" />
              <Row label="Arm-swing difference" value={f.arm_swing_asymmetry != null ? num(f.arm_swing_asymmetry * 100, 0) : null} unit="%" />
            </dl>
          </div>
          <div className="pt-5 lg:pl-6 lg:pt-0">
            <p className="kicker">Balance · trunk sway</p>
            <div className="mt-1.5 flex items-center justify-between gap-4">
              <p className="flex items-baseline gap-1"><span className="num text-[1.75rem] leading-none text-ink">{f.postural_sway != null ? num(f.postural_sway * 100, 1) : '—'}</span>{f.postural_sway != null && <span className="font-mono text-[0.8125rem] text-ink-3">% height</span>}</p>
              <SwayTarget sway={f.postural_sway} />
            </div>
            <p className="mt-2 text-[0.8125rem] text-ink-3">Side-to-side wobble of the trunk, trend removed. Smaller is steadier.</p>
          </div>
        </div>
      </section>

      <div className={cn('grid gap-5', !compact && 'lg:grid-cols-2')}>
        <section className="card p-5 sm:p-6" aria-labelledby="breakdown-title">
          <h3 id="breakdown-title" className="text-[1.125rem] font-semibold">Biomarker breakdown</h3>
          <p className="mt-1 text-[0.9375rem] text-ink-3">Each score is 0–100; higher is steadier.</p>
          <ul className="mt-4 divide-y divide-line">
            {components.map((c, i) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_5rem_2.5rem] items-center gap-3 py-2.5">
                <span className="truncate text-[0.9375rem] text-ink-2">{c.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
                  <motion.span className="block h-full rounded-full" style={{ background: scoreColor(c.score) }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, c.score || 0))}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: EASE }} />
                </span>
                <span className="num text-right text-ink">{c.score == null ? '—' : Math.round(c.score)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="meaning-title">
          <h3 id="meaning-title" className="text-[1.125rem] font-semibold">What this means</h3>
          <ol className="mt-4 divide-y divide-line">
            {recommendations.map((t, i) => (
              <li key={i} className="flex gap-3 py-2.5 text-[0.9375rem] text-ink-2">
                <span className="num w-5 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-[0.9375rem] text-ink-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
            Screening insight, not a diagnosis. Your doctor sees these trends alongside your clinical history.
          </p>
        </section>
      </div>
    </div>
  )
}
