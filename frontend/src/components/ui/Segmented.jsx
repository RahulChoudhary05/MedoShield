import { useId, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Segmented control: 8px radius, active segment = paper with a hairline, sliding in 240ms.
 * Each segment is a 44px target; arrow keys move between segments.
 * <Segmented value={v} onChange={setV} options={[{value:'a', label:'A', icon: Icon, count: 3}]} />
 */
export default function Segmented({ value, onChange, options, className, size = 'md', 'aria-label': ariaLabel }) {
  const id = useId()
  const refs = useRef([])

  const onKeyDown = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : null
    if (!dir && jump == null) return
    e.preventDefault()
    const next = jump ?? (i + dir + options.length) % options.length
    refs.current[next]?.focus()
    onChange(options[next].value)
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-line bg-cream/60 no-scrollbar', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg transition-colors duration-150',
              size === 'sm' ? 'px-3 text-[0.875rem]' : 'px-4 text-[0.9375rem]',
              active ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                aria-hidden
                className="absolute inset-1 rounded-md border border-line bg-paper shadow-soft"
                transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
              {o.label}
              {o.count != null && <span className={cn('num font-mono text-[0.8125rem] font-normal', active ? 'text-ink-3' : 'text-ink-4')}>{o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
