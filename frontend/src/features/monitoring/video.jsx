import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, CalendarHeart, Camera, Check, CircleAlert, ClipboardList, Download, Eye, Film, LockKeyhole, MessagesSquare,
  RotateCcw, ScanLine, ShieldCheck, Sparkles, Stethoscope, UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { api, downloadBlob } from '../../lib/api'
import { cn, errorMessage, fmtDate } from '../../lib/utils'
import { quickMetrics, usePoseCapture } from '../pose/usePoseCapture'
import CameraStage, { QualityMeters } from './CameraStage'
import { PointList, SectionTitle, useObjectUrl } from './shared'

const EASE = [0.2, 0.8, 0.2, 1]

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
  good: { cls: 'text-teal-700', dot: 'bg-teal-600', label: 'Good video quality' },
  fair: { cls: 'text-ink-2', dot: 'bg-butter-300', label: 'Fair video quality' },
  poor: { cls: 'text-apricot-600', dot: 'bg-apricot-500', label: 'Poor video quality' },
}

const scoreColor = (v) => (v >= 70 ? '#234A38' : v >= 45 ? '#B8963A' : '#AF4A39')

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
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.8125rem]">
            <span className={cn('inline-flex items-center gap-1.5', q.cls)}><span className={cn('h-1.5 w-1.5 rounded-full', q.dot)} aria-hidden />{q.label}</span>
            {analysis.is_reviewed
              ? <span className="inline-flex items-center gap-1.5 text-teal-700"><UserCheck className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> Reviewed by your doctor</span>
              : <span className="text-ink-3">Awaiting doctor review</span>}
          </div>
          {v.observed_activity && (
            <p className="mt-4 flex items-start gap-2 text-[0.9375rem] text-ink-3"><Eye className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden /> <span><span className="font-medium text-ink-2">What we saw:</span> {v.observed_activity}</span></p>
          )}
          <p className="mt-3 font-serif text-[1.375rem] leading-snug text-ink text-pretty">{v.summary || 'Your review is ready.'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button variant="outline" icon={Download} loading={busy === analysis.id} onClick={() => download(analysis.id)}>Download PDF</Button>
            <span className="font-mono text-[0.8125rem] text-ink-3">{fmtDate(analysis.created_at, 'd MMM yyyy, HH:mm')}</span>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={Activity} title="Movement scores" />
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {scores.map((s, i) => {
              const val = Math.max(0, Math.min(100, Number(s.value) || 0))
              return (
                <div key={s.label} className="border-t border-line pt-3">
                  <dt className="kicker">{s.label}</dt>
                  <dd className="num mt-1 text-[1.5rem] leading-none text-ink">{s.value == null ? '—' : Math.round(val)}</dd>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
                    <motion.div className="h-full rounded-full" style={{ background: scoreColor(val) }} initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: EASE }} />
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] text-ink-3">{s.hint}</p>
                </div>
              )
            })}
          </dl>
        </div>
      </div>

      {analysis.is_reviewed && analysis.doctor_notes && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card border-l-2 border-l-teal-700 p-5 sm:p-6">
          <SectionTitle icon={Stethoscope} title="Notes from your doctor" />
          <p className="whitespace-pre-line text-base leading-relaxed text-ink-2">{analysis.doctor_notes}</p>
        </motion.div>
      )}

      <div className={cn('grid gap-5', !compact && 'md:grid-cols-2')}>
        {(v.posture || v.movement_description) && (
          <div className="card p-5 sm:p-6">
            <SectionTitle icon={ScanLine} title="Posture and movement" />
            {v.posture && <p className="text-[0.9375rem] leading-relaxed text-ink-2"><span className="font-medium text-ink">Posture. </span>{v.posture}</p>}
            {v.movement_description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2"><span className="font-medium text-ink">Movement. </span>{v.movement_description}</p>}
          </div>
        )}
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={Sparkles} title="Key findings" />
          <PointList items={v.key_findings} empty="Nothing notable stood out." />
        </div>
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={CircleAlert} title="Areas to watch" />
          <PointList items={v.risk_areas} empty="No specific areas of concern were noted." />
        </div>
        <div className="card p-5 sm:p-6">
          <SectionTitle icon={ClipboardList} title="Suggestions" />
          <PointList items={v.recommendations} numbered empty="Keep doing regular movement checks." />
        </div>
      </div>
      <p className="flex items-start gap-2 text-[0.9375rem] text-ink-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden /> This AI review supports — never replaces — your doctor’s assessment. The video itself was analysed in memory and not stored.</p>
    </div>
  )
}

/** Locked state: the doctor must enable AI video review first. */
export function VideoLocked({ hasCareTeam }) {
  const steps = [
    { icon: CalendarHeart, title: hasCareTeam ? 'You’re connected to a doctor' : 'Connect with a doctor', done: hasCareTeam },
    { icon: Stethoscope, title: 'Your doctor turns on video review', done: false },
    { icon: Film, title: 'Upload or record a short clip', done: false },
  ]
  return (
    <div className="card p-6 sm:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div>
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-cream text-teal-700 ring-1 ring-inset ring-line" aria-hidden>
            <LockKeyhole className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="font-serif text-[2rem] leading-tight text-balance">
            Video review opens <span className="italic text-teal-700">with your doctor</span>
          </h2>
          <p className="mt-3 max-w-prose text-base text-ink-3">
            AI video review looks closely at walking and balance from a short clip. Because it’s more detailed, a doctor in your care team turns it on when it would help — and reviews the results with you.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hasCareTeam ? (
              <Button to="/app/messages" variant="primary" icon={MessagesSquare}>Message your doctor</Button>
            ) : (
              <Button to="/app/care" variant="primary" icon={CalendarHeart} iconRight={ArrowRight}>Find a doctor</Button>
            )}
            <Button to="/app/check" variant="ghost" icon={ScanLine}>Do a free movement check</Button>
          </div>
        </div>
        <ol className="divide-y divide-line border-y border-line">
          {steps.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }} className="flex items-center gap-3 py-4">
              <span className="num w-6 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
              <s.icon className={cn('h-5 w-5 shrink-0', s.done ? 'text-teal-700' : 'text-ink-3')} strokeWidth={1.8} aria-hidden />
              <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-ink">{s.title}</span>
              {s.done && <Check className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={2.2} aria-label="Done" />}
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
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-butter-100 bg-butter-50 px-4 py-3 text-[#6E5716]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
            <p className="text-[0.9375rem]"><span className="font-medium">This browser couldn’t save the recording.</span> Please upload a video file instead, or try a different browser.</p>
          </div>
          <Button variant="outline" icon={RotateCcw} onClick={cap.reset}>Try recording again</Button>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <video src={url} controls playsInline className="aspect-video w-full rounded-xl border border-line bg-ink object-cover" />
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" icon={Check} onClick={() => {
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
        <span className="text-[0.8125rem] text-ink-3" aria-live="polite">{ready && !cap.live.detected ? 'Step into view to enable recording.' : ''}</span>
      </div>
    </div>
  )
}
