import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Avatar } from '../../../components/ui/Data'
import { Skeleton } from '../../../components/ui/Feedback'
import { cn, fmtRelative } from '../../../lib/utils'

export default function ThreadList({ threads, loading, activeId, base, className }) {
  const [q, setQ] = useState('')
  const shown = q ? threads.filter((t) => `${t.name} ${t.subtitle || ''}`.toLowerCase().includes(q.toLowerCase())) : threads
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="border-b border-line p-4">
        <h2 className="text-[1.125rem] font-semibold">Conversations</h2>
        {threads.length > 4 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} aria-hidden />
            <label htmlFor="thread-q" className="sr-only">Search conversations</label>
            <input id="thread-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input pl-10" />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-[0.9375rem] text-ink-3">No conversations match.</p>
        ) : (
          <ul className="space-y-1" aria-label="Conversations">
            {shown.map((t, i) => {
              const active = t.id === activeId
              return (
                <motion.li key={t.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                  <Link
                    to={`${base}/${t.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn('relative flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-150', active ? 'bg-cream ring-1 ring-inset ring-line' : 'hover:bg-cream/60')}
                  >
                    <div className="relative">
                      <Avatar name={t.name} size={44} />
                      {t.unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-apricot-500 ring-2 ring-paper" aria-hidden />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('truncate text-[0.9375rem]', t.unread ? 'font-semibold text-ink' : 'font-medium text-ink')}>{t.name}</p>
                        {t.last_at && <span className="shrink-0 font-mono text-[0.8125rem] text-ink-3">{fmtRelative(t.last_at)}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-[0.8125rem]', t.unread ? 'text-ink-2' : 'text-ink-3')}>{t.last_message || t.subtitle || 'Say hello'}</p>
                        {t.unread > 0 && <span className="num grid h-5 min-w-5 shrink-0 place-items-center rounded-md bg-apricot-50 px-1.5 text-[0.8125rem] text-apricot-600" aria-label={`${t.unread} unread`}>{t.unread > 9 ? '9+' : t.unread}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
