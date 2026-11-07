import { useState } from 'react'
import { ArrowRight, BedDouble, Brain, Flag, Footprints, HeartPulse, ScanLine } from 'lucide-react'
import MotorTrendChart, { ChartLegend } from '../../../components/charts/MotorTrendChart'
import { Card } from '../../../components/ui/Card'
import { Badge, RiskBadge, RISK_HEX, riskKey } from '../../../components/ui/Badge'
import { ScoreBar, ScoreRing, scoreHex } from '../../../components/ui/Data'
import { EmptyState } from '../../../components/ui/Feedback'
import { cn, fmtDate, fmtRelative, num } from '../../../lib/utils'
import { Head, Label, LabRiskBadge } from '../shared'

const SUBSCORES = [
  ['tremor', 'Tremor control'], ['speed', 'Movement speed'], ['symmetry', 'Gait symmetry'], ['balance', 'Balance'],
  ['rhythm', 'Step rhythm'], ['arm_swing', 'Arm swing'], ['cadence', 'Cadence'],
]

export default function OverviewTab({ overview, onTab }) {
  const lr = overview.latest_risk
  const mi = lr?.motor_index && typeof lr.motor_index === 'object' ? lr.motor_index : {}
  const [show, setShow] = useState(['tremor_index'])
  const toggle = (k) => setShow((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const trend = overview.trend || []

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Latest risk */}
        <Card className="flex flex-col">
          {lr ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[1.0625rem] font-medium text-ink">Latest check</h2>
                <RiskBadge level={lr.level} pulse />
              </div>
              <ScoreRing value={mi.overall} size={168} stroke={10} color={RISK_HEX[riskKey(lr.level)]} label="Motor index" sub="of 100" className="mx-auto my-5" />
              <dl className="grid grid-cols-2 divide-x divide-line border-y border-line">
                <div className="py-3 pr-3">
                  <dt className="kicker">Risk score</dt>
                  <dd className="num mt-1 text-xl text-ink">{lr.score != null ? num(lr.score) : '—'}<span className="ml-1 font-mono text-[0.8125rem] text-ink-3">/100</span></dd>
                </div>
                <div className="py-3 pl-4">
                  <dt className="kicker">Confidence</dt>
                  <dd className="num mt-1 text-xl text-ink">{lr.confidence != null ? Math.round(lr.confidence * 100) : '—'}<span className="ml-0.5 font-mono text-[0.8125rem] text-ink-3">%</span></dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.875rem] text-ink-3 text-pretty">
                {fmtRelative(lr.created_at)} · compared with {lr.basis || 'population reference ranges'}.
              </p>
              {lr.flagged && (
                <p className="mt-3"><Badge tone="rose"><Flag aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} /> Flagged for clinician review</Badge></p>
              )}
              {lr.baseline && (
                <div className="mt-4 rounded-xl bg-cream/70 px-4 py-3">
                  <div className="mb-2 flex justify-between gap-2 text-[0.8125rem]">
                    <span className="font-mono text-ink-3">Personal baseline</span>
                    <span className="num text-ink">{lr.baseline.calibrated ? 'Calibrated' : `${Math.min(lr.baseline.sessions, lr.baseline.required)} of ${lr.baseline.required} checks`}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div className={cn('h-full rounded-full transition-[width] duration-700', lr.baseline.calibrated ? 'bg-teal-600' : 'bg-teal-400')} style={{ width: `${lr.baseline.calibrated ? 100 : Math.min(100, (lr.baseline.sessions / Math.max(1, lr.baseline.required)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={ScanLine} headingLevel={2} title="No movement checks yet" text="Once the patient records a 10-second check, their motor index and risk appear here." className="py-6" />
          )}
        </Card>

        {/* Trend */}
        <Card>
          <Head
            title="Motor trend"
            subtitle={trend.length ? `Last ${trend.length} checks · 90 days` : 'Last 90 days'}
            action={
              <div className="flex gap-1.5" role="group" aria-label="Overlay series">
                {[['tremor_index', 'Tremor', 'bg-apricot-500'], ['gait_symmetry', 'Symmetry', 'bg-ink-4']].map(([k, l, dot]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={show.includes(k)}
                    onClick={() => toggle(k)}
                    className={cn('inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-[0.875rem] transition-colors duration-150', show.includes(k) ? 'border-ink-4 bg-paper text-ink' : 'border-line bg-cream/50 text-ink-3 hover:text-ink')}
                  >
                    <span aria-hidden className={cn('h-2 w-2 rounded-full', show.includes(k) ? dot : 'bg-line')} /> {l}
                  </button>
                ))}
              </div>
            }
          />
          {trend.length >= 2 ? (
            <>
              <MotorTrendChart points={trend} show={show} height={250} />
              <div className="mt-3"><ChartLegend show={show} /></div>
            </>
          ) : (
            <EmptyState icon={ScanLine} tone="ink" headingLevel={3} title="Not enough data for a trend" text="Two or more checks are needed to draw a trend line." className="py-10" />
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <Head title="Biomarker profile" subtitle="Sub-scores against baseline, higher is healthier" />
          {Object.keys(mi).length > 1 ? (
            <div className="space-y-3.5">
              {SUBSCORES.filter(([k]) => mi[k] != null).map(([k, l]) => <ScoreBar key={k} label={l} value={mi[k]} />)}
            </div>
          ) : <p className="text-[0.9375rem] text-ink-3">Sub-scores appear after the first movement check.</p>}
        </Card>

        <Card>
          <Head title="Medication adherence" subtitle="Doses logged over 14 days" action={<LinkBtn onClick={() => onTab('meds')}>Open plan</LinkBtn>} />
          <div className="flex items-center gap-5">
            <ScoreRing value={overview.adherence_14d} size={112} stroke={9} color={scoreHex(overview.adherence_14d == null ? null : overview.adherence_14d >= 80 ? 80 : overview.adherence_14d >= 50 ? 50 : 0)} label="% taken" />
            <div className="min-w-0 flex-1">
              {(overview.medications || []).length ? (
                <ul className="divide-y divide-line">
                  {overview.medications.slice(0, 4).map((m) => (
                    <li key={m.name} className="flex items-baseline justify-between gap-2 py-1.5 text-[0.9375rem]">
                      <span className="truncate text-ink">{m.name}</span>
                      <span className="shrink-0 font-mono text-[0.8125rem] text-ink-3">{m.dosage || m.frequency}</span>
                    </li>
                  ))}
                  {overview.medications.length > 4 && <li className="py-1.5 text-[0.8125rem] text-ink-3">+{overview.medications.length - 4} more</li>}
                </ul>
              ) : <p className="text-[0.9375rem] text-ink-3">No medicines in the plan yet.</p>}
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <Head title="Lifestyle snapshot" subtitle="Average of the last 14 logged days" action={<LinkBtn onClick={() => onTab('lifestyle')}>Open logs</LinkBtn>} />
          <LifestyleSnapshot rows={overview.fitness_recent || []} />
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <Head title="Last AI video review" subtitle={overview.last_video ? fmtDate(overview.last_video.created_at) : 'None yet'} action={<LinkBtn onClick={() => onTab('video')}>All reviews</LinkBtn>} />
          {overview.last_video ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone={overview.last_video.is_reviewed ? 'teal' : 'apricot'} dot>{overview.last_video.is_reviewed ? 'Reviewed' : 'Awaiting your notes'}</Badge>
                {overview.last_video.video_analysis?.gait_quality_score != null && <Badge tone="ink"><span className="num">Gait {overview.last_video.video_analysis.gait_quality_score}/100</span></Badge>}
              </div>
              <p className="line-clamp-4 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{overview.last_video.video_analysis?.summary || 'No summary was produced for this video.'}</p>
            </>
          ) : <p className="text-[0.9375rem] text-ink-3">No video reviews yet. Unlock AI video review from the header to let the patient submit one.</p>}
        </Card>

        <Card>
          <Head title="Last lab report" subtitle={overview.last_report ? fmtDate(overview.last_report.created_at) : 'None yet'} action={<LinkBtn onClick={() => onTab('labs')}>All reports</LinkBtn>} />
          {overview.last_report ? (
            <LastReport report={overview.last_report} />
          ) : <p className="text-[0.9375rem] text-ink-3">The patient hasn’t uploaded a lab report yet.</p>}
        </Card>
      </div>
    </div>
  )
}

function LinkBtn({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group -mr-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[0.875rem] font-medium text-teal-700 transition-colors duration-150 hover:bg-teal-50">
      {children}
      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} />
    </button>
  )
}

function LastReport({ report }) {
  const a = report.analysis || {}
  const abnormal = (a.findings || []).filter((f) => f.status && !['normal', 'unknown'].includes(f.status)).length
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <LabRiskBadge risk={a.overall_risk} />
        <span className="text-[0.9375rem] font-medium text-ink">{a.report_type || report.file_name}</span>
        {abnormal > 0 && <span className="text-[0.875rem] text-ink-3">· <span className="num">{abnormal}</span> out of range</span>}
      </div>
      <p className="line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{a.short_description || a.main_risk || 'No description available.'}</p>
    </>
  )
}

const avg = (rows, k) => {
  const v = rows.map((r) => r[k]).filter((x) => x != null && !isNaN(x))
  return v.length ? v.reduce((s, x) => s + Number(x), 0) / v.length : null
}

function LifestyleSnapshot({ rows }) {
  if (!rows.length) return <p className="text-[0.9375rem] text-ink-3">No wellbeing logs yet.</p>
  const items = [
    { icon: BedDouble, label: 'Sleep', value: avg(rows, 'sleep_hours'), fmt: (v) => num(v, 1), unit: 'h' },
    { icon: Brain, label: 'Stress', value: avg(rows, 'stress_level'), fmt: (v) => num(v, 1), unit: '/10' },
    { icon: Footprints, label: 'Walking', value: avg(rows, 'walking_distance'), fmt: (v) => num(v, 1), unit: 'km' },
    { icon: HeartPulse, label: 'Resting HR', value: avg(rows, 'heart_rate'), fmt: (v) => num(v), unit: 'bpm' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      {items.map((i) => (
        <div key={i.label} className="min-w-0 border-t border-line pt-3">
          <Label as="dt" icon={i.icon}>{i.label}</Label>
          <dd className="num mt-1 truncate text-xl text-ink">
            {i.value == null ? '—' : <>{i.fmt(i.value)}<span className="ml-1 font-mono text-[0.8125rem] text-ink-3">{i.unit}</span></>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
