import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CameraOff, Crosshair, Gauge, Loader2, ScanEye, ShieldCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/utils'

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
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-3xl border border-line bg-cream shadow-soft', className)}>
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Live camera preview"
        className={cn('absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500', showVideo ? 'opacity-100' : 'opacity-0')}
      />
      <canvas ref={canvasRef} aria-hidden className={cn('pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover', !active && 'opacity-0')} />

      {/* Framing guide */}
      {phase === 'ready' && (
        <div aria-hidden className="pointer-events-none absolute inset-[7%_22%] rounded-[2rem] border-2 border-dashed border-white/70 transition-colors" style={{ borderColor: live.inFrame ? 'rgba(111,194,176,.9)' : 'rgba(255,255,255,.7)' }} />
      )}

      {/* Idle / loading / error states */}
      <AnimatePresence>
        {(phase === 'idle' || phase === 'error' || phase === 'done') && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-gradient-to-br from-cream via-paper to-teal-50/60 p-5 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-dot-grid [background-size:20px_20px] opacity-60" />
            <div className="relative flex max-w-sm flex-col items-center">
              <span className={cn('mb-3 grid h-14 w-14 place-items-center rounded-[1.4rem] shadow-inset sm:h-16 sm:w-16', phase === 'error' ? 'icon-tile bg-apricot-50 text-apricot-600 shadow-none' : 'icon-tile icon-teal')}>
                {phase === 'error' ? <CameraOff className="h-7 w-7" /> : <ScanEye className="h-7 w-7" strokeWidth={1.8} />}
              </span>
              <p className="font-display text-base font-semibold text-ink sm:text-lg">{phase === 'error' ? 'Camera unavailable' : phase === 'done' ? 'Recording finished' : idleTitle}</p>
              <p className="mt-1 hidden text-sm text-ink-3 text-pretty sm:block">{phase === 'error' ? error : idleText}</p>
              {phase === 'error' && <p className="mt-1 text-xs text-ink-2 sm:hidden">{error}</p>}
              {onOpen && phase !== 'done' && (
                <Button variant="brand" size="sm" icon={Camera} className="mt-4" onClick={onOpen}>
                  {phase === 'error' ? 'Try again' : 'Turn on camera'}
                </Button>
              )}
            </div>
          </motion.div>
        )}
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-paper/80 backdrop-blur-sm" role="status">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
              <p className="text-sm font-medium text-ink-2">Starting the on-device pose tracker…</p>
              <p className="hidden text-xs text-ink-4 sm:block">The model runs in your browser — nothing is uploaded.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top chips */}
      {active && (
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold text-teal-700">
            <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">On-device</span>
          </span>
          {phase === 'recording' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-apricot-500 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-white shadow-soft">
              <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-pulse2 rounded-full bg-white" /><span className="relative h-2 w-2 rounded-full bg-white" /></span>
              Rec · {remaining}s
            </span>
          ) : (
            <span className={cn('glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold', live.detected ? 'text-teal-700' : 'text-[#9A6410]')}>
              <span className={cn('h-2 w-2 rounded-full', live.detected ? 'bg-teal-400' : 'animate-pulse bg-apricot-300')} />
              {live.detected ? 'Body detected' : 'Looking for you…'}
            </span>
          )}
        </div>
      )}

      {/* Countdown */}
      <AnimatePresence>
        {phase === 'countdown' && (
          <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-white/25 backdrop-blur-[2px]" aria-live="assertive">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={countdown}
                initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="relative grid h-28 w-28 place-items-center rounded-full bg-paper/90 shadow-lift sm:h-36 sm:w-36"
              >
                <span className="absolute inset-0 animate-pulse2 rounded-full bg-teal-300/50" />
                <span className="num relative text-6xl font-semibold text-teal-600 sm:text-7xl">{countdown}</span>
              </motion.div>
            </AnimatePresence>
            <p className="absolute bottom-5 rounded-full bg-paper/90 px-4 py-1.5 text-sm font-medium text-ink-2 shadow-soft">Get into position…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording progress */}
      {phase === 'recording' && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/40">
          <motion.div className="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-apricot-400" style={{ width: `${progress * 100}%` }} />
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
      icon: ScanEye, label: 'Body visible', value: vis == null ? '—' : `${vis}%`, ok: vis >= 70, warn: vis >= 45,
      bar: vis ?? 0, hint: vis == null ? 'Camera off' : vis >= 70 ? 'Great visibility' : 'Step back a little',
    },
    {
      icon: Crosshair, label: 'In frame', value: !on ? '—' : live.inFrame ? 'Yes' : 'Not yet', ok: on && live.inFrame, warn: false,
      bar: on && live.inFrame ? 100 : on && live.detected ? 50 : 0, hint: !on ? 'Camera off' : live.inFrame ? 'Head to feet in view' : 'Keep shoulders to ankles in view',
    },
    {
      icon: Gauge, label: 'Frame rate', value: on && live.fps ? `${live.fps} fps` : '—', ok: on && fpsOk, warn: on && live.fps >= 12,
      bar: on ? Math.min(100, (live.fps / 30) * 100) : 0, hint: !on ? 'Camera off' : fpsOk ? 'Smooth tracking' : 'Close other tabs for smoother tracking',
    },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
      {items.map((m) => {
        const color = !on ? 'bg-line' : m.ok ? 'bg-teal-400' : 'bg-apricot-300'
        return (
          <div key={m.label} className="tile min-w-0 px-3 py-2.5 sm:px-3.5 sm:py-3">
            <p className="flex items-center gap-1.5 truncate text-[0.7rem] font-medium text-ink-3 sm:text-xs"><m.icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{m.label}</span></p>
            <p className="num mt-1 text-base font-semibold text-ink sm:text-lg">{m.value}</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70">
              <motion.div className={cn('h-full rounded-full', color)} animate={{ width: `${m.bar}%` }} transition={{ duration: 0.4 }} />
            </div>
            <p className="mt-1.5 hidden truncate text-[0.7rem] text-ink-4 sm:block">{m.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
