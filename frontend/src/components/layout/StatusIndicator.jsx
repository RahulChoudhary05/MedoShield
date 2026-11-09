import { useEffect, useRef } from 'react'
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useOnlineStatus } from '../../lib/hooks'
import { cn } from '../../lib/utils'

/**
 * Real-time status pill for the app header: "Saving…" while a change is in flight,
 * "Syncing" while data refreshes, "Up to date" otherwise, "Offline" when the network drops.
 */
export function SyncIndicator({ className }) {
  const online = useOnlineStatus()
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const state = !online ? 'offline' : mutating ? 'saving' : fetching ? 'syncing' : 'idle'
  const view = {
    offline: { icon: CloudOff, text: 'Offline', cls: 'text-rose-600', spin: false },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-ink-3', spin: true },
    syncing: { icon: Loader2, text: 'Syncing', cls: 'text-ink-4', spin: true },
    idle: { icon: Check, text: 'Up to date', cls: 'text-ink-4', spin: false },
  }[state]
  const Icon = view.icon
  return (
    <p role="status" aria-live="polite" className={cn('hidden items-center gap-1.5 text-[0.8125rem] sm:inline-flex', view.cls, className)}>
      <Icon aria-hidden className={cn('h-3.5 w-3.5', view.spin && 'animate-spin')} strokeWidth={1.8} />
      <span>{view.text}</span>
    </p>
  )
}

/** Full-width notice while offline; on reconnect it refetches stale data and says so once. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const qc = useQueryClient()
  const wasOffline = useRef(false)
  useEffect(() => {
    if (!online) { wasOffline.current = true; return }
    if (wasOffline.current) {
      wasOffline.current = false
      qc.invalidateQueries()
      toast.success('Back online — your data is up to date again')
    }
  }, [online, qc])
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="alert"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="overflow-hidden border-b border-rose-100 bg-rose-50 text-rose-600"
        >
          <p className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-2 text-[0.875rem] sm:px-6">
            <CloudOff aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            You’re offline. You can keep reading; changes will need a connection to save.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
