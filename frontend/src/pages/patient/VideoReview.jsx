import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Download, Film, RotateCcw, ShieldCheck, Upload, UserCheck, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import Segmented from '../../components/ui/Segmented'
import { PageHeader } from '../../components/ui/motion'
import { api } from '../../lib/api'
import { errorMessage, fmtDate, fmtRelative } from '../../lib/utils'
import { Dropzone, UploadProgress, fileSize, useObjectUrl } from '../../features/monitoring/shared'
import { VideoLocked, VideoRecorder, VideoResult, usePdfDownload } from '../../features/monitoring/video'
import { Empty, InlineError, Section, SkeletonRows } from '../../features/care/kit'

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
    <Section id="video-history" kicker={rows.length ? `${rows.length} saved` : 'History'} title="Previous reviews" className="mt-5">
      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : isError ? (
        <InlineError error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Empty icon={Film} text="Your AI video reviews and your doctor’s notes are kept here."
          action={<Button variant="outline" icon={Upload} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Add a walking clip</Button>} />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {rows.map((a) => {
            const avg = scoreAvg(a.video_analysis)
            return (
              <li key={a.id} className="flex items-center gap-2 py-2">
                <button onClick={() => onOpen(a)} className="group flex min-h-[44px] min-w-0 flex-1 items-center gap-4 rounded-lg py-1.5 text-left">
                  <span className="w-12 shrink-0">
                    <span className="num block text-[1.375rem] leading-none text-ink">{avg ?? '—'}</span>
                    <span className="mt-1 block font-mono text-[0.8125rem] text-ink-3">avg</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{a.video_analysis?.observed_activity || 'Movement review'}</span>
                    <span className="block truncate font-mono text-[0.8125rem] text-ink-3">{fmtDate(a.created_at, 'd MMM yyyy')} · {fmtRelative(a.created_at)}</span>
                  </span>
                  <span className="hidden items-center gap-1.5 font-mono text-[0.8125rem] sm:inline-flex">
                    {a.is_reviewed ? <><UserCheck className="h-3.5 w-3.5 text-teal-700" strokeWidth={1.8} aria-hidden /><span className="text-teal-700">Reviewed</span></> : <span className="text-ink-3">Pending review</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} aria-hidden />
                </button>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Download PDF for review on ${fmtDate(a.created_at, 'd MMM yyyy')}`} loading={busy === a.id} icon={busy === a.id ? undefined : Download} onClick={() => download(a.id)} />
              </li>
            )
          })}
        </ul>
      )}
    </Section>
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
      <div className="space-y-4" aria-live="polite">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-[2rem] leading-tight">Your <span className="text-teal-600">movement review</span></h2>
          <Button variant="outline" icon={RotateCcw} onClick={() => { setResult(null); clear() }}>Analyse another video</Button>
        </div>
        <VideoResult analysis={result} />
      </div>
    )
  }

  return (
    <Section
      kicker="10–30 seconds of walking"
      title="Add a short walking clip"
      description="Your whole body in view, filmed from the side or front, works best."
      action={!file && <Segmented value={mode} onChange={setMode} options={[{ value: 'upload', label: 'Upload', icon: Upload }, { value: 'record', label: 'Record', icon: Video }]} />}
    >
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {preview && <video src={preview} controls playsInline muted className="aspect-video w-full rounded-xl border border-line bg-ink object-cover" />}
            <div className="flex flex-col">
              <div className="flex items-start gap-3 border-b border-line pb-4">
                <Film className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{file.name}</p>
                  <p className="font-mono text-[0.8125rem] text-ink-3">{fileSize(file.size)}{metrics ? ` · ${metrics.frames} pose frames` : ''}</p>
                </div>
                {!analyse.isPending && (
                  <button onClick={clear} aria-label="Remove video" className="grid h-11 w-11 place-items-center rounded-lg text-ink-3 hover:bg-ink/5"><X className="h-4 w-4" strokeWidth={1.8} /></button>
                )}
              </div>
              <div className="mt-4">
                {analyse.isPending ? (
                  <UploadProgress progress={progress} uploadingLabel="Uploading securely" processingLabel="AI is reviewing your movement…" processingHint="This usually takes 20–60 seconds. Please keep this page open." />
                ) : (
                  <Button variant="brand" size="lg" icon={Film} className="w-full" onClick={() => analyse.mutate()}>Analyse my movement</Button>
                )}
              </div>
              <p className="mt-auto flex items-start gap-2 pt-4 text-[0.9375rem] text-ink-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden /> The video is analysed in memory and discarded. Only the written review is saved.
              </p>
            </div>
          </motion.div>
        ) : mode === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Dropzone accept="video/*" validate={validateVideo} onFile={(f) => { setFile(f); setMetrics(null) }} icon={Film}
              title="Drop a video here" hint={`MP4, MOV or WebM, up to ${MAX_MB} MB. Filmed in good light.`} />
          </motion.div>
        ) : (
          <motion.div key="record" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <VideoRecorder onReady={(f, m) => { setFile(f); setMetrics(m) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  )
}

export default function VideoReview() {
  const [open, setOpen] = useState(null)
  const access = useQuery({ queryKey: ['video', 'access'], queryFn: () => api.video.access() })
  const a = access.data

  return (
    <div>
      <PageHeader
        kicker="AI video review"
        title="A closer look,"
        accent="with your doctor"
        description="A short clip lets our AI describe your walking, balance and posture in detail — so you and your doctor can talk it through."
      />

      {access.isLoading ? (
        <div className="space-y-4" aria-busy="true"><div className="skeleton h-14 rounded-xl" /><div className="skeleton h-80 rounded-3xl" /></div>
      ) : access.isError ? (
        <InlineError error={access.error} onRetry={access.refetch} />
      ) : !a?.is_unlocked ? (
        <VideoLocked hasCareTeam={!!a?.has_care_team} />
      ) : (
        <div className="space-y-5">
          <p className="flex items-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-[0.9375rem] text-teal-800">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
            <span><span className="font-medium">Enabled by {a.unlocked_by || 'your doctor'}.</span> {a.unlocked_at ? `Turned on ${fmtRelative(a.unlocked_at)}. ` : ''}Your doctor is notified about each new review and can add notes.</span>
          </p>
          <Analyser />
        </div>
      )}

      {a?.is_unlocked && <HistoryList onOpen={setOpen} />}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)} size="xl" title="Movement review" description={open ? fmtDate(open.created_at, 'EEEE d MMMM yyyy, HH:mm') : undefined}>
        {open && <VideoResult analysis={open} compact />}
      </Dialog>
    </div>
  )
}
