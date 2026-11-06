import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquarePlus, MessagesSquare, Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Feedback'
import { cn, fmtRelative } from '../../../lib/utils'

/** Past conversations with Medo. */
export default function ConversationRail({ query, activeId, onSelect, onNew, onDelete, className }) {
  const items = query.data?.conversations || []
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="p-4 pb-3">
        <Button variant="primary" size="md" icon={MessageSquarePlus} className="w-full" onClick={onNew}>New conversation</Button>
      </div>
      <p className="px-5 pb-2 text-[0.68rem] font-semibold uppercase tracking-[.16em] text-ink-4">Recent</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {query.isLoading ? (
          <div className="space-y-2 px-1.5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : query.isError ? (
          <div className="px-3 py-6 text-center text-sm text-ink-3">
            Couldn’t load your conversations.
            <button onClick={() => query.refetch()} className="mt-1 block w-full font-medium text-teal-600 hover:underline">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-1.5 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
            <MessagesSquare className="mx-auto h-5 w-5 text-ink-4" />
            <p className="mt-2 text-sm text-ink-3">Your chats with Medo will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-1" aria-label="Past conversations">
            <AnimatePresence initial={false}>
              {items.map((c) => {
                const active = c.id === activeId
                return (
                  <motion.li key={c.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'w-full rounded-2xl px-3 py-2.5 pr-10 text-left transition',
                        active ? 'bg-teal-50 ring-1 ring-inset ring-teal-100' : 'hover:bg-cream',
                      )}
                    >
                      <p className={cn('truncate text-sm font-medium', active ? 'text-teal-800' : 'text-ink')}>{c.title || 'Untitled chat'}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-4">{c.preview || '—'}</p>
                      <p className="mt-0.5 text-[0.68rem] text-ink-4">{fmtRelative(c.updated_at)}</p>
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="absolute right-2 top-2.5 grid h-8 w-8 place-items-center rounded-full text-ink-4 opacity-100 transition hover:bg-rose-50 hover:text-rose-500 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label={`Delete conversation ${c.title || ''}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
