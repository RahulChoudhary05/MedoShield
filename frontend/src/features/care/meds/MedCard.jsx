import { motion } from 'framer-motion'
import { AlertTriangle, Lock, NotebookPen, Stethoscope, Trash2, UserRound } from 'lucide-react'
import { toDate } from '../../../lib/utils'

function courseProgress(m) {
  if (!m.duration_days || !m.added_at) return null
  const start = toDate(m.added_at)
  if (!start || isNaN(start)) return null
  const day = Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1
  return { day: Math.min(Math.max(day, 1), m.duration_days), total: m.duration_days, done: day > m.duration_days }
}

/** One medicine as a row in the cabinet list (render inside a <ul>). */
export default function MedCard({ m, index = 0, onRemove }) {
  const byDoctor = m.added_by === 'doctor'
  const course = courseProgress(m)
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="grid gap-x-6 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
    >
      <div className="min-w-0">
        <h3 className="truncate text-[1.0625rem] font-semibold leading-tight">{m.name}</h3>
        <p className="mt-0.5 text-[0.9375rem] text-ink-3">{[m.dosage, m.frequency].filter(Boolean).join(' · ') || 'No dosage recorded'}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
          {byDoctor ? <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> : <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />}
          {byDoctor ? `Prescribed by ${m.added_by_name || 'your doctor'}` : 'Added by you'}
        </p>
      </div>

      <div className="min-w-0 space-y-2">
        {(m.time_slots || []).length > 0 && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.8125rem] text-ink-2">
            {(m.time_slots || []).map((t) => <span key={t} className="num">{t}</span>)}
          </p>
        )}
        {m.instructions && (
          <p className="flex gap-2 text-[0.9375rem] text-ink-2"><NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden /> {m.instructions}</p>
        )}
        {m.side_effects?.length > 0 && (
          <p className="flex gap-2 text-[0.9375rem] text-ink-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-apricot-500" strokeWidth={1.8} aria-hidden /> <span>Watch for: {m.side_effects.join(', ')}</span></p>
        )}
        {course && (
          <div>
            <div className="mb-1 flex justify-between font-mono text-[0.8125rem] text-ink-3">
              <span>{course.done ? 'Course complete' : `Day ${course.day} of ${course.total}`}</span>
              <span className="num">{Math.round((course.day / course.total) * 100)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-cream" aria-hidden>
              <motion.div className="h-full rounded-full bg-teal-700" initial={{ width: 0 }} animate={{ width: `${(course.day / course.total) * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {byDoctor ? (
          <span title="Prescribed by your doctor — only they can change it" className="grid h-11 w-11 place-items-center rounded-lg text-ink-3">
            <Lock className="h-4 w-4" strokeWidth={1.8} aria-label="Locked: prescribed by your doctor" />
          </span>
        ) : (
          <button onClick={() => onRemove(m)} className="grid h-11 w-11 place-items-center rounded-lg text-ink-3 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Remove ${m.name}`}>
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </motion.li>
  )
}
