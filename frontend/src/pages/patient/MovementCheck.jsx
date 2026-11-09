import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Bot, Camera, Check, CircleStop, Lightbulb, LineChart, Play, RotateCcw, ShieldCheck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/motion'
import MovementResult from '../../components/charts/MovementResult'
import { api } from '../../lib/api'
import { cn, sleep } from '../../lib/utils'
import { usePoseCapture } from '../../features/pose/usePoseCapture'
import CameraStage, { QualityMeters } from '../../features/monitoring/CameraStage'
import { AnalysingSequence, CheckHistory, PoseFigure, Stepper, TaskPicker } from '../../features/monitoring/movement'
import { taskOf } from '../../features/monitoring/shared'
import { InlineError } from '../../features/care/kit'

const SETUP = [
  { key: 'light', label: 'Bright, even light', hint: 'Face a window or lamp rather than having it behind you.' },
  { key: 'space', label: 'A clear space', hint: 'Move rugs, cables or furniture out of your path.' },
  { key: 'camera', label: 'Camera steady at hip height', hint: 'Prop your phone or laptop on a shelf or table.' },
  { key: 'support', label: 'Something to hold nearby', hint: 'A chair or wall in reach, just in case. Safety first.' },
]

const pane = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function Tick({ on, dashed }) {
  return (
    <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-150', on ? 'border-teal-700 bg-teal-700 text-paper' : dashed ? 'border-dashed border-ink-4' : 'border-ink-4/60 bg-paper')} aria-hidden>
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  )
}

export default function MovementCheck() {
  const qc = useQueryClient()
  const topRef = useRef(null)
  const [step, setStep] = useState('task')
  const [task, setTask] = useState('walk')
  const [ticks, setTicks] = useState({})
  const [guidance, setGuidance] = useState(null)
  const [result, setResult] = useState(null)
  const [frames, setFrames] = useState(null)
  const meta = taskOf(task)
  const cap = usePoseCapture({ durationSec: meta.seconds })

  const submit = useMutation({
    mutationFn: async (f) => {
      const [res] = await Promise.all([
        api.analysis.submit({ task, frames: f, device: navigator.userAgent.slice(0, 120) }),
        sleep(2600), // let the sequence breathe — it reads as care, not lag
      ])
      return res
    },
    onSuccess: (res) => {
      setResult(res)
      setStep('result')
      qc.invalidateQueries({ queryKey: ['patient', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['analysis'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success('Your movement check is saved.')
    },
    onError: (err) => {
      if (err?.response?.status === 422) {
        const d = err.response.data?.detail
        const notes = Array.isArray(d?.notes) && d.notes.length ? d.notes : ['Make sure your whole body stays in view, with good light, for the full recording.']
        setGuidance({ title: typeof d?.message === 'string' ? d.message : 'We couldn’t get a clear enough recording', notes })
        cap.reset()
        setStep('capture')
      }
    },
  })

  // Recording finished → analyse.
  useEffect(() => {
    if (step !== 'capture' || cap.phase !== 'done' || !cap.result) return
    const f = cap.result.frames || []
    if (f.length < 20) {
      setGuidance({ title: 'We couldn’t see you clearly enough', notes: ['Step back until your head and feet are both inside the frame.', 'Turn on a light or face a window, then try again.'] })
      cap.reset()
      return
    }
    setGuidance(null)
    setFrames(f)
    setStep('analyse')
    submit.mutate(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap.phase, cap.result, step])

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  function goTask() {
    cap.reset()
    setStep('task')
  }
  function restart() {
    cap.reset()
    setResult(null)
    setFrames(null)
    setGuidance(null)
    submit.reset()
    setStep('task')
  }

  const ready = cap.phase === 'ready'
  const canStart = ready && cap.live.detected
  const busy = cap.phase === 'countdown' || cap.phase === 'recording'
  const stepProgress = step === 'capture' && cap.phase === 'recording' ? cap.progress : step === 'capture' && ready ? 0.08 : undefined
  const liveHint = ready && !cap.live.detected ? 'Step into view — the button unlocks when we can see you.'
    : ready && !cap.live.inFrame ? 'Almost there — try to fit your whole body in the frame.'
      : cap.phase === 'recording' ? 'Keep going at your own pace.'
        : ready ? 'Looking good. Press start when you’re ready.' : ''

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />
      <PageHeader
        kicker="Movement check · on-device"
        title="A quick, private"
        accent="movement check"
        description="Under a minute, using your camera. We track 33 points on your body to measure walking, balance and tremor in the 4–12 Hz band."
      />

      <Stepper step={step} seconds={meta.seconds} progress={stepProgress} />

      <AnimatePresence mode="wait">
        {step === 'task' && (
          <motion.section key="task" {...pane} aria-labelledby="task-title" className="space-y-5">
            <div>
              <h2 id="task-title" className="text-[1.25rem] font-semibold">What would you like to check?</h2>
              <p className="text-[0.9375rem] text-ink-3">Pick one. You can do the others afterwards.</p>
            </div>
            <TaskPicker value={task} onChange={setTask} />
            <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-line pt-5 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-[0.9375rem] text-ink-3"><ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden /> Video stays on this device. Only keypoints are analysed.</p>
              <Button variant="brand" size="lg" iconRight={ArrowRight} onClick={() => setStep('capture')}>Continue with {meta.label.toLowerCase()}</Button>
            </div>
          </motion.section>
        )}

        {step === 'capture' && (
          <motion.section key="capture" {...pane} aria-label="Record your movement" className="space-y-4">
            <AnimatePresence>
              {guidance && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div role="alert" className="flex items-start gap-3 rounded-xl border border-butter-100 bg-butter-50 px-4 py-3 text-[#7A4F06]">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{guidance.title}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[0.9375rem]">{guidance.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                    </div>
                    <button onClick={() => setGuidance(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-butter-100" aria-label="Dismiss guidance">
                      <X className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              {/* Camera is the hero */}
              <div className="min-w-0 space-y-3">
                <div className={cn('rounded-[1.15rem] p-[2px] transition-colors duration-500',
                  cap.phase === 'recording' ? 'bg-apricot-500' : ['ready', 'countdown'].includes(cap.phase) ? 'bg-teal-600' : 'bg-transparent')}>
                  <CameraStage cap={cap} durationSec={meta.seconds} onOpen={cap.open}
                    idleText="When you turn it on, a skeleton outline follows your movement so you know you’re in view." />
                </div>
                <QualityMeters live={cap.live} phase={cap.phase} />
                <p className="flex items-start gap-2 text-[0.9375rem] text-ink-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
                  The pose model runs in your browser. Only 33 keypoints per frame are sent — no images, no recordings.
                </p>
              </div>

              <div className="card flex min-w-0 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="kicker">Task · about {meta.seconds} s</p>
                    <p className="mt-1 font-serif text-[1.75rem] leading-none text-ink">{meta.label}</p>
                  </div>
                  <Button variant="ghost" icon={ArrowLeft} onClick={goTask} disabled={busy}>Change</Button>
                </div>

                <ol className="mt-5 divide-y divide-line border-y border-line">
                  {meta.how.map((h, i) => (
                    <li key={i} className="flex gap-3 py-2.5 text-[0.9375rem] text-ink-2">
                      <span className="num w-5 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                      {h}
                    </li>
                  ))}
                </ol>

                <fieldset className="mt-5">
                  <legend className="kicker mb-2">Quick setup</legend>
                  <ul>
                    {SETUP.map((s) => {
                      const on = !!ticks[s.key]
                      return (
                        <li key={s.key}>
                          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-cream/70 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600">
                            <input type="checkbox" className="sr-only" checked={on} onChange={() => setTicks((t) => ({ ...t, [s.key]: !t[s.key] }))} />
                            <Tick on={on} />
                            <span className="min-w-0">
                              <span className={cn('block text-[0.9375rem] font-medium', on ? 'text-ink-3 line-through decoration-ink-4/50' : 'text-ink')}>{s.label}</span>
                              <span className="block text-[0.8125rem] text-ink-3">{s.hint}</span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                    <li className="flex items-start gap-3 px-2 py-2">
                      <Tick on={cap.live.inFrame && ready} dashed />
                      <span>
                        <span className="block text-[0.9375rem] font-medium text-ink">Body in frame</span>
                        <span className="block text-[0.8125rem] text-ink-3">Ticks itself when we can see you clearly.</span>
                      </span>
                    </li>
                  </ul>
                </fieldset>

                <div className="mt-auto pt-5">
                  {cap.phase === 'recording' ? (
                    <Button variant="outline" size="lg" icon={CircleStop} className="w-full" onClick={cap.stop}>Finish now</Button>
                  ) : cap.phase === 'countdown' ? (
                    <Button variant="brand" size="lg" className="w-full" disabled>Starting in {cap.countdown}…</Button>
                  ) : ready ? (
                    <Button variant="brand" size="lg" icon={Play} className="w-full" disabled={!canStart} onClick={cap.start}>Start recording</Button>
                  ) : (
                    <Button variant="brand" size="lg" icon={Camera} className="w-full" loading={cap.phase === 'loading'} onClick={cap.open}>
                      {cap.phase === 'loading' ? 'Starting camera…' : cap.phase === 'error' ? 'Try the camera again' : 'Turn on camera'}
                    </Button>
                  )}
                  <p className="mt-2 min-h-[1.25rem] text-center text-[0.8125rem] text-ink-3" aria-live="polite">{liveHint}</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {step === 'analyse' && (
          <motion.section key="analyse" {...pane} aria-label="Analysing">
            {submit.isError && submit.error?.response?.status !== 422 ? (
              <div className="card p-5 sm:p-6">
                <InlineError error={submit.error} fallback="We couldn’t send your keypoints for analysis." />
                <p className="mt-4 text-[0.9375rem] text-ink-3">Your keypoints are still on this page — nothing was lost, so you can simply try again.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="brand" icon={RotateCcw} onClick={() => submit.mutate(frames)}>Send keypoints again</Button>
                  <Button variant="outline" onClick={() => { submit.reset(); cap.reset(); setStep('capture') }}>Record again</Button>
                </div>
              </div>
            ) : (
              <AnalysingSequence frames={frames?.length} task={task} />
            )}
          </motion.section>
        )}

        {step === 'result' && result && (
          <motion.section key="result" {...pane} aria-labelledby="result-title" className="space-y-5">
            <p className="sr-only" role="status" aria-live="polite">
              Results ready. Motor index {Math.round(result.motor_index?.overall ?? 0)} out of 100.
            </p>
            <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="kicker">{meta.label} · saved just now</p>
                <h2 id="result-title" className="mt-1 font-serif text-[2rem] leading-tight text-ink">Here’s what we <span className="text-teal-600">measured</span></h2>
                <Link to="/app" className="link mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[0.9375rem]"><LineChart className="h-4 w-4" strokeWidth={1.8} aria-hidden /> View your trend</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" icon={RotateCcw} onClick={restart}>Do another check</Button>
                <Button variant="outline" icon={Bot} to="/app/assistant">Ask Medo about this</Button>
              </div>
            </div>
            <MovementResult result={result} figure={<PoseFigure task={task} active />} />
          </motion.section>
        )}
      </AnimatePresence>

      {step !== 'analyse' && <CheckHistory />}
    </div>
  )
}
