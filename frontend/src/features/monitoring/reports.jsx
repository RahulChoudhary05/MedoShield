import { useState } from 'react'
import { ArrowRight, Check, CircleHelp, Copy, FileText, Info, ListChecks, Microscope, Stethoscope, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { cn, fmtDate } from '../../lib/utils'
import { ConfidenceMeter, LevelPill, PointList, SectionTitle, levelInfo } from './shared'

const STATUS = {
  normal: { label: 'Normal', cls: 'text-teal-700', dot: 'bg-teal-600' },
  low: { label: 'Low', cls: 'text-apricot-600', dot: 'bg-apricot-500' },
  high: { label: 'High', cls: 'text-apricot-600', dot: 'bg-apricot-500' },
  abnormal: { label: 'Abnormal', cls: 'text-rose-600', dot: 'bg-rose-500' },
  unknown: { label: 'Unclear', cls: 'text-ink-3', dot: 'bg-ink-4' },
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.unknown
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.8125rem]', s.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} aria-hidden />{s.label}
    </span>
  )
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
  if (!findings.length) return <p className="text-[0.9375rem] text-ink-3">We couldn’t pick out individual test values from this report.</p>
  return (
    <div>
      {flagged.length > 0 && flagged.length < findings.length && (
        <label className="mb-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink-2">
          <input type="checkbox" className="h-4 w-4 rounded" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          Show only results outside the range (<span className="num">{flagged.length}</span>)
        </label>
      )}
      {/* Table on larger screens */}
      <div className="hidden sm:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="kicker py-2 pr-4 font-medium">Test</th>
              <th scope="col" className="kicker py-2 pr-4 font-medium">Your value</th>
              <th scope="col" className="kicker py-2 pr-4 font-medium">Usual range</th>
              <th scope="col" className="kicker py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((f, i) => (
              <tr key={`${f.test_name}-${i}`} className="align-top">
                <td className="py-3 pr-4">
                  <p className="font-medium text-ink">{f.test_name}</p>
                  {f.note && <p className="mt-0.5 text-[0.8125rem] text-ink-3">{f.note}</p>}
                </td>
                <td className={cn('num py-3 pr-4', f.status !== 'normal' ? 'text-apricot-600' : 'text-ink')}>{f.value || '—'}</td>
                <td className="py-3 pr-4 font-mono text-[0.8125rem] text-ink-3">{f.normal_range || '—'}</td>
                <td className="py-3 text-right"><StatusPill status={f.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Stacked rows on phones */}
      <ul className="divide-y divide-line sm:hidden">
        {rows.map((f, i) => (
          <li key={`${f.test_name}-${i}`} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium text-ink">{f.test_name}</p>
              <StatusPill status={f.status} />
            </div>
            <p className="mt-1"><span className={cn('num', f.status !== 'normal' ? 'text-apricot-600' : 'text-ink')}>{f.value || '—'}</span> <span className="font-mono text-[0.8125rem] text-ink-3">· range {f.normal_range || '—'}</span></p>
            {f.note && <p className="mt-1 text-[0.8125rem] text-ink-3">{f.note}</p>}
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
    <div className="card p-5 sm:p-6">
      <SectionTitle icon={CircleHelp} title="Questions for your doctor"
        action={items.length > 0 && <Button variant="ghost" icon={copied ? Check : Copy} onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy questions'}</Button>} />
      <PointList items={items} numbered empty="Bring this report to your next visit and ask what it means for you." />
    </div>
  )
}

/** Full explanation of a lab report (backend ReportAnalysis). */
export function ReportResult({ report, compact = false }) {
  const a = report?.analysis || {}
  const r = levelInfo(a.overall_risk)
  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={a.overall_risk} label={`${a.overall_risk || 'Unrated'} risk`} />
          <span className="font-mono text-[0.8125rem] text-ink-3">{a.report_type || 'Medical report'}</span>
        </div>
        <h3 className="mt-3 font-serif text-[1.75rem] font-semibold leading-snug text-balance">{a.short_description || RISK_COPY[a.overall_risk] || 'Here’s what your report says.'}</h3>
        {a.short_description && RISK_COPY[a.overall_risk] && <p className="mt-1.5 text-[0.9375rem] text-ink-3">{RISK_COPY[a.overall_risk]}</p>}
        <div className={cn('mt-5 grid gap-5 border-t border-line pt-5', !compact && 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-8')}>
          {a.main_risk ? (
            <div className="rounded-lg bg-cream/50 px-4 py-3">
              <p className={cn('flex items-center gap-1.5 font-mono text-[0.8125rem]', r.text)}><TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> Main thing to know</p>
              <p className="mt-1.5 text-base leading-relaxed text-ink-2">{a.main_risk}</p>
            </div>
          ) : <div />}
          <div className="flex flex-col justify-center gap-3">
            <ConfidenceMeter value={a.confidence} label="How sure the AI is" />
            {report?.file_name && <p className="flex items-center gap-1.5 truncate font-mono text-[0.8125rem] text-ink-3"><FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden /> <span className="truncate">{report.file_name}</span> · {fmtDate(report.created_at)}</p>}
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <SectionTitle icon={Microscope} title="Your results" />
        <Findings findings={a.findings} />
      </div>

      <div className={cn('grid gap-5', !compact && 'md:grid-cols-2')}>
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={ListChecks} title="What can help" />
          <PointList items={a.how_to_fix} numbered empty="No specific changes suggested." />
        </div>
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={Info} title="Common causes" />
          <PointList items={a.causes} empty="No likely causes listed." />
        </div>
        <Questions items={a.questions_for_doctor} />
        <div className="card flex flex-col p-5 sm:p-6">
          <SectionTitle icon={Stethoscope} title="Who to talk to" />
          <p className="font-serif text-[1.75rem] leading-tight text-ink">{a.recommended_specialist || 'Your GP'}</p>
          <p className="mt-1 text-[0.9375rem] text-ink-3">A good next step for this kind of report.</p>
          <Button to="/app/care" variant="brand" iconRight={ArrowRight} className="mt-5 self-start">Find a specialist</Button>
        </div>
      </div>
      <p className="flex items-start gap-2 text-[0.9375rem] text-ink-3"><Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden /> This explanation is for understanding only and isn’t a diagnosis. Your doctor knows your full history.</p>
    </div>
  )
}
