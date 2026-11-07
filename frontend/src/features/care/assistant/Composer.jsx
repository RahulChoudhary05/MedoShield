import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '../../../lib/utils'

export const MAX_CHARS = 2000

/** Auto-growing message box: Enter sends, Shift+Enter adds a newline. */
const Composer = forwardRef(function Composer({ onSend, disabled, placeholder = 'Ask Medo about your health…', reserveRight = false }, ref) {
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
      <div className="flex items-end gap-2 rounded-xl border border-line bg-paper p-1.5 pl-3.5 transition duration-150 focus-within:border-teal-500 focus-within:ring-[3px] focus-within:ring-teal-100">
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
          className="max-h-[180px] min-h-[2.75rem] flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-4"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-lg transition duration-150 active:scale-[.97]',
            canSend ? 'bg-ink text-paper hover:bg-teal-800' : 'bg-cream text-ink-4',
          )}
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[0.8125rem] text-ink-3">
        <span className="hidden font-mono sm:inline">Enter to send · Shift + Enter for a new line</span>
        <span className={cn('ml-auto font-mono tabular-nums', near && 'text-apricot-600', value.length >= MAX_CHARS && 'text-rose-500')} aria-live="polite">
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  )
})

export default Composer
