import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, FileHeart, FileText, History, LockKeyhole, RotateCcw, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Data'
import Dialog from '../../components/ui/Dialog'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { errorMessage, fmtDate, fmtRelative } from '../../lib/utils'
import { Dropzone, LevelPill, UploadProgress, fileSize } from '../../features/monitoring/shared'
import { ReportResult } from '../../features/monitoring/reports'

const MAX_MB = 15

function validatePdf(f) {
  const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
  if (!isPdf) return 'Please choose a PDF file. Photos of reports aren’t supported yet.'
  if (f.size > MAX_MB * 1024 * 1024) return `That file is ${fileSize(f.size)}. The limit is ${MAX_MB} MB.`
  return null
}

function ReportsList({ onOpen }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['reports', 'list'], queryFn: () => api.reports.list() })
  const rows = data?.reports || []
  return (
    <section className="card card-pad" aria-labelledby="reports-history">
      <h2 id="reports-history" className="mb-4 flex items-center gap-2.5 text-base font-semibold">
        <span className="icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70 h-8 w-8 rounded-xl"><History className="h-4 w-4" /></span>
        Previous reports
      </h2>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileHeart} tone="teal" className="py-8" title="No reports yet" text="Explained reports are saved here so you can come back to them before appointments." />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((r, i) => (
            <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button onClick={() => onOpen(r)} className="group flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-cream/50 p-3 text-left transition hover:border-ink-4/40 hover:bg-cream hover:shadow-soft">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70"><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.analysis?.report_type || r.file_name || 'Lab report'}</span>
                  <span className="block truncate text-xs text-ink-3">{fmtDate(r.created_at)} · {fmtRelative(r.created_at)}</span>
                </span>
                <LevelPill level={r.analysis?.overall_risk} className="hidden sm:inline-flex" />
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function LabReports() {
  const qc = useQueryClient()
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(null)

  const upload = useMutation({
    mutationFn: (f) => api.reports.analyze(f, (e) => setProgress(e.total ? e.loaded / e.total : 0)),
    onMutate: () => setProgress(0),
    onSuccess: (res) => {
      setResult(res)
      setFile(null)
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      qc.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
    },
    onError: (e) => toast.error(errorMessage(e, 'We couldn’t read that report. Please try again.')),
  })

  function reset() {
    setResult(null)
    setFile(null)
    upload.reset()
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Lab reports" title="Understand your" accent="lab results"
        subtitle="Upload a PDF report and we’ll explain each result in plain language — what it means, what can help, and what to ask your doctor." />

      <AnimatePresence mode="wait">
        {result ? (
          <motion.section key="result" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4" aria-labelledby="report-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="report-title" className="text-2xl font-semibold">Your report, <span className="serif-accent">explained</span></h2>
              <Button variant="outline" icon={RotateCcw} onClick={reset}>Explain another report</Button>
            </div>
            <ReportResult report={result} />
          </motion.section>
        ) : (
          <motion.section key="upload" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card card-pad" aria-label="Upload a report">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                {file ? (
                  <div className="flex h-full flex-col justify-center gap-4 rounded-3xl border border-line bg-cream/60 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70"><FileText className="h-6 w-6" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{file.name}</p>
                        <p className="text-xs text-ink-3">{fileSize(file.size)} · PDF</p>
                      </div>
                      {!upload.isPending && (
                        <button onClick={() => setFile(null)} aria-label="Remove file" className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-ink/5"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                    {upload.isPending ? (
                      <UploadProgress progress={progress} processingLabel="Reading your report…" processingHint="Finding each test, its range and what it means. Usually under a minute." />
                    ) : (
                      <Button variant="brand" size="lg" icon={Sparkles} onClick={() => upload.mutate(file)}>Explain my report</Button>
                    )}
                  </div>
                ) : (
                  <Dropzone accept="application/pdf,.pdf" validate={validatePdf} onFile={setFile} icon={FileHeart} tone="teal"
                    title="Drop your lab report here" hint={`Blood tests, thyroid panels, metabolic panels and more. PDF only, up to ${MAX_MB} MB.`} />
                )}
              </div>
              <aside className="flex flex-col justify-center gap-4">
                {[
                  { n: '1', t: 'Upload a PDF', d: 'Straight from your lab’s portal or email.' },
                  { n: '2', t: 'We read every value', d: 'Each result is compared with its usual range.' },
                  { n: '3', t: 'Get a clear explanation', d: 'Plus questions to bring to your doctor.' },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">{s.n}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{s.t}</p>
                      <p className="text-sm text-ink-3">{s.d}</p>
                    </div>
                  </div>
                ))}
                <p className="flex items-start gap-2 rounded-2xl bg-cream px-3.5 py-3 text-xs text-ink-3">
                  <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" /> We keep the explanation, not the file. Only your care team can see your reports.
                </p>
              </aside>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <ReportsList onOpen={setOpen} />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)} size="xl" title={open?.analysis?.report_type || 'Lab report'}
        description={open ? `${open.file_name || 'Report'} · uploaded ${fmtDate(open.created_at, 'd MMM yyyy')}` : undefined}>
        {open && <ReportResult report={open} compact />}
      </Dialog>
    </div>
  )
}
