import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, FileHeart, FileText, LockKeyhole, RotateCcw, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import { PageHeader } from '../../components/ui/motion'
import { api } from '../../lib/api'
import { errorMessage, fmtDate, fmtRelative } from '../../lib/utils'
import { Dropzone, LevelPill, UploadProgress, fileSize } from '../../features/monitoring/shared'
import { ReportResult } from '../../features/monitoring/reports'
import { Empty, InlineError, Section, SkeletonRows } from '../../features/care/kit'

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
    <Section id="reports-history" kicker={rows.length ? `${rows.length} saved` : 'History'} title="Previous reports" className="mt-5">
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : isError ? (
        <InlineError error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Empty icon={FileHeart} text="Explained reports are saved here so you can revisit them before appointments."
          action={<Button variant="outline" icon={Upload} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Upload a report</Button>} />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onOpen(r)} className="group grid min-h-[44px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 text-left sm:grid-cols-[8rem_minmax(0,1fr)_auto_auto]">
                <span className="font-mono text-[0.8125rem] text-ink-3">{fmtDate(r.created_at, 'd MMM yyyy')}</span>
                <span className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
                  <span className="block truncate font-medium text-ink">{r.analysis?.report_type || r.file_name || 'Lab report'}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{r.file_name ? `${r.file_name} · ` : ''}{fmtRelative(r.created_at)}</span>
                </span>
                <LevelPill level={r.analysis?.overall_risk} className="row-start-1 justify-self-end sm:row-start-auto" />
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px] sm:block" strokeWidth={1.8} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

const HOW = [
  { t: 'Upload a PDF', d: 'Straight from your lab’s portal or email.' },
  { t: 'We read every value', d: 'Each result is compared with its usual range.' },
  { t: 'Get a clear explanation', d: 'Plus questions to bring to your doctor.' },
]

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
    <div>
      <PageHeader
        kicker="Lab reports"
        title="Understand your"
        accent="lab results"
        description="Upload a PDF and we’ll explain each result in plain language — what it means, what can help, and what to ask your doctor."
        actions={result && <Button variant="outline" icon={RotateCcw} onClick={reset}>Explain another report</Button>}
      />

      <AnimatePresence mode="wait">
        {result ? (
          <motion.section key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4" aria-labelledby="report-title" aria-live="polite">
            <h2 id="report-title" className="font-serif text-[2rem] leading-tight">Your report, <span className="italic text-teal-700">explained</span></h2>
            <ReportResult report={result} />
          </motion.section>
        ) : (
          <motion.section key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5 sm:p-6" aria-label="Upload a report">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
              <div className="min-w-0">
                {file ? (
                  <div className="flex h-full flex-col justify-center gap-4 rounded-xl border border-line p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cream text-teal-700 ring-1 ring-inset ring-line"><FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{file.name}</p>
                        <p className="font-mono text-[0.8125rem] text-ink-3">{fileSize(file.size)} · PDF</p>
                      </div>
                      {!upload.isPending && (
                        <button onClick={() => setFile(null)} aria-label="Remove file" className="grid h-11 w-11 place-items-center rounded-lg text-ink-3 hover:bg-ink/5"><X className="h-4 w-4" strokeWidth={1.8} /></button>
                      )}
                    </div>
                    {upload.isPending ? (
                      <UploadProgress progress={progress} processingLabel="Reading your report…" processingHint="Finding each test, its range and what it means. Usually under a minute." />
                    ) : (
                      <Button variant="brand" size="lg" icon={FileHeart} onClick={() => upload.mutate(file)}>Explain my report</Button>
                    )}
                  </div>
                ) : (
                  <Dropzone accept="application/pdf,.pdf" validate={validatePdf} onFile={setFile} icon={FileHeart}
                    title="Drop your lab report here" hint={`Blood tests, thyroid and metabolic panels and more. PDF only, up to ${MAX_MB} MB.`} />
                )}
              </div>
              <aside className="flex flex-col justify-center">
                <p className="kicker mb-2">How it works</p>
                <ol className="divide-y divide-line border-y border-line">
                  {HOW.map((s, i) => (
                    <li key={s.t} className="flex items-start gap-3 py-3">
                      <span className="num w-5 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <p className="font-medium text-ink">{s.t}</p>
                        <p className="text-[0.9375rem] text-ink-3">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 flex items-start gap-2 text-[0.9375rem] text-ink-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden /> We keep the explanation, not the file. Only your care team can see your reports.
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
