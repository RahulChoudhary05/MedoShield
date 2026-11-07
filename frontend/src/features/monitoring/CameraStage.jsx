import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CameraOff, Loader2, ScanEye, ShieldCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/utils'

const EASE = [0.2, 0.8, 0.2, 1]

/**
 * Live camera + skeleton overlay for usePoseCapture().
 * Both <video> and <canvas> are mirrored so the view behaves like a mirror.
 */
export default function CameraStage({ cap, durationSec = 10, onOpen, idleTitle = 'Your camera is off', idleText, className }) {
  const { videoRef, canvasRef, phase, countdown, progress, live, error } = cap
  const active = ['ready', 'countdown', 'recording'].includes(phase)
  const showVideo = active || phase === 'loading'
  const remaining = Math.max(0, Math.ceil(durationSec * (1 - progress)))

  return (
    <div className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-ink sm:aspect-video', className)}>
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Live camera preview"
        className={cn('absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500', showVideo ? 'opacity-100' : 'opacity-0')}
      />
      <canvas ref={canvasRef} aria-hidden className={cn('pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover', !active && 'opacity-0')} />

      {/* Framing guide: corner brackets, pine when the whole body is in frame */}
      {phase === 'ready' && (
        <div aria-hidden className="pointer-events-none absolute inset-[7%_20%]">
          {['left-0 top-0 border-l-2 border-t-2 rounded-tl-xl', 'right-0 top-0 border-r-2 border-t-2 rounded-tr-xl', 'left-0 bottom-0 border-l-2 border-b-2 rounded-bl-xl', 'right-0 bottom-0 border-r-2 border-b-2 rounded-br-xl'].map((c) => (
            <span key={c} className={cn('absolute h-8 w-8 transition-colors duration-300', c, live.inFrame ? 'border-teal-300' : 'border-paper/70')} />
          ))}
        </div>
      )}

      {/* Idle / loading / error states */}
      <AnimatePresence>
        {(phase === 'idle' || phase === 'error' || phase === 'done') && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }} className="absolute inset-0 grid place-items-center bg-cream p-5 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-rules opacity-60" />
            <div className="relative flex max-w-sm flex-col items-center">
              <span className={cn('mb-3 grid h-12 w-12 place-items-center rounded-lg ring-1 ring-inset', phase === 'error' ? 'bg-rose-50 text-rose-500 ring-rose-100' : 'bg-paper text-teal-700 ring-line')}>
                {phase === 'error' ? <CameraOff className="h-6 w-6" strokeWidth={1.8} aria-hidden /> : <ScanEye className="h-6 w-6" strokeWidth={1.8} aria-hidden />}
              </span>
              <p className="text-[1.0625rem] font-semibold text-ink">{phase === 'error' ? 'Camera unavailable' : phase === 'done' ? 'Recording finished' : idleTitle}</p>
              <p className="mt-1 hidden text-[0.9375rem] text-ink-3 text-pretty sm:block">{phase === 'error' ? error : idleText}</p>
              {phase === 'error' && <p className="mt-1 text-[0.8125rem] text-ink-2 sm:hidden">{error}</p>}
              {onOpen && phase !== 'done' && (
                <Button variant="brand" icon={Camera} className="mt-4" onClick={onOpen}>
                  {phase === 'error' ? 'Try the camera again' : 'Turn on camera'}
                </Button>
              )}
            </div>
          </motion.div>
        )}
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-paper/90" role="status">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-700" strokeWidth={1.8} aria-hidden />
              <p className="text-[0.9375rem] font-medium text-ink-2">Starting the on-device pose tracker…</p>
              <p className="hidden text-[0.8125rem] text-ink-3 sm:block">The model runs in your browser — nothing is uploaded.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top readouts */}
      {active && (
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-paper/90 px-2 py-1 font-mono text-[0.8125rem] text-teal-700">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> <span className="hidden sm:inline">On-device</span>
          </span>
          {phase === 'recording' ? (
            <span className="inline-flex items-center gap-2 rounded-md bg-paper/95 px-2 py-1 font-mono text-[0.8125rem] text-ink">
              <span className="h-2 w-2 animate-pulse rounded-full bg-apricot-500" aria-hidden />
              Rec · <span className="num">{remaining}</span> s
            </span>
          ) : (
            <span className={cn('inline-flex items-center gap-2 rounded-md bg-paper/90 px-2 py-1 font-mono text-[0.8125rem]', live.detected ? 'text-teal-700' : 'text-ink-2')}>
              <span className={cn('h-2 w-2 rounded-full', live.detected ? 'bg-teal-500' : 'bg-apricot-400')} aria-hidden />
              {live.detected ? 'Body detected' : 'Looking for you…'}
            </span>
          )}
        </div>
      )}

      {/* Countdown */}
      <AnimatePresence>
        {phase === 'countdown' && (
          <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-ink/20" aria-live="assertive">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={countdown}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.15, opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="grid h-28 w-28 place-items-center rounded-full border border-line bg-paper sm:h-32 sm:w-32"
              >
                <span className="num text-6xl text-ink">{countdown}</span>
              </motion.div>
            </AnimatePresence>
            <p className="absolute bottom-5 rounded-md bg-paper px-3 py-1.5 text-[0.9375rem] text-ink-2">Get into position…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording progress */}
      {phase === 'recording' && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/30" role="progressbar" aria-label="Recording progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full bg-apricot-500" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/** Live quality meters under the camera. */
export function QualityMeters({ live, phase }) {
  const on = ['ready', 'countdown', 'recording'].includes(phase)
  const vis = on ? Math.round((live.visible || 0) * 100) : null
  const fpsOk = live.fps >= 20
  const items = [
    {
      label: 'Body visible', value: vis == null ? '—' : `${vis}%`, ok: vis >= 70,
      bar: vis ?? 0, hint: vis == null ? 'Camera off' : vis >= 70 ? 'Great visibility' : 'Step back a little',
    },
    {
      label: 'In frame', value: !on ? '—' : live.inFrame ? 'Yes' : 'Not yet', ok: on && live.inFrame,
      bar: on && live.inFrame ? 100 : on && live.detected ? 50 : 0, hint: !on ? 'Camera off' : live.inFrame ? 'Head to feet in view' : 'Keep shoulders to ankles in view',
    },
    {
      label: 'Frame rate', value: on && live.fps ? `${live.fps} fps` : '—', ok: on && fpsOk,
      bar: on ? Math.min(100, (live.fps / 30) * 100) : 0, hint: !on ? 'Camera off' : fpsOk ? 'Smooth tracking' : 'Close other tabs',
    },
  ]
  return (
    <dl className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-paper" aria-live="polite">
      {items.map((m) => (
        <div key={m.label} className="min-w-0 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="kicker truncate">{m.label}</dt>
          <dd className="num mt-1 text-[1.0625rem] text-ink sm:text-[1.25rem]">{m.value}</dd>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream" aria-hidden>
            <motion.div className={cn('h-full rounded-full', !on ? 'bg-line' : m.ok ? 'bg-teal-600' : 'bg-apricot-400')} animate={{ width: `${m.bar}%` }} transition={{ duration: 0.4, ease: EASE }} />
          </div>
          <dd className="mt-1.5 hidden truncate text-[0.8125rem] text-ink-3 sm:block">{m.hint}</dd>
        </div>
      ))}
    </dl>
  )
}
