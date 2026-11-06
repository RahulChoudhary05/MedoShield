import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Download, Film, History, RotateCcw, ShieldCheck, Sparkles, Upload, UserCheck, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/Data'
import Dialog from '../../components/ui/Dialog'
import { EmptyState, ErrorState, Notice, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import { api } from '../../lib/api'
import { errorMessage, fmtDate, fmtRelative } from '../../lib/utils'
import { Dropzone, UploadProgress, fileSize, useObjectUrl } from '../../features/monitoring/shared'
import { VideoLocked, VideoRecorder, VideoResult, usePdfDownload } from '../../features/monitoring/video'

const MAX_MB = 40

function validateVideo(f) {
  if (!f.type.startsWith('video/')) return 'Please choose a video file (MP4, MOV or WebM).'
  if (f.size > MAX_MB * 1024 * 1024) return `That video is ${fileSize(f.size)}. The limit is ${MAX_MB} MB — try a shorter clip.`
  return null
}

function scoreAvg(v = {}) {
  const s = [v.gait_quality_score, v.balance_score, v.stride_consistency, v.movement_fluidity].filter((x) => typeof x === 'number')
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null
}

function HistoryList({ onOpen }) {
  const { busy, download } = usePdfDownload()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['video', 'history'], queryFn: () => api.video.history() })
  const rows = data?.analyses || []
  return (
    <section className="card card-pad" aria-labelledby="video-history">
      <h2 id="video-history" className="mb-4 flex items-center gap-2.5 text-base font-semibold">
        <span className="icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70 h-8 w-8 rounded-xl"><History className="h-4 w-4" /></span>
        Previous reviews
      </h2>
      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Film} tone="teal" className="py-8" title="No reviews yet" text="Your AI video reviews and your doctor’s notes will be kept here." />
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.map((a) => {
            const avg = scoreAvg(a.video_analysis)
            return (
              <li key={a.id} className="flex items-center gap-2 py-2">
                <button onClick={() => onOpen(a)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-cream">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70 font-display text-sm font-semibold">{avg ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{a.video_analysis?.observed_activity || 'Movement review'}</span>
                    <span className="block truncate text-xs text-ink-3">{fmtDate(a.created_at, 'd MMM yyyy')} · {fmtRelative(a.created_at)}</span>
                  </span>
                  {a.is_reviewed ? <Badge tone="teal" className="hidden sm:inline-flex"><UserCheck className="h-3 w-3" /> Reviewed</Badge> : <Badge tone="ink" className="hidden sm:inline-flex">Pending review</Badge>}
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <Button variant="ghost" size="icon" aria-label="Download PDF" loading={busy === a.id} icon={busy === a.id ? undefined : Download} onClick={() => download(a.id)} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Analyser() {
  const qc = useQueryClient()
  const [mode, setMode] = useState('upload')
  const [file, setFile] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const preview = useObjectUrl(file)

  const analyse = useMutation({
    mutationFn: () => api.video.analyze(file, metrics, (e) => setProgress(e.total ? e.loaded / e.total : 0)),
    onMutate: () => setProgress(0),
    onSuccess: (res) => {
      setResult(res)
      setFile(null)
      qc.invalidateQueries({ queryKey: ['video', 'history'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      qc.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      toast.success('Your video review is ready.')
    },
    onError: (e) => toast.error(errorMessage(e, 'We couldn’t analyse that video. Please try again.')),
  })

  function clear() {
    setFile(null)
    setMetrics(null)
    analyse.reset()
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-semibold">Your <span className="serif-accent">movement review</span></h2>
          <Button variant="outline" icon={RotateCcw} onClick={() => { setResult(null); clear() }}>Analyse another video</Button>
        </div>
        <VideoResult analysis={result} />
      </div>
    )
  }

  return (
    <div className="card card-pad">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Add a short walking clip</h2>
          <p className="text-sm text-ink-3">10–30 seconds of walking, with your whole body in view, works best.</p>
        </div>
        {!file && (
          <Segmented value={mode} onChange={setMode} size="sm" options={[{ value: 'upload', label: 'Upload', icon: Upload }, { value: 'record', label: 'Record', icon: Video }]} />
        )}
      </div>

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {preview && <video src={preview} controls playsInline muted className="aspect-video w-full rounded-3xl border border-line bg-cream object-cover" />}
            <div className="flex flex-col">
              <div className="flex items-start gap-3 rounded-2xl border border-line bg-cream/60 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70"><Film className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="text-xs text-ink-3">{fileSize(file.size)}{metrics ? ` · ${metrics.frames} pose frames` : ''}</p>
                </div>
                {!analyse.isPending && (
                  <button onClick={clear} aria-label="Remove video" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-ink/5"><X className="h-4 w-4" /></button>
                )}
              </div>
              <div className="mt-4">
                {analyse.isPending ? (
                  <UploadProgress progress={progress} uploadingLabel="Uploading securely" processingLabel="AI is watching your movement…" processingHint="This usually takes 20–60 seconds. Please keep this page open." />
                ) : (
                  <Button variant="brand" size="lg" icon={Sparkles} className="w-full" onClick={() => analyse.mutate()}>Analyse my movement</Button>
                )}
              </div>
              <p className="mt-auto flex items-start gap-2 pt-4 text-xs text-ink-4">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" /> The video is analysed in memory and discarded. Only the written review is saved.
              </p>
            </div>
          </motion.div>
        ) : mode === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Dropzone accept="video/*" validate={validateVideo} onFile={(f) => { setFile(f); setMetrics(null) }} icon={Film}
              title="Drop a video here" hint={`MP4, MOV or WebM, up to ${MAX_MB} MB. Filmed from the side or front, in good light.`} />
          </motion.div>
        ) : (
          <motion.div key="record" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <VideoRecorder onReady={(f, m) => { setFile(f); setMetrics(m) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function VideoReview() {
  const [open, setOpen] = useState(null)
  const access = useQuery({ queryKey: ['video', 'access'], queryFn: () => api.video.access() })
  const a = access.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="AI video review" title="A closer look, " accent="with your doctor"
        subtitle="A short clip lets our AI describe your walking, balance and posture in detail — so you and your doctor can talk it through." />

      {access.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-14 rounded-2xl" /><Skeleton className="h-80 rounded-3xl" /></div>
      ) : access.isError ? (
        <ErrorState error={access.error} onRetry={access.refetch} />
      ) : !a?.is_unlocked ? (
        <VideoLocked hasCareTeam={!!a?.has_care_team} />
      ) : (
        <>
          <Notice tone="success" icon={UserCheck} title={`Enabled by ${a.unlocked_by || 'your doctor'}`}>
            {a.unlocked_at ? `Turned on ${fmtRelative(a.unlocked_at)}. ` : ''}Your doctor is notified about each new review and can add notes.
          </Notice>
          <Analyser />
        </>
      )}

      {a?.is_unlocked && <HistoryList onOpen={setOpen} />}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)} size="xl" title="Movement review" description={open ? fmtDate(open.created_at, 'EEEE d MMMM yyyy, HH:mm') : undefined}>
        {open && <VideoResult analysis={open} compact />}
      </Dialog>
    </div>
  )
}
