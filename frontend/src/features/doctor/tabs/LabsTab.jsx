import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight, FileHeart, HelpCircle, Stethoscope, Wrench } from 'lucide-react'
import { api } from '../../../lib/api'
import { LAB_RISK, cn, fmtDate, fmtRelative, riskOf } from '../../../lib/utils'
import { Card } from '../../../components/ui/Card'
import Dialog from '../../../components/ui/Dialog'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { TableScroll, Th } from '../shared'

const STATUS = {
  normal: 'bg-teal-50 text-teal-700',
  low: 'bg-apricot-50 text-apricot-600',
  high: 'bg-apricot-100 text-apricot-600',
  abnormal: 'bg-apricot-50 text-apricot-600',
  unknown: 'bg-cream text-ink-3',
}

function LabBadge({ risk }) {
  const r = LAB_RISK[risk] || riskOf()
  return (
    <span className={cn('badge ring-1 ring-inset', r.bg, r.text, r.ring)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
      {risk || 'Unrated'}
    </span>
  )
}

const abnormalCount = (a) => (a.findings || []).filter((f) => f.status && !['normal', 'unknown'].includes(f.status)).length

export default function LabsTab({ patientId }) {
  const q = useQuery({ queryKey: ['doctor', 'reports', patientId], queryFn: () => api.reports.list(patientId) })
  const [open, setOpen] = useState(null)

  if (q.isLoading) return <Card><div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div></Card>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  const reports = q.data?.reports ?? []
  if (!reports.length) return <Card><EmptyState icon={FileHeart} tone="apricot" title="No lab reports yet" text="When the patient uploads a lab PDF, an AI explainer extracts each test, flags out-of-range values and lists it here." /></Card>

  const a = open?.analysis || {}
  return (
    <>
      <Card pad={false} className="overflow-hidden">
        <ul className="divide-y divide-line/60">
          {reports.map((r, i) => {
            const an = r.analysis || {}
            const n = abnormalCount(an)
            return (
              <motion.li key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <button
                  type="button"
                  onClick={() => setOpen(r)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-cream/80 sm:px-6"
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl icon-tile icon-teal"><FileHeart className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{an.report_type || 'Lab report'}</p>
                      <LabBadge risk={an.overall_risk} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-3">{r.file_name} · {fmtDate(r.created_at)} · {fmtRelative(r.created_at)}</p>
                    {an.short_description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-2">{an.short_description}</p>}
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="num text-lg font-semibold text-ink">{n}<span className="text-sm text-ink-4">/{(an.findings || []).length}</span></p>
                    <p className="text-[0.7rem] text-ink-3">out of range</p>
                  </div>
                  <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-ink-4" />
                </button>
              </motion.li>
            )
          })}
        </ul>
      </Card>

      <Dialog
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        size="xl"
        title={a.report_type || 'Lab report'}
        description={open ? `${open.file_name} · uploaded ${fmtDate(open.created_at, 'd MMM yyyy')}` : undefined}
      >
        {open && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <LabBadge risk={a.overall_risk} />
              {a.recommended_specialist && <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Stethoscope className="h-3 w-3" /> Suggested: {a.recommended_specialist}</span>}
              {a.confidence != null && <span className="text-xs text-ink-4">· AI confidence {Math.round(a.confidence * 100)}%</span>}
            </div>
            {(a.short_description || a.main_risk) && (
              <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink-2">
                {a.short_description && <p className="text-pretty">{a.short_description}</p>}
                {a.main_risk && <p className="mt-1.5"><span className="font-medium text-ink">Main concern:</span> {a.main_risk}</p>}
              </div>
            )}

            {(a.findings || []).length > 0 ? (
              <div>
                <TableScroll className="-mx-6 px-6 sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="border-b border-line/70">
                      <tr><Th className="pl-0">Test</Th><Th>Value</Th><Th>Normal range</Th><Th>Status</Th><Th className="pr-0">Note</Th></tr>
                    </thead>
                    <tbody className="divide-y divide-line/50">
                      {a.findings.map((f, i) => (
                        <tr key={i}>
                          <td className="py-2.5 pl-0 pr-3 font-medium text-ink">{f.test_name}</td>
                          <td className="num whitespace-nowrap px-3 py-2.5 text-ink">{f.value || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-ink-3">{f.normal_range || '—'}</td>
                          <td className="px-3 py-2.5"><span className={cn('badge capitalize', STATUS[f.status] || STATUS.unknown)}>{f.status}</span></td>
                          <td className="py-2.5 pl-3 pr-0 text-xs text-ink-3">{f.note || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            ) : <p className="text-sm text-ink-4">No individual test values could be extracted from this PDF.</p>}

            <div className="grid gap-4 md:grid-cols-3">
              <Bullets icon={HelpCircle} title="Possible causes" items={a.causes} />
              <Bullets icon={Wrench} title="Suggested next steps" items={a.how_to_fix} />
              <Bullets icon={Stethoscope} title="Patient’s questions" items={a.questions_for_doctor} />
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

function Bullets({ icon: Icon, title, items = [] }) {
  if (!items?.length) return null
  return (
    <div className="rounded-2xl border border-line/80 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-3.5 w-3.5 text-ink-3" /> {title}</p>
      <ul className="space-y-1.5">{items.map((t, i) => <li key={i} className="text-sm text-ink-2 before:mr-2 before:text-teal-500 before:content-['•']">{t}</li>)}</ul>
    </div>
  )
}
