import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, CalendarHeart, Camera, CircleAlert, ClipboardList, Download, Eye, Film, LockKeyhole, MessagesSquare,
  RotateCcw, ScanLine, ShieldCheck, Sparkles, Stethoscope, UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ScoreBar } from '../../components/ui/Data'
import { Notice } from '../../components/ui/Feedback'
import { api, downloadBlob } from '../../lib/api'
import { cn, errorMessage, fmtDate } from '../../lib/utils'
import { quickMetrics, usePoseCapture } from '../pose/usePoseCapture'
import CameraStage, { QualityMeters } from './CameraStage'
import { PointList, SectionTitle, useObjectUrl } from './shared'

/** Download the movement-review PDF, with a per-id loading flag. */
export function usePdfDownload() {
  const [busy, setBusy] = useState(null)
  const download = useCallback(async (id) => {
    setBusy(id)
    try {
      const res = await api.video.pdf(id)
      downloadBlob(res.data, `medoshield-movement-${String(id).slice(-6)}.pdf`)
    } catch (e) {
      toast.error(errorMessage(e, 'We couldn’t prepare the PDF. Please try again.'))
    } finally {
      setBusy(null)
    }
  }, [])
  return { busy, download }
}

const QUALITY = {
  good: { tone: 'teal', label: 'Good video quality' },
  fair: { tone: 'ink', label: 'Fair video quality' },
  poor: { tone: 'apricot', label: 'Poor video quality' },
}

/** The structured AI movement review (backend VideoAnalysis). */
export function VideoResult({ analysis, compact = false }) {
  const { busy, download } = usePdfDownload()
  if (!analysis) return null
  const v = analysis.video_analysis || {}
  const q = QUALITY[v.video_quality] || QUALITY.fair
  const scores = [
    { label: 'Gait quality', value: v.gait_quality_score, hint: 'Overall walking pattern' },
    { label: 'Balance', value: v.balance_score, hint: 'Steadiness of the trunk' },
    { label: 'Stride consistency', value: v.stride_consistency, hint: 'How even each step is' },
    { label: 'Movement fluidity', value: v.movement_fluidity, hint: 'Smoothness of motion' },
  ]
  return (
    <div className="space-y-5">
      <div className={cn('grid gap-5', !compact && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]')}>
        <div className="card card-pad">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={q.tone} dot>{q.label}</Badge>
            {analysis.is_reviewed ? <Badge tone="teal"><UserCheck className="h-3 w-3" /> Reviewed by your doctor</Badge> : <Badge tone="ink">Awaiting doctor review</Badge>}
          </div>
          {v.observed_activity && (
            <p className="flex items-start gap-2 text-sm text-ink-3"><Eye className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" /> <span><span className="font-medium text-ink-2">What we saw:</span> {v.observed_activity}</span></p>
          )}
          <p className="mt-3 text-[1.05rem] leading-relaxed text-ink text-pretty">{v.summary || 'Your review is ready.'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={Download} loading={busy === analysis.id} onClick={() => download(analysis.id)}>Download PDF</Button>
            <span className="text-xs text-ink-4">{fmtDate(analysis.created_at, 'd MMM yyyy, HH:mm')}</span>
          </div>
        </div>
        <div className="card card-pad">
          <SectionTitle icon={Activity} title="Movement scores" />
          <div className="grid gap-4 sm:grid-cols-2">
            {scores.map((s) => <ScoreBar key={s.label} label={s.label} value={s.value} hint={s.hint} />)}
          </div>
        </div>
      </div>

      {analysis.is_reviewed && analysis.doctor_notes && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card card-pad card-tint-teal">
          <SectionTitle icon={Stethoscope} tone="teal" title="Notes from your doctor" />
          <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-2">{analysis.doctor_notes}</p>
        </motion.div>
      )}

      <div className={cn('grid gap-5', !compact && 'md:grid-cols-2')}>
        {(v.posture || v.movement_description) && (
          <div className="card card-pad">
            <SectionTitle icon={ScanLine} tone="teal" title="Posture & movement" />
            {v.posture && <p className="text-[0.9375rem] leading-relaxed text-ink-2"><span className="font-medium text-ink">Posture. </span>{v.posture}</p>}
            {v.movement_description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2"><span className="font-medium text-ink">Movement. </span>{v.movement_description}</p>}
          </div>
        )}
        <div className="card card-pad">
          <SectionTitle icon={Sparkles} title="Key findings" />
          <PointList items={v.key_findings} empty="Nothing notable stood out." />
        </div>
        <div className="card card-pad">
          <SectionTitle icon={CircleAlert} tone="teal" title="Areas to watch" />
          <PointList items={v.risk_areas} tone="teal" empty="No specific areas of concern were noted." />
        </div>
        <div className="card card-pad">
          <SectionTitle icon={ClipboardList} tone="teal" title="Suggestions" />
          <PointList items={v.recommendations} numbered tone="teal" empty="Keep doing regular movement checks." />
        </div>
      </div>
      <Notice tone="info" icon={ShieldCheck}>This AI review supports — never replaces — your doctor’s assessment. The video itself was analysed in memory and not stored.</Notice>
    </div>
  )
}

/** Locked state: the doctor must enable AI video review first. */
export function VideoLocked({ hasCareTeam }) {
  const steps = [
    { icon: CalendarHeart, title: hasCareTeam ? 'You’re connected' : 'Connect with a doctor', done: hasCareTeam },
    { icon: Stethoscope, title: 'Your doctor enables video review', done: false },
    { icon: Film, title: 'Upload or record a short clip', done: false },
  ]
  return (
    <div className="card card-tint-teal relative overflow-hidden p-6 sm:p-10">
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.span initial={{ rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70 mb-5 h-16 w-16 rounded-[1.6rem]">
            <LockKeyhole className="h-7 w-7" strokeWidth={1.8} />
          </motion.span>
          <h2 className="text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem] text-balance">
            Video review opens <span className="serif-accent">with your doctor</span>
          </h2>
          <p className="mt-3 max-w-lg text-[0.9375rem] text-ink-3 text-pretty">
            AI video review looks closely at walking and balance from a short clip. Because it’s more detailed, a doctor in your care team turns it on when they feel it would help — and reviews the results with you.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hasCareTeam ? (
              <Button to="/app/messages" variant="primary" icon={MessagesSquare}>Ask your doctor</Button>
            ) : (
              <Button to="/app/care" variant="primary" icon={CalendarHeart} iconRight={ArrowRight}>Find a doctor</Button>
            )}
            <Button to="/app/check" variant="ghost" icon={ScanLine}>Try a free movement check</Button>
          </div>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
              className={cn('flex items-center gap-3 rounded-2xl border p-4', s.done ? 'border-teal-100 bg-teal-50/70' : 'border-line/80 bg-paper/80')}>
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.done ? 'icon-tile icon-teal' : 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70')}><s.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{s.title}</span>
              <span className="num text-xs text-ink-4">0{i + 1}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/** 10-second in-browser recording with live skeleton; hands back a File + pose metrics. */
export function VideoRecorder({ onReady }) {
  const cap = usePoseCapture({ durationSec: 10, recordVideo: true })
  const blob = cap.result?.videoBlob
  const url = useObjectUrl(blob)

  if (cap.phase === 'done' && cap.result) {
    if (!blob || !blob.size) {
      return (
        <div className="space-y-3">
          <Notice tone="warn" icon={CircleAlert} title="This browser couldn’t save the recording">Please upload a video file instead, or try a different browser.</Notice>
          <Button variant="outline" icon={RotateCcw} onClick={cap.reset}>Try again</Button>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <video src={url} controls playsInline className="aspect-video w-full rounded-3xl border border-line bg-cream object-cover" />
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" icon={Sparkles} onClick={() => {
            const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
            onReady(new File([blob], `recording.${ext}`, { type: blob.type || 'video/webm' }), quickMetrics(cap.result.frames))
          }}>Use this recording</Button>
          <Button variant="outline" icon={RotateCcw} onClick={cap.reset}>Retake</Button>
        </div>
      </div>
    )
  }

  const ready = cap.phase === 'ready'
  return (
    <div className="space-y-3">
      <CameraStage cap={cap} durationSec={10} onOpen={cap.open} idleTitle="Record a 10-second clip"
        idleText="Walk naturally across the room, full body in view. This clip is sent for AI review, so it’s only kept in memory while it’s analysed." />
      <QualityMeters live={cap.live} phase={cap.phase} />
      <div className="flex flex-wrap items-center gap-3">
        {ready ? (
          <Button variant="brand" icon={Camera} disabled={!cap.live.detected} onClick={cap.start}>Start 10-second recording</Button>
        ) : cap.phase === 'recording' || cap.phase === 'countdown' ? (
          <Button variant="outline" disabled>{cap.phase === 'countdown' ? `Starting in ${cap.countdown}…` : 'Recording…'}</Button>
        ) : (
          <Button variant="brand" icon={Camera} loading={cap.phase === 'loading'} onClick={cap.open}>Turn on camera</Button>
        )}
        {ready && !cap.live.detected && <span className="text-xs text-ink-4">Step into view to enable recording.</span>}
      </div>
    </div>
  )
}
