import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, CircleHelp, Copy, FileText, FlaskConical, Info, ListChecks, Microscope, Stethoscope, TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { Notice } from '../../components/ui/Feedback'
import { cn, fmtDate } from '../../lib/utils'
import { ConfidenceMeter, LevelPill, PointList, SectionTitle, levelInfo } from './shared'

const STATUS = {
  normal: { label: 'Normal', cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  low: { label: 'Low', cls: 'bg-apricot-50 text-apricot-600 ring-apricot-200' },
  high: { label: 'High', cls: 'bg-apricot-50 text-apricot-600 ring-apricot-200' },
  abnormal: { label: 'Abnormal', cls: 'bg-apricot-100 text-apricot-600 ring-apricot-300' },
  unknown: { label: 'Unclear', cls: 'bg-cream text-ink-3 ring-line' },
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.unknown
  return <span className={cn('badge ring-1 ring-inset', s.cls)}>{s.label}</span>
}

const RISK_COPY = {
  Normal: 'Everything we could read looks within the usual range.',
  Low: 'Mostly reassuring, with a small thing or two worth knowing about.',
  Medium: 'A few results are outside the usual range — worth talking through with your doctor.',
  High: 'Some results need attention. Please share this report with your doctor soon.',
  Critical: 'Some results may need prompt attention. Please contact your doctor today.',
}

function Findings({ findings = [] }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const flagged = findings.filter((f) => f.status !== 'normal')
  const rows = onlyFlagged ? flagged : findings
  if (!findings.length) return <p className="text-sm text-ink-4">We couldn’t pick out individual test values from this report.</p>
  return (
    <div>
      {flagged.length > 0 && flagged.length < findings.length && (
        <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-3">
          <input type="checkbox" className="h-4 w-4 rounded accent-teal-500" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          Show only results outside the range ({flagged.length})
        </label>
      )}
      {/* Table on larger screens */}
      <div className="hidden overflow-hidden rounded-2xl border border-line sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-wider text-ink-4">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Test</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Your value</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Usual range</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((f, i) => (
              <motion.tr key={`${f.test_name}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.025 }} className={cn('align-top', f.status !== 'normal' && 'bg-apricot-50/30')}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{f.test_name}</p>
                  {f.note && <p className="mt-0.5 text-xs text-ink-3">{f.note}</p>}
                </td>
                <td className="num px-4 py-3 font-semibold text-ink">{f.value || '—'}</td>
                <td className="px-4 py-3 text-ink-3">{f.normal_range || '—'}</td>
                <td className="px-4 py-3 text-right"><StatusPill status={f.status} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Stacked cards on phones */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((f, i) => (
          <li key={`${f.test_name}-${i}`} className={cn('rounded-2xl border border-line p-3', f.status !== 'normal' && 'bg-apricot-50/30')}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium text-ink">{f.test_name}</p>
              <StatusPill status={f.status} />
            </div>
            <p className="mt-1 text-sm"><span className="num font-semibold text-ink">{f.value || '—'}</span> <span className="text-ink-4">· range {f.normal_range || '—'}</span></p>
            {f.note && <p className="mt-1 text-xs text-ink-3">{f.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Questions({ items = [] }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(items.map((q, i) => `${i + 1}. ${q}`).join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Couldn’t copy — please select the text instead.')
    }
  }
  return (
    <div className="card card-pad">
      <SectionTitle icon={CircleHelp} tone="teal" title="Questions for your doctor"
        action={items.length > 0 && <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>} />
      <PointList items={items} numbered tone="teal" empty="Bring this report to your next visit and ask what it means for you." />
    </div>
  )
}

/** Full explanation of a lab report (backend ReportAnalysis). */
export function ReportResult({ report, compact = false }) {
  const a = report?.analysis || {}
  const r = levelInfo(a.overall_risk)
  return (
    <div className="space-y-5">
      <div className="card relative overflow-hidden p-5 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20 blur-3xl" style={{ background: r.color }} />
        <div className="relative flex flex-wrap items-center gap-2">
          <LevelPill level={a.overall_risk} label={`${a.overall_risk || 'Unrated'} risk`} />
          <span className="badge bg-cream text-ink-2 ring-1 ring-inset ring-line"><FlaskConical className="h-3 w-3" /> {a.report_type || 'Medical report'}</span>
        </div>
        <h3 className="relative mt-3 text-xl font-semibold leading-snug sm:text-2xl text-balance">{a.short_description || RISK_COPY[a.overall_risk] || 'Here’s what your report says.'}</h3>
        {a.short_description && RISK_COPY[a.overall_risk] && <p className="relative mt-1.5 text-sm text-ink-3">{RISK_COPY[a.overall_risk]}</p>}
        <div className={cn('relative mt-5 grid gap-4', !compact && 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]')}>
          {a.main_risk ? (
            <div className={cn('rounded-2xl p-4 ring-1 ring-inset', r.bg, r.ring)}>
              <p className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.14em]', r.text)}><TriangleAlert className="h-3.5 w-3.5" /> Main thing to know</p>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{a.main_risk}</p>
            </div>
          ) : <div />}
          <div className="flex flex-col justify-center gap-3 rounded-2xl bg-cream p-4">
            <ConfidenceMeter value={a.confidence} label="How sure the AI is" />
            {report?.file_name && <p className="flex items-center gap-1.5 truncate text-xs text-ink-4"><FileText className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{report.file_name}</span> · {fmtDate(report.created_at)}</p>}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <SectionTitle icon={Microscope} title="Your results" />
        <Findings findings={a.findings} />
      </div>

      <div className={cn('grid gap-5', !compact && 'md:grid-cols-2')}>
        <div className="card card-pad">
          <SectionTitle icon={ListChecks} title="What can help" />
          <PointList items={a.how_to_fix} numbered empty="No specific changes suggested." />
        </div>
        <div className="card card-pad">
          <SectionTitle icon={Info} tone="teal" title="Common causes" />
          <PointList items={a.causes} tone="teal" empty="No likely causes listed." />
        </div>
        <Questions items={a.questions_for_doctor} />
        <div className="card card-pad card-tint-teal flex flex-col">
          <SectionTitle icon={Stethoscope} title="Who to talk to" />
          <p className="text-teal-700 font-display text-2xl font-semibold">{a.recommended_specialist || 'Your GP'}</p>
          <p className="mt-1 text-sm text-ink-3">A good next step for this kind of report.</p>
          <Button to="/app/care" variant="brand" iconRight={ArrowRight} className="mt-5 self-start">Find a specialist</Button>
        </div>
      </div>
      <Notice tone="info" icon={Info}>This explanation is for understanding only and isn’t a diagnosis. Your doctor knows your full history.</Notice>
    </div>
  )
}
