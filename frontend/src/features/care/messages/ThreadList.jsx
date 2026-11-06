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
      <div className="border-b border-line/60 p-4">
        <h2 className="font-display text-lg font-semibold">Messages</h2>
        {threads.length > 4 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <label htmlFor="thread-q" className="sr-only">Search conversations</label>
            <input id="thread-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input h-10 rounded-full border-transparent bg-cream pl-10 text-sm shadow-none" />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-3">No conversations match.</p>
        ) : (
          <ul className="space-y-1" aria-label="Conversations">
            {shown.map((t, i) => {
              const active = t.id === activeId
              return (
                <motion.li key={t.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                  <Link
                    to={`${base}/${t.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex items-center gap-3 rounded-2xl px-3 py-3 transition', active ? 'bg-teal-50 ring-1 ring-inset ring-teal-100' : 'hover:bg-cream')}
                  >
                    <div className="relative">
                      <Avatar name={t.name} size={44} />
                      {t.unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-apricot-400 ring-2 ring-paper" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('truncate text-sm', t.unread ? 'font-semibold text-ink' : 'font-medium text-ink')}>{t.name}</p>
                        {t.last_at && <span className="shrink-0 text-[0.68rem] text-ink-4">{fmtRelative(t.last_at)}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-xs', t.unread ? 'text-ink-2' : 'text-ink-4')}>{t.last_message || t.subtitle || 'Say hello 👋'}</p>
                        {t.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-apricot-400 px-1.5 text-[0.65rem] font-bold text-white">{t.unread > 9 ? '9+' : t.unread}</span>}
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
