import { Activity, Footprints, Gauge, Info, Sparkles, Waves } from 'lucide-react'
import { RiskBadge } from '../ui/Badge'
import { ScoreBar, ScoreRing } from '../ui/Data'
import { Notice } from '../ui/Feedback'
import { cn, num, riskOf } from '../../lib/utils'

/**
 * Renders the response of POST /api/analysis/sessions
 * { motor_index{overall,...}, components[{key,label,score}], risk{classification,score,confidence,basis},
 *   features{cadence,tremor_frequency,tremor_side,gait_symmetry,...}, quality{score,notes,fps,duration_s}, recommendations[] }
 */
export default function MovementResult({ result, compact = false }) {
  if (!result) return null
  const { motor_index: mi = {}, components = [], risk = {}, features: f = {}, quality: q = {}, recommendations = [], baseline } = result
  const r = riskOf(risk.classification)
  return (
    <div className={cn('grid gap-5', !compact && 'lg:grid-cols-[minmax(0,320px)_1fr]')}>
      <div className="card card-pad flex flex-col items-center text-center">
        <RiskBadge level={risk.classification} pulse />
        <ScoreRing value={mi.overall} size={176} stroke={13} color={r.color} label="Motor index" className="my-4" />
        <p className="text-sm text-ink-3 text-pretty">
          Compared with {risk.basis || 'reference ranges'}. Confidence <span className="font-medium text-ink">{Math.round((risk.confidence || 0) * 100)}%</span>.
        </p>
        {baseline && (
          <div className="mt-4 w-full rounded-2xl bg-cream px-4 py-3 text-left text-xs text-ink-3">
            <div className="mb-1.5 flex justify-between"><span>Personal baseline</span><span className="font-medium text-ink">{baseline.calibrated ? 'Calibrated' : `${Math.min(baseline.sessions, baseline.required)}/${baseline.required} checks`}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-lilac-400" style={{ width: `${Math.min(100, (baseline.sessions / baseline.required) * 100)}%` }} /></div>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="card card-pad">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Gauge className="h-4 w-4 text-teal-600" /> Biomarker breakdown</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {components.map((c) => <ScoreBar key={c.key} label={c.label} value={c.score} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Footprints, label: 'Cadence', value: f.cadence ? `${num(f.cadence)} spm` : '—' },
              { icon: Waves, label: 'Tremor', value: f.tremor_frequency ? `${num(f.tremor_frequency, 1)} Hz${f.tremor_side ? ` · ${f.tremor_side[0].toUpperCase()}` : ''}` : 'None' },
              { icon: Activity, label: 'Symmetry', value: f.gait_symmetry != null ? `${Math.round(f.gait_symmetry * 100)}%` : '—' },
              { icon: Sparkles, label: 'Recording', value: q.fps ? `${q.duration_s}s · ${Math.round(q.fps)} fps` : '—' },
            ].map((m) => (
              <div key={m.label} className="tile px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs text-ink-3"><m.icon className="h-3.5 w-3.5" /> {m.label}</p>
                <p className="num mt-1 text-[0.95rem] font-semibold text-ink">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="mb-3 text-base font-semibold">What this means</h3>
          <ul className="space-y-2.5">
            {recommendations.map((t, i) => (
              <li key={i} className="flex gap-3 text-[0.9375rem] text-ink-2">
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-50 text-[0.7rem] font-bold text-teal-700">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
          <Notice tone="info" icon={Info} className="mt-4">Screening insight, not a diagnosis. Your doctor sees these trends alongside your clinical history.</Notice>
        </div>
      </div>
    </div>
  )
}
