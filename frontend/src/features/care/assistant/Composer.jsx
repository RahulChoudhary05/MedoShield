import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'

export const MAX_CHARS = 2000

/** Auto-growing message box: Enter sends, Shift+Enter adds a newline. */
const Composer = forwardRef(function Composer({ onSend, disabled, placeholder = 'Ask Medo anything about your health…', reserveRight = false }, ref) {
  const [value, setValue] = useState('')
  const taRef = useRef(null)
  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus(), set: (v) => setValue(v) }))

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  const trimmed = value.trim()
  const canSend = !!trimmed && !disabled && value.length <= MAX_CHARS

  function submit() {
    if (!canSend) return
    onSend(trimmed)
    setValue('')
  }

  const near = value.length > MAX_CHARS * 0.9
  return (
    <div className={cn(reserveRight && 'pr-16 lg:pr-[4.5rem]')}>
      <div className="flex items-end gap-2 rounded-[1.6rem] border border-line bg-paper p-2 pl-4 shadow-soft transition focus-within:border-teal-300 focus-within:ring-4 focus-within:ring-teal-50">
        <label htmlFor="medo-composer" className="sr-only">Message Medo</label>
        <textarea
          id="medo-composer"
          ref={taRef}
          rows={1}
          value={value}
          maxLength={MAX_CHARS}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          className="max-h-[180px] min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-ink-4"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-200',
            canSend ? 'bg-teal-700 text-white shadow-glow hover:brightness-110' : 'bg-cream text-ink-4',
          )}
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </motion.button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 px-2 text-[0.7rem] text-ink-4">
        <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
        <span className={cn('ml-auto tabular-nums', near && 'font-semibold text-apricot-500', value.length >= MAX_CHARS && 'text-rose-500')} aria-live="polite">
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  )
})

export default Composer
