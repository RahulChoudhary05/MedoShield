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
    tone: 'teal',
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
    tone: 'teal',
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

/** Quiet tonal icon squares (Field Notes: one accent, no colour coding by decoration). */
const TILE = 'icon-tile bg-cream text-teal-700 ring-1 ring-inset ring-line'
export const TONE_SOFT = { teal: TILE, apricot: TILE, stone: TILE, sky: TILE, butter: TILE, rose: TILE, ink: 'bg-cream text-ink-2' }

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

/** Plain section heading inside a card: optional tonal icon square + title + action. */
export function SectionTitle({ icon: Icon, title, action, className, as: As = 'h3' }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <As className="flex min-w-0 items-center gap-2.5 text-[1.0625rem] font-semibold">
        {Icon && (
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', TILE)}>
            <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </span>
        )}
        <span className="truncate">{title}</span>
      </As>
      {action}
    </div>
  )
}

/** Bulleted / numbered list with hairline dividers, used by the AI explainer cards. */
export function PointList({ items = [], numbered = false, empty = 'Nothing to add here.' }) {
  if (!items?.length) return <p className="text-[0.9375rem] text-ink-3">{empty}</p>
  const Tag = numbered ? 'ol' : 'ul'
  return (
    <Tag className="divide-y divide-line">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 py-2.5 text-[0.9375rem] leading-relaxed text-ink-2 first:pt-0 last:pb-0">
          {numbered ? (
            <span className="num w-5 shrink-0 text-ink-3">{String(i + 1).padStart(2, '0')}</span>
          ) : (
            <span className="mt-[0.65em] h-1 w-2 shrink-0 rounded-full bg-teal-400" aria-hidden />
          )}
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </Tag>
  )
}

/**
 * Accessible drag-and-drop file picker.
 * validate(file) returns an error string or null.
 */
export function Dropzone({ accept, onFile, validate, title, hint, icon: Icon = UploadCloud, disabled, className }) {
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

  return (
    <div className={className}>
      <button
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
        className={cn(
          'group flex w-full flex-col items-center rounded-xl border border-dashed px-5 py-10 text-center transition-colors duration-200 sm:py-12',
          over ? 'border-teal-500 bg-teal-50' : 'border-ink-4/50 bg-cream/40 hover:border-ink-3 hover:bg-cream/70',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        aria-describedby={error ? 'dropzone-error' : undefined}
      >
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-paper text-teal-700 ring-1 ring-inset ring-line transition-transform duration-200 group-hover:-translate-y-0.5">
          <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="text-[1.0625rem] font-semibold text-ink">{over ? 'Drop it here' : title}</span>
        <span className="mt-1 max-w-sm text-[0.9375rem] text-ink-3 text-pretty">{hint}</span>
        <span className="mt-5 inline-flex h-11 items-center rounded-lg border border-line bg-paper px-5 text-[0.9375rem] font-medium text-ink transition group-hover:border-ink-4">
          Choose a file
        </span>
      </button>
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
            className="mt-3 flex items-center gap-2 text-[0.9375rem] font-medium text-rose-500"
          >
            <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Two-phase progress: uploading (0-1) then an indeterminate "processing" bar. */
export function UploadProgress({ progress = 0, uploadingLabel = 'Uploading securely', processingLabel = 'Analysing', processingHint }) {
  const uploading = progress < 1
  const p = Math.round(progress * 100)
  return (
    <div className="border-t border-line pt-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.9375rem] font-medium text-ink-2">{uploading ? uploadingLabel : processingLabel}</span>
        <span className="num text-ink-3">{uploading ? `${p}%` : ''}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-cream">
        {uploading ? (
          <motion.div className="h-full rounded-full bg-teal-700" animate={{ width: `${Math.max(3, p)}%` }} transition={{ ease: 'easeOut' }} />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-teal-500"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
      </div>
      {!uploading && processingHint && <p className="mt-2 text-[0.8125rem] text-ink-3">{processingHint}</p>}
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
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="kicker">{label}</span>
        <span className="num text-ink">{Math.round(v * 100)}%</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: segs }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className={cn('h-1.5 flex-1 rounded-full', i < on ? (v >= 0.45 ? 'bg-teal-600' : 'bg-apricot-400') : 'bg-cream')}
          />
        ))}
      </div>
    </div>
  )
}

/** Tiny SVG sparkline (flat, hairline, ember end-dot). */
export function Sparkline({ values = [], color = '#1D3AA6', width = 120, height = 36, className }) {
  const pts = values.filter((v) => v != null && !isNaN(v)).map(Number)
  if (pts.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="#DFE4EC" strokeDasharray="3 5" strokeWidth="1.5" />
      </svg>
    )
  }
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const step = width / (pts.length - 1)
  const xy = pts.map((v, i) => [i * step, height - 4 - ((v - min) / span) * (height - 8)])
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} aria-hidden>
      <motion.path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#D9522A" />
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
