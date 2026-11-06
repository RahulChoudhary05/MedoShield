import { useState } from 'react'
import { Activity, BedDouble, Brain, FileHeart, Flag, Footprints, Gauge, HeartPulse, LineChart, Pill, ScanLine, Video } from 'lucide-react'
import MotorTrendChart, { ChartLegend } from '../../../components/charts/MotorTrendChart'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Badge, RiskBadge } from '../../../components/ui/Badge'
import { ScoreBar, ScoreRing } from '../../../components/ui/Data'
import { EmptyState } from '../../../components/ui/Feedback'
import { LAB_RISK, cn, fmtDate, fmtRelative, num, riskOf } from '../../../lib/utils'

const SUBSCORES = [
  ['tremor', 'Tremor control'], ['speed', 'Movement speed'], ['symmetry', 'Gait symmetry'], ['balance', 'Balance'],
  ['rhythm', 'Step rhythm'], ['arm_swing', 'Arm swing'], ['cadence', 'Cadence'],
]

export default function OverviewTab({ overview, onTab }) {
  const lr = overview.latest_risk
  const mi = lr?.motor_index && typeof lr.motor_index === 'object' ? lr.motor_index : {}
  const r = riskOf(lr?.level)
  const [show, setShow] = useState(['tremor_index'])
  const toggle = (k) => setShow((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const trend = overview.trend || []

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Latest risk */}
        <Card className="flex flex-col items-center text-center">
          {lr ? (
            <>
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Latest check</span>
                <RiskBadge level={lr.level} pulse />
              </div>
              <ScoreRing value={mi.overall} size={168} stroke={13} color={r.color} label="Motor index" sub="of 100" className="my-4" />
              <div className="grid w-full grid-cols-2 gap-2 text-left">
                <Mini label="Risk score" value={lr.score != null ? `${num(lr.score)}/100` : '—'} />
                <Mini label="Confidence" value={lr.confidence != null ? `${Math.round(lr.confidence * 100)}%` : '—'} />
              </div>
              <p className="mt-3 text-xs text-ink-3 text-pretty">
                {fmtRelative(lr.created_at)} · compared with {lr.basis || 'population reference ranges'}.
              </p>
              {lr.flagged && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600"><Flag className="h-3 w-3" /> Flagged for clinician review</p>
              )}
              {lr.baseline && (
                <div className="mt-4 w-full rounded-2xl bg-cream px-4 py-3 text-left text-xs text-ink-3">
                  <div className="mb-1.5 flex justify-between gap-2">
                    <span>Personal baseline</span>
                    <span className="font-medium text-ink">{lr.baseline.calibrated ? 'Calibrated' : `${Math.min(lr.baseline.sessions, lr.baseline.required)}/${lr.baseline.required} checks`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div className={cn('h-full rounded-full transition-[width] duration-700', lr.baseline.calibrated ? 'bg-teal-500' : 'bg-teal-300')} style={{ width: `${lr.baseline.calibrated ? 100 : Math.min(100, (lr.baseline.sessions / Math.max(1, lr.baseline.required)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={ScanLine} title="No movement checks yet" text="Once the patient records a movement check, their motor index and risk appear here." className="py-6" />
          )}
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader
            icon={LineChart}
            title="Motor trend"
            subtitle={trend.length ? `Last ${trend.length} checks · 90 days` : 'Last 90 days'}
            action={
              <div className="flex gap-1.5" role="group" aria-label="Overlay series">
                {[['tremor_index', 'Tremor', 'bg-apricot-500'], ['gait_symmetry', 'Symmetry', 'bg-teal-300']].map(([k, l, dot]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={show.includes(k)}
                    onClick={() => toggle(k)}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition', show.includes(k) ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink-3 hover:text-ink')}
                  >
                    <span className={cn('h-2 w-2 rounded-full', dot)} /> {l}
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
            <EmptyState icon={Activity} title="Not enough data for a trend" text="Two or more checks are needed to draw a trend line." className="py-10" />
          )}
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader icon={Gauge} tone="teal" title="Biomarker profile" subtitle="Sub-scores, higher is healthier" />
          {Object.keys(mi).length > 1 ? (
            <div className="space-y-3.5">
              {SUBSCORES.filter(([k]) => mi[k] != null).map(([k, l]) => <ScoreBar key={k} label={l} value={mi[k]} />)}
            </div>
          ) : <p className="text-sm text-ink-4">Sub-scores appear after the first movement check.</p>}
        </Card>

        <Card>
          <CardHeader icon={Pill} tone="teal" title="Medication adherence" subtitle="Doses logged over 14 days" action={<LinkBtn onClick={() => onTab('meds')}>Plan</LinkBtn>} />
          <div className="flex items-center gap-5">
            <ScoreRing
              value={overview.adherence_14d}
              size={112}
              stroke={10}
              color={overview.adherence_14d == null ? '#A39B8E' : overview.adherence_14d >= 80 ? '#4A7C64' : overview.adherence_14d >= 50 ? '#C9A845' : '#B8513F'}
              label="% taken"
            />
            <div className="min-w-0 flex-1">
              {(overview.medications || []).length ? (
                <ul className="space-y-1.5">
                  {overview.medications.slice(0, 4).map((m) => (
                    <li key={m.name} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">{m.name}</span>
                      <span className="shrink-0 text-xs text-ink-3">{m.dosage || m.frequency}</span>
                    </li>
                  ))}
                  {overview.medications.length > 4 && <li className="text-xs text-ink-4">+{overview.medications.length - 4} more</li>}
                </ul>
              ) : <p className="text-sm text-ink-4">No medicines in the plan yet.</p>}
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader icon={HeartPulse} tone="teal" title="Lifestyle snapshot" subtitle="Last 14 logged days" action={<LinkBtn onClick={() => onTab('lifestyle')}>Details</LinkBtn>} />
          <LifestyleSnapshot rows={overview.fitness_recent || []} />
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader icon={Video} tone="teal" title="Last AI video review" subtitle={overview.last_video ? fmtDate(overview.last_video.created_at) : 'None yet'} action={<LinkBtn onClick={() => onTab('video')}>All reviews</LinkBtn>} />
          {overview.last_video ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone={overview.last_video.is_reviewed ? 'teal' : 'apricot'} dot>{overview.last_video.is_reviewed ? 'Reviewed' : 'Awaiting your notes'}</Badge>
                {overview.last_video.video_analysis?.gait_quality_score != null && <Badge tone="ink">Gait {overview.last_video.video_analysis.gait_quality_score}/100</Badge>}
              </div>
              <p className="line-clamp-4 text-sm text-ink-2 text-pretty">{overview.last_video.video_analysis?.summary || 'No summary was produced for this video.'}</p>
            </>
          ) : <p className="text-sm text-ink-4">No video reviews yet. Unlock AI video review from the header to let the patient submit one.</p>}
        </Card>

        <Card>
          <CardHeader icon={FileHeart} tone="apricot" title="Last lab report" subtitle={overview.last_report ? fmtDate(overview.last_report.created_at) : 'None yet'} action={<LinkBtn onClick={() => onTab('labs')}>All reports</LinkBtn>} />
          {overview.last_report ? (
            <LastReport report={overview.last_report} />
          ) : <p className="text-sm text-ink-4">The patient hasn’t uploaded a lab report yet.</p>}
        </Card>
      </div>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="tile px-3 py-2.5">
      <p className="text-[0.7rem] text-ink-3">{label}</p>
      <p className="num text-base font-semibold text-ink">{value}</p>
    </div>
  )
}

function LinkBtn({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-full px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50">{children}</button>
}

function LastReport({ report }) {
  const a = report.analysis || {}
  const lab = LAB_RISK[a.overall_risk] || riskOf()
  const abnormal = (a.findings || []).filter((f) => f.status && !['normal', 'unknown'].includes(f.status)).length
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={cn('badge ring-1 ring-inset', lab.bg, lab.text, lab.ring)}>{a.overall_risk || 'Unrated'}</span>
        <span className="text-sm font-medium text-ink">{a.report_type || report.file_name}</span>
        {abnormal > 0 && <span className="text-xs text-ink-3">· {abnormal} out-of-range</span>}
      </div>
      <p className="line-clamp-3 text-sm text-ink-2 text-pretty">{a.short_description || a.main_risk || 'No description available.'}</p>
    </>
  )
}

const avg = (rows, k) => {
  const v = rows.map((r) => r[k]).filter((x) => x != null && !isNaN(x))
  return v.length ? v.reduce((s, x) => s + Number(x), 0) / v.length : null
}

function LifestyleSnapshot({ rows }) {
  if (!rows.length) return <p className="text-sm text-ink-4">No wellbeing logs yet.</p>
  const items = [
    { icon: BedDouble, label: 'Sleep', value: avg(rows, 'sleep_hours'), fmt: (v) => `${num(v, 1)} h`, cls: 'icon-tile icon-teal' },
    { icon: Brain, label: 'Stress', value: avg(rows, 'stress_level'), fmt: (v) => `${num(v, 1)}/10`, cls: 'icon-tile icon-teal' },
    { icon: Footprints, label: 'Walking', value: avg(rows, 'walking_distance'), fmt: (v) => `${num(v, 1)} km`, cls: 'icon-tile icon-teal' },
    { icon: HeartPulse, label: 'Resting HR', value: avg(rows, 'heart_rate'), fmt: (v) => `${num(v)} bpm`, cls: 'icon-tile icon-teal' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((i) => (
        <div key={i.label} className="tile flex items-center gap-2.5 px-3 py-2.5">
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', i.cls)}><i.icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[0.7rem] text-ink-3">{i.label} · avg</p>
            <p className="num truncate text-sm font-semibold text-ink">{i.value == null ? '—' : i.fmt(i.value)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
