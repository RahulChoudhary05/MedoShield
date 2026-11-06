import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Clock3, Phone, RotateCcw, ShieldCheck, Siren, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../../../components/brand/Logo'
import Markdown from '../../../components/ui/Markdown'
import { Notice } from '../../../components/ui/Feedback'
import { cn } from '../../../lib/utils'
import { TypingDots } from '../shared'

const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.2, 0.7, 0.2, 1] } }

export function MedoAvatar({ size = 34 }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl bg-paper shadow-soft ring-1 ring-line" style={{ width: size + 6, height: size + 6 }}>
      <LogoMark size={size - 8} />
    </span>
  )
}

function sourceLabel(m) {
  if (m.source === 'model') return `Medo · ${m.model || 'AI'}`
  if (m.source === 'fallback') return 'Medo · offline guidance'
  return 'Medo · safety layer'
}

export function UserMessage({ m, onRetry }) {
  return (
    <motion.div {...enter} className="flex flex-col items-end">
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg px-4 py-2.5 text-[0.9375rem] leading-relaxed text-white shadow-[0_10px_28px_-12px_rgba(15,60,50,.45)] sm:max-w-[75%]',
          m.error ? 'bg-ink-3' : 'bg-teal-700',
          m.pending && 'opacity-80',
        )}
      >
        {m.content}
      </div>
      {m.error && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" /> Not sent.
          <button onClick={() => onRetry(m)} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline">
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </motion.div>
  )
}

export function AssistantMessage({ m, showChips, onChip, disabled }) {
  const specialty = m.suggested_specialty && m.suggested_specialty !== 'None' ? m.suggested_specialty : null
  return (
    <motion.div {...enter} className="flex items-start gap-3">
      <MedoAvatar />
      <div className="min-w-0 flex-1 space-y-2.5 sm:max-w-[85%]">
        {m.urgency === 'urgent' && (
          <Notice
            tone="danger"
            icon={Siren}
            title="This may need urgent care"
            action={
              <a href="tel:112" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600">
                <Phone className="h-3.5 w-3.5" /> Call 112
              </a>
            }
          >
            If you feel unsafe, call emergency services now — or press and hold the red SOS button to alert your contact and care team.
          </Notice>
        )}
        {m.urgency === 'soon' && (
          <Notice tone="warn" icon={Clock3} title="Worth seeing a doctor soon">
            Try to book a visit within the next few days.
          </Notice>
        )}
        <div className="rounded-3xl rounded-tl-lg border border-line/80 bg-paper px-4 py-3 shadow-soft sm:px-5">
          <Markdown>{m.content}</Markdown>
        </div>
        {specialty && (
          <div className="card-tint-teal flex flex-col gap-3 rounded-3xl border border-teal-100 p-4 sm:flex-row sm:items-center">
            <span className="icon-tile icon-teal h-10 w-10 shrink-0 shadow-soft">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[.14em] text-teal-600">Suggested specialist</p>
              <p className="font-display font-semibold text-ink">{specialty}</p>
            </div>
            <Link
              to={`/app/care?specialty=${encodeURIComponent(specialty)}`}
              className="btn btn-sm btn-outline shrink-0 self-start sm:self-auto"
            >
              Find one <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        <p className="flex items-center gap-1.5 pl-1 text-[0.7rem] text-ink-4">
          <ShieldCheck className="h-3 w-3" /> {sourceLabel(m)}
        </p>
        {showChips && m.chips?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-0.5" aria-label="Suggested replies">
            {m.chips.map((c, i) => (
              <motion.button
                key={c}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => onChip(c)}
                disabled={disabled}
                className="chip disabled:opacity-50"
              >
                {c}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function TypingMessage() {
  return (
    <motion.div {...enter} className="flex items-start gap-3" aria-live="polite">
      <MedoAvatar />
      <div className="flex items-center gap-2 rounded-3xl rounded-tl-lg border border-line/80 bg-paper px-4 py-3.5 shadow-soft">
        <TypingDots />
        <span className="text-xs text-ink-4">Medo is thinking…</span>
      </div>
    </motion.div>
  )
}
