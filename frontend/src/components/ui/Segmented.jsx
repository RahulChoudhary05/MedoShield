import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Pill segmented control with a sliding indicator.
 * <Segmented value={v} onChange={setV} options={[{value:'a', label:'A', icon: Icon, count: 3}]} />
 */
export default function Segmented({ value, onChange, options, className, size = 'md' }) {
  const id = useId()
  return (
    <div role="tablist" className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1 shadow-soft no-scrollbar', className)}>
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors',
              size === 'sm' ? 'h-8 px-3 text-[0.8125rem]' : 'h-9 px-4 text-sm',
              active ? 'text-white' : 'text-ink-3 hover:text-ink',
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" />}
              {o.label}
              {o.count != null && <span className={cn('rounded-full px-1.5 text-[0.7rem]', active ? 'bg-white/20' : 'bg-ink/[.06]')}>{o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
