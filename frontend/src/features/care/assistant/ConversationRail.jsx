import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn, fmtRelative } from '../../../lib/utils'

/** Past conversations with Medo. */
export default function ConversationRail({ query, activeId, onSelect, onNew, onDelete, className }) {
  const items = query.data?.conversations || []
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="p-4 pb-3">
        <Button variant="primary" size="md" icon={MessageSquarePlus} className="w-full" onClick={onNew}>New conversation</Button>
      </div>
      <p className="kicker px-5 pb-2">Recent</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {query.isLoading ? (
          <div className="space-y-2 px-1.5" aria-busy="true" aria-label="Loading conversations">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}
          </div>
        ) : query.isError ? (
          <div role="alert" className="mx-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-[0.9375rem] text-rose-600">
            Couldn’t load your conversations.
            <button onClick={() => query.refetch()} className="mt-1 block min-h-[44px] font-medium text-teal-700 hover:underline">Reload conversations</button>
          </div>
        ) : items.length === 0 ? (
          <p className="mx-1.5 rounded-xl border border-dashed border-line px-4 py-5 text-[0.9375rem] text-ink-3">Your chats with Medo will appear here.</p>
        ) : (
          <ul className="divide-y divide-line" aria-label="Past conversations">
            <AnimatePresence initial={false}>
              {items.map((c) => {
                const active = c.id === activeId
                return (
                  <motion.li key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn('relative my-1 w-full rounded-lg px-3 py-2.5 pr-12 text-left transition-colors duration-150', active ? 'bg-paper ring-1 ring-inset ring-line' : 'hover:bg-paper/70')}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-teal-700" aria-hidden />}
                      <span className="block truncate text-[0.9375rem] font-medium text-ink">{c.title || 'Untitled chat'}</span>
                      <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-3">{c.preview || '—'}</span>
                      <span className="mt-0.5 block font-mono text-[0.8125rem] text-ink-3">{fmtRelative(c.updated_at)}</span>
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="absolute right-1 top-2 grid h-11 w-11 place-items-center rounded-lg text-ink-3 transition hover:bg-rose-50 hover:text-rose-500 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label={`Delete conversation ${c.title || ''}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
