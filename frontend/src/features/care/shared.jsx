import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/utils'

/** Safe localStorage helpers (private windows / blocked storage must never crash a page). */
export function readLocal(key, fallback = null) {
  try {
    const v = window.localStorage.getItem(key)
    return v == null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
export function writeLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable - fine */
  }
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(d = new Date()) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

/** Three softly bouncing dots, used while someone is "typing". */
export function TypingDots({ className, dotClass = 'bg-teal-400' }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="status" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn('h-1.5 w-1.5 rounded-full', dotClass)}
          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

/** Small yes/no confirmation dialog. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', tone = 'danger', loading, onConfirm, children }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Keep it</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {children || <p className="text-sm text-ink-3">This can’t be undone.</p>}
    </Dialog>
  )
}

/**
 * Editable tag list. Enter or comma adds a tag, Backspace on an empty field removes the last.
 * <TagInput label="Allergies" value={[]} onChange={fn} max={20} maxLength={60} />
 */
export function TagInput({ label, value = [], onChange, placeholder = 'Type and press Enter', max = 20, maxLength = 60, help, tone = 'teal' }) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const tones = { teal: 'bg-teal-50 text-teal-700 ring-teal-100', apricot: 'bg-apricot-50 text-apricot-600 ring-apricot-100', lilac: 'bg-teal-50 text-teal-600 ring-teal-100', sky: 'bg-teal-50 text-teal-500 ring-teal-100' }

  function add(raw) {
    const t = raw.trim().replace(/,$/, '').slice(0, maxLength)
    if (!t) return
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return setDraft('')
    if (value.length >= max) return
    onChange([...value, t])
    setDraft('')
  }

  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-paper px-2.5 py-2 shadow-inset transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={cn('inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-medium ring-1 ring-inset', tones[tone])}
            >
              <span className="truncate">{tag}</span>
              <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label={`Remove ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length >= max ? `Up to ${max} items` : placeholder}
          disabled={value.length >= max}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1.5 text-[0.9375rem] text-ink outline-none placeholder:text-ink-4"
        />
        {draft && (
          <button type="button" onClick={() => add(draft)} className="grid h-7 w-7 place-items-center rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100" aria-label="Add">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {help && <p className="help">{help}</p>}
    </div>
  )
}

/** Section title used inside long cards. */
export function SectionLabel({ children, className }) {
  return <p className={cn('mb-3 text-[0.7rem] font-semibold uppercase tracking-[.16em] text-ink-4', className)}>{children}</p>
}
