import * as RD from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * <Dialog open onOpenChange title description size="md|lg|xl">...</Dialog>
 * Accessible (focus trap, Esc, aria) via Radix; animated with framer-motion.
 */
export default function Dialog({ open, onOpenChange, title, description, children, size = 'md', footer, className }) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[6px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </RD.Overlay>
            <RD.Content asChild forceMount aria-describedby={description ? undefined : undefined}>
              <motion.div
                className={cn('fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-lift focus:outline-none', widths[size], className)}
                initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 pb-4 pt-5">
                  <div>
                    <RD.Title className="font-display text-xl font-semibold text-ink">{title}</RD.Title>
                    {description ? <RD.Description className="mt-1 text-sm text-ink-3">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
                  </div>
                  <RD.Close className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-ink/5 hover:text-ink" aria-label="Close">
                    <X className="h-4 w-4" />
                  </RD.Close>
                </div>
                <div className="overflow-y-auto px-6 py-5">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 bg-cream/60 px-6 py-4">{footer}</div>}
              </motion.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  )
}
