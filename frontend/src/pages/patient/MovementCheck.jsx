import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Bot, Camera, Check, CircleStop, LineChart, Play, RotateCcw, ShieldCheck, Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Data'
import { ErrorState, Notice } from '../../components/ui/Feedback'
import MovementResult from '../../components/charts/MovementResult'
import { api } from '../../lib/api'
import { cn, sleep } from '../../lib/utils'
import { usePoseCapture } from '../../features/pose/usePoseCapture'
import CameraStage, { QualityMeters } from '../../features/monitoring/CameraStage'
import { AnalysingSequence, CheckHistory, Stepper, TaskPicker } from '../../features/monitoring/movement'
import { TONE_SOFT, taskOf } from '../../features/monitoring/shared'

const SETUP = [
  { key: 'light', label: 'Bright, even light', hint: 'Face a window or lamp rather than having it behind you.' },
  { key: 'space', label: 'A clear space', hint: 'Move rugs, cables or furniture out of your path.' },
  { key: 'camera', label: 'Camera steady at hip height', hint: 'Prop your phone or laptop on a shelf or table.' },
  { key: 'support', label: 'Something to hold nearby', hint: 'A chair or wall in reach, just in case. Safety first.' },
]

const pane = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
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

  return (
    <div className="space-y-6">
      <div ref={topRef} className="scroll-mt-24" />
      <PageHeader
        eyebrow="Movement check"
        title="A quick, private"
        accent="movement check"
        subtitle="Under a minute, using your camera. We track 33 points on your body to measure walking, balance and tremor."
      />

      <Stepper step={step} />

      <AnimatePresence mode="wait">
        {step === 'task' && (
          <motion.section key="task" {...pane} aria-labelledby="task-title" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="task-title" className="text-xl font-semibold">What would you like to check?</h2>
                <p className="text-sm text-ink-3">Pick one. You can do the others afterwards.</p>
              </div>
            </div>
            <TaskPicker value={task} onChange={setTask} />
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-sm text-ink-3"><ShieldCheck className="h-4 w-4 shrink-0 text-teal-500" /> Video stays on this device. Only keypoints are analysed.</p>
              <Button variant="brand" size="lg" iconRight={ArrowRight} onClick={() => setStep('capture')}>Continue with {meta.label.toLowerCase()}</Button>
            </div>
          </motion.section>
        )}

        {step === 'capture' && (
          <motion.section key="capture" {...pane} aria-label="Record your movement" className="space-y-4">
            <Notice tone="success" icon={ShieldCheck} title="Your video never leaves this device">
              The pose model runs in your browser. Only 33 body keypoints per frame are sent for analysis — no images, no recordings.
            </Notice>

            <AnimatePresence>
              {guidance && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Notice tone="warn" icon={Lightbulb} title={guidance.title} action={<button onClick={() => setGuidance(null)} className="text-xs font-semibold underline underline-offset-2">Dismiss</button>}>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">{guidance.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  </Notice>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3">
                <div className={cn('rounded-[1.95rem] p-[3px] transition-all duration-500',
                  cap.phase === 'recording' ? 'bg-apricot-300' : ['ready', 'countdown'].includes(cap.phase) ? 'bg-teal-300' : 'bg-line')}>
                  <CameraStage cap={cap} durationSec={meta.seconds} onOpen={cap.open} className="border-0"
                    idleText="When you turn it on, a skeleton outline will follow your movement so you know you’re in view." />
                </div>
                <QualityMeters live={cap.live} phase={cap.phase} />
              </div>

              <div className="card card-pad flex min-w-0 flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', TONE_SOFT[meta.tone])}><meta.icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{meta.label}</p>
                      <p className="text-xs text-ink-3">About {meta.seconds} seconds</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goTask} disabled={busy}>Change</Button>
                </div>

                <ol className="mt-4 space-y-2.5">
                  {meta.how.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-2">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-50 text-[0.7rem] font-bold text-teal-700">{i + 1}</span>
                      {h}
                    </li>
                  ))}
                </ol>

                <fieldset className="mt-5 border-t border-line/70 pt-4">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Quick setup</legend>
                  <ul className="space-y-1">
                    {SETUP.map((s) => {
                      const on = !!ticks[s.key]
                      return (
                        <li key={s.key}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-cream">
                            <input type="checkbox" className="peer sr-only" checked={on} onChange={() => setTicks((t) => ({ ...t, [s.key]: !t[s.key] }))} />
                            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-teal-300', on ? 'border-teal-500 bg-teal-500 text-white' : 'border-line bg-paper')}>
                              {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
                            </span>
                            <span className="min-w-0">
                              <span className={cn('block text-sm font-medium', on ? 'text-ink-3 line-through decoration-ink-4/50' : 'text-ink')}>{s.label}</span>
                              <span className="block text-xs text-ink-4">{s.hint}</span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                    <li className="flex items-start gap-3 px-2 py-1.5">
                      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors', cap.live.inFrame && ready ? 'border-teal-500 bg-teal-500 text-white' : 'border-dashed border-line')}>
                        {cap.live.inFrame && ready && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">Body in frame</span>
                        <span className="block text-xs text-ink-4">Ticks itself when we can see you clearly.</span>
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
                  <p className="mt-2 min-h-[1rem] text-center text-xs text-ink-4" aria-live="polite">
                    {ready && !cap.live.detected ? 'Step into view — the button unlocks when we can see you.'
                      : ready && !cap.live.inFrame ? 'Almost there — try to fit your whole body in the frame.'
                        : cap.phase === 'recording' ? 'Keep going at your own pace.'
                          : ready ? 'Looking good. Press start when you’re ready.' : ''}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {step === 'analyse' && (
          <motion.section key="analyse" {...pane} aria-label="Analysing">
            {submit.isError && submit.error?.response?.status !== 422 ? (
              <div className="card card-pad">
                <ErrorState error={submit.error} />
                <p className="mt-4 text-center text-sm text-ink-3">Your keypoints are still on this page — nothing was lost, so you can simply try again.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="brand" icon={RotateCcw} onClick={() => submit.mutate(frames)}>Try sending again</Button>
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
            <div className="card card-tint-teal relative overflow-hidden p-6 sm:p-8">
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl icon-tile icon-teal"><meta.icon className="h-7 w-7" /></span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-700">{meta.label} · just now · saved</p>
                    <h2 id="result-title" className="mt-1 text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem]">Here’s what we <span className="serif-accent">noticed</span></h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" icon={RotateCcw} onClick={restart}>Do another check</Button>
                  <Button variant="outline" icon={Bot} to="/app/assistant">Ask Medo about this</Button>
                  <Button variant="ghost" icon={LineChart} to="/app">View trend</Button>
                </div>
              </div>
            </div>
            <MovementResult result={result} />
          </motion.section>
        )}
      </AnimatePresence>

      {step !== 'analyse' && <CheckHistory />}
    </div>
  )
}
