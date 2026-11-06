import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, Footprints, Hand, PersonStanding, UploadCloud } from 'lucide-react'
import { LAB_RISK, RISK, cn } from '../../lib/utils'

/** The three on-device movement tasks (values match the backend PoseSession.task enum). */
export const TASKS = {
  walk: {
    value: 'walk',
    label: 'Walk',
    icon: Footprints,
    tone: 'teal',
    seconds: 10,
    measures: ['Step rhythm', 'Left/right symmetry', 'Arm swing', 'Speed'],
    blurb: 'Walk toward or across the camera at your usual pace.',
    how: [
      'Stand 3–4 steps back so your whole body fits, head to feet.',
      'When the countdown ends, walk naturally across or toward the camera.',
      'Turn and keep walking until the ring completes — about 10 seconds.',
    ],
  },
  stand: {
    value: 'stand',
    label: 'Stand still',
    icon: PersonStanding,
    tone: 'lilac',
    seconds: 12,
    measures: ['Balance & sway', 'Resting tremor', 'Posture'],
    blurb: 'Stand relaxed with arms by your side so we can measure balance.',
    how: [
      'Stand facing the camera with your feet about hip-width apart.',
      'Let your arms rest loosely at your sides. Breathe normally.',
      'Stay as still as is comfortable until the ring completes.',
    ],
  },
  hands: {
    value: 'hands',
    label: 'Hands out',
    icon: Hand,
    tone: 'apricot',
    seconds: 10,
    measures: ['Postural tremor', 'Tremor side', 'Frequency (Hz)'],
    blurb: 'Hold both arms straight out in front of you, palms down.',
    how: [
      'Stand or sit upright so your upper body and hands are in view.',
      'Raise both arms to shoulder height, palms facing the floor.',
      'Hold the position gently until the ring completes — no need to strain.',
    ],
  },
}
export const TASK_LIST = Object.values(TASKS)
export const taskOf = (t) => TASKS[t] || TASKS.walk

/** Vivid gradient icon tiles (white glyph on gradient). */
export const TONE_SOFT = {
  teal: 'icon-tile icon-teal',
  apricot: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70',
  lilac: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70',
  sky: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70',
  butter: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70',
  rose: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70',
  ink: 'bg-cream text-ink-2',
}

const LEVEL_ALIASES = { BASELINE_LEARNING: 'CALIBRATING', MODERATE: 'MEDIUM', CRITICAL: 'HIGH' }

/** Normalise any risk word we get back (LOW / BASELINE_LEARNING / "Normal" / "High"...) into a RISK entry. */
export function levelInfo(level) {
  if (!level) return RISK.UNKNOWN
  if (LAB_RISK[level]) return LAB_RISK[level]
  const up = String(level).toUpperCase()
  return RISK[LEVEL_ALIASES[up] || up] || RISK.UNKNOWN
}
export const normLevel = (level) => {
  if (!level) return 'UNKNOWN'
  const up = String(level).toUpperCase()
  const k = LEVEL_ALIASES[up] || up
  return RISK[k] ? k : 'UNKNOWN'
}

/** Small pill for a lab-style risk word ("Normal", "High"...). */
export function LevelPill({ level, label, className }) {
  const r = levelInfo(level)
  return (
    <span className={cn('badge ring-1 ring-inset', r.bg, r.text, r.ring, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
      {label || level || r.label}
    </span>
  )
}

export function fileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SectionTitle({ icon: Icon, title, tone = 'teal', action, className }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h3 className="flex min-w-0 items-center gap-2.5 text-base font-semibold">
        {Icon && (
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', TONE_SOFT[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </div>
  )
}

/** Bulleted / numbered list used by the AI explainer cards. */
export function PointList({ items = [], numbered = false, tone = 'teal', empty = 'Nothing to add here.' }) {
  if (!items?.length) return <p className="text-sm text-ink-4">{empty}</p>
  const accent = tone === 'apricot'
  const dot = accent ? 'bg-apricot-400' : 'bg-teal-400'
  const chip = accent ? 'bg-apricot-50 text-apricot-600' : 'bg-teal-50 text-teal-700'
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
          {numbered ? (
            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold', chip)}>{i + 1}</span>
          ) : (
            <span className={cn('mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
          )}
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Accessible drag-and-drop file picker.
 * validate(file) returns an error string or null.
 */
export function Dropzone({ accept, onFile, validate, title, hint, icon: Icon = UploadCloud, disabled, tone = 'teal', className }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState(null)
  const depth = useRef(0)

  function take(file) {
    if (!file) return
    const err = validate?.(file)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onFile(file)
  }

  const ring = 'border-teal-300 bg-teal-50/70'
  const iconTone = 'bg-paper text-teal-700 ring-1 ring-inset ring-line shadow-soft'

  return (
    <div className={className}>
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          depth.current += 1
          setOver(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (!depth.current) setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          depth.current = 0
          setOver(false)
          if (!disabled) take(e.dataTransfer.files?.[0])
        }}
        animate={{ scale: over ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={cn(
          'group relative flex w-full flex-col items-center overflow-hidden rounded-3xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-12',
          over ? ring : 'border-line bg-cream/60 hover:border-teal-200 hover:bg-cream',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        aria-describedby={error ? 'dropzone-error' : undefined}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-dot-grid [background-size:18px_18px] opacity-50 mask-fade-b" />
        <motion.span
          animate={over ? { y: -6, rotate: -6 } : { y: 0, rotate: 0 }}
          className={cn('relative mb-4 grid h-16 w-16 place-items-center rounded-[1.6rem] transition-transform duration-300 group-hover:-translate-y-1', iconTone)}
        >
          <Icon className="h-7 w-7" strokeWidth={1.8} />
          {over && <span className="absolute inset-0 animate-pulse2 rounded-[1.6rem] bg-current opacity-20" />}
        </motion.span>
        <span className="relative font-display text-lg font-semibold text-ink">{over ? 'Drop it here' : title}</span>
        <span className="relative mt-1 max-w-sm text-sm text-ink-3 text-pretty">{hint}</span>
        <span className="relative mt-4 inline-flex h-9 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink-2 shadow-soft transition group-hover:border-ink-4">
          Browse files
        </span>
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            id="dropzone-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-rose-500"
          >
            <CircleAlert className="h-4 w-4" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Two-phase progress: uploading (0-1) then an indeterminate "processing" shimmer. */
export function UploadProgress({ progress = 0, uploadingLabel = 'Uploading securely', processingLabel = 'Analysing', processingHint }) {
  const uploading = progress < 1
  const p = Math.round(progress * 100)
  return (
    <div className="rounded-2xl border border-line bg-cream/70 p-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink-2">{uploading ? uploadingLabel : processingLabel}</span>
        <span className="num text-ink-3">{uploading ? `${p}%` : ''}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-line/70">
        {uploading ? (
          <motion.div className="h-full rounded-full bg-teal-500" animate={{ width: `${Math.max(3, p)}%` }} transition={{ ease: 'easeOut' }} />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-teal-400"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      {!uploading && processingHint && <p className="mt-2 text-xs text-ink-3">{processingHint}</p>}
    </div>
  )
}

/** Simple confidence meter (0-1). */
export function ConfidenceMeter({ value = 0, label = 'AI confidence' }) {
  const v = Math.max(0, Math.min(1, Number(value) || 0))
  const segs = 10
  const on = Math.round(v * segs)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-3">
        <span>{label}</span>
        <span className="num font-medium text-ink">{Math.round(v * 100)}%</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: segs }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0.3, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className={cn('h-2 flex-1 rounded-full', i < on ? (v >= 0.45 ? 'bg-teal-400' : 'bg-apricot-300') : 'bg-line')}
          />
        ))}
      </div>
    </div>
  )
}

/** Tiny SVG sparkline. */
export function Sparkline({ values = [], color = '#3A6652', width = 120, height = 36, className }) {
  const pts = values.filter((v) => v != null && !isNaN(v)).map(Number)
  if (pts.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="#E8E0D2" strokeDasharray="3 5" strokeWidth="2" />
      </svg>
    )
  }
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const step = width / (pts.length - 1)
  const xy = pts.map((v, i) => [i * step, height - 4 - ((v - min) / span) * (height - 8)])
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${d} L${width},${height} L0,${height} Z`
  const id = `sp-${color.replace('#', '')}`
  const last = xy[xy.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
      <circle cx={last[0]} cy={last[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" />
    </svg>
  )
}

/** Object URL for a Blob/File, revoked automatically (StrictMode-safe). */
export function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return undefined
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
