import { motion } from 'framer-motion'
import { AlertTriangle, Clock, Lock, NotebookPen, Pill, Stethoscope, Trash2, UserRound } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { cn, toDate } from '../../../lib/utils'

const TINTS = [
  'icon-teal',
  'icon-teal',
  'icon-teal',
  'icon-teal',
  'icon-teal',
]

function courseProgress(m) {
  if (!m.duration_days || !m.added_at) return null
  const start = toDate(m.added_at)
  if (!start || isNaN(start)) return null
  const day = Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1
  return { day: Math.min(Math.max(day, 1), m.duration_days), total: m.duration_days, done: day > m.duration_days }
}

export default function MedCard({ m, index = 0, onRemove }) {
  const byDoctor = m.added_by === 'doctor'
  const tint = TINTS[(m.name || '').length % TINTS.length]
  const course = courseProgress(m)
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      className="card card-pad card-glow card-interactive group flex flex-col"
    >
      <div className="flex items-start gap-3">
        <span className={cn('icon-tile h-12 w-12 shrink-0 transition-transform duration-300 group-hover:-rotate-6', tint)}>
          <Pill className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold leading-tight">{m.name}</h3>
          <p className="mt-0.5 text-sm text-ink-3">
            {[m.dosage, m.frequency].filter(Boolean).join(' · ') || 'No dosage recorded'}
          </p>
        </div>
        {byDoctor ? (
          <span title="Prescribed by your doctor — only they can change it" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-4">
            <Lock className="h-4 w-4" aria-label="Locked" />
          </span>
        ) : (
          <button onClick={() => onRemove(m)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-4 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Remove ${m.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(m.time_slots || []).map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-inset ring-line">
            <Clock className="h-3 w-3 text-ink-4" /> {t}
          </span>
        ))}
      </div>

      {m.instructions && (
        <p className="mt-3 flex gap-2 text-sm text-ink-2">
          <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" /> {m.instructions}
        </p>
      )}
      {m.side_effects?.length > 0 && (
        <p className="mt-2 flex gap-2 text-sm text-ink-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-apricot-400" />
          <span>Watch for: {m.side_effects.join(', ')}</span>
        </p>
      )}

      {course && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-ink-3">
            <span>{course.done ? 'Course complete' : `Day ${course.day} of ${course.total}`}</span>
            <span className="num">{Math.round((course.day / course.total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#F0E9DD]">
            <motion.div className="h-full rounded-full bg-teal-700" initial={{ width: 0 }} animate={{ width: `${(course.day / course.total) * 100}%` }} transition={{ duration: 0.9 }} />
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        {byDoctor ? (
          <Badge tone="teal"><Stethoscope className="h-3 w-3" /> Prescribed by {m.added_by_name || 'your doctor'}</Badge>
        ) : (
          <Badge tone="ink"><UserRound className="h-3 w-3" /> Added by you</Badge>
        )}
      </div>
    </motion.article>
  )
}
