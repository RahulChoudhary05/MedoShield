import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Clock3, Phone, RotateCcw, Siren, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../../../components/brand/Logo'
import Markdown from '../../../components/ui/Markdown'
import { cn } from '../../../lib/utils'
import { TypingDots } from '../shared'

const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } }

export function MedoAvatar({ size = 34 }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-lg border border-line bg-paper" style={{ width: size + 4, height: size + 4 }} aria-hidden>
      <LogoMark size={size - 8} />
    </span>
  )
}

/** Where the reply came from, in mono: model · triage · emergency · guardrail · offline. */
const SOURCES = {
  model: { label: 'model', cls: 'border-line text-ink-3' },
  triage: { label: 'triage', cls: 'border-teal-100 bg-teal-50 text-teal-700' },
  emergency: { label: 'emergency', cls: 'border-rose-200 bg-rose-50 text-rose-600' },
  guardrail: { label: 'guardrail', cls: 'border-butter-100 bg-butter-50 text-[#6E5716]' },
  fallback: { label: 'offline guidance', cls: 'border-line text-ink-3' },
}
function SourceBadge({ m }) {
  const s = SOURCES[m.source] || { label: 'safety layer', cls: 'border-line text-ink-3' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[0.8125rem]', s.cls)}>
      {s.label}{m.source === 'model' && m.model ? <span className="text-ink-3">· {m.model}</span> : null}
    </span>
  )
}

export function UserMessage({ m, onRetry }) {
  return (
    <motion.div {...enter} className="flex flex-col items-end">
      <p className="sr-only">You said:</p>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-cream px-4 py-2.5 text-base leading-relaxed text-ink sm:max-w-[75%]',
          m.error && 'border border-rose-200',
          m.pending && 'opacity-70',
        )}
      >
        {m.content}
      </div>
      {m.error && (
        <div className="mt-1.5 flex items-center gap-2 text-[0.8125rem] text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> Not sent.
          <button onClick={() => onRetry(m)} className="inline-flex min-h-[44px] items-center gap-1 px-1 font-medium text-teal-700 hover:underline">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> Retry message
          </button>
        </div>
      )}
    </motion.div>
  )
}

export function AssistantMessage({ m, showChips, onChip, disabled }) {
  const specialty = m.suggested_specialty && m.suggested_specialty !== 'None' ? m.suggested_specialty : null
  const emergency = m.source === 'emergency' || m.urgency === 'urgent'
  return (
    <motion.div {...enter} className="flex items-start gap-3">
      <MedoAvatar size={30} />
      <div className="min-w-0 flex-1 space-y-2.5 sm:max-w-[85%]">
        <p className="sr-only">Medo said:</p>
        <div className={cn('rounded-2xl rounded-tl-md border px-4 py-3 sm:px-5', emergency ? 'border-rose-200 bg-rose-50' : 'border-line bg-paper')}>
          {emergency && (
            <p className="mb-2 flex items-center gap-2 font-medium text-rose-600">
              <Siren className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden /> This may need urgent care
            </p>
          )}
          {m.urgency === 'soon' && !emergency && (
            <p className="mb-2 flex items-center gap-2 font-medium text-[#6E5716]">
              <Clock3 className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden /> Worth seeing a doctor within a few days
            </p>
          )}
          <Markdown>{m.content}</Markdown>
          {emergency && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-rose-200 pt-3">
              <a href="tel:112" className="btn btn-md btn-danger"><Phone className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Call 112</a>
              <button type="button" onClick={() => onChip('Open SOS')} className="btn btn-md btn-outline border-rose-200 text-rose-600 hover:border-rose-400">
                <Siren className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Use the SOS button
              </button>
            </div>
          )}
        </div>
        {specialty && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center">
            <Stethoscope className="h-5 w-5 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="kicker">Suggested specialist</p>
              <p className="font-medium text-ink">{specialty}</p>
            </div>
            <Link to={`/app/care?specialty=${encodeURIComponent(specialty)}`} className="btn btn-md btn-outline shrink-0 self-start sm:self-auto">
              Find a {specialty.toLowerCase()} <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2 pl-0.5"><SourceBadge m={m} /></div>
        {showChips && m.chips?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-0.5" role="group" aria-label="Suggested replies">
            {m.chips.map((c) => (
              <button key={c} onClick={() => onChip(c)} disabled={disabled} className="chip min-h-[44px] px-3.5 disabled:opacity-50">
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function TypingMessage() {
  return (
    <motion.div {...enter} className="flex items-start gap-3">
      <MedoAvatar size={30} />
      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3">
        <TypingDots />
        <span className="text-[0.8125rem] text-ink-3">Medo is thinking…</span>
      </div>
    </motion.div>
  )
}
