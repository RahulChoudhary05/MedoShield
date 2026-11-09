import * as RD from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const EASE = [0.2, 0.8, 0.2, 1]

/**
 * <Dialog open onOpenChange title description size="sm|md|lg|xl" footer>...</Dialog>
 * Radix handles focus trap, Esc, scroll lock and aria; framer-motion a calm 200ms fade/scale.
 */
export default function Dialog({ open, onOpenChange, title, description, children, size = 'md', footer, className }) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/25"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
              />
            </RD.Overlay>
            <RD.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-line bg-paper text-ink shadow-float focus:outline-none',
                  widths[size] || widths.md,
                  className,
                )}
                initial={{ opacity: 0, scale: 0.98, x: '-50%', y: '-50%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.98, x: '-50%', y: '-50%' }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-6">
                  <div className="min-w-0">
                    <RD.Title className="font-serif text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</RD.Title>
                    {description
                      ? <RD.Description className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-3">{description}</RD.Description>
                      : <RD.Description className="sr-only">{title}</RD.Description>}
                  </div>
                  <RD.Close
                    className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-cream hover:text-ink"
                    aria-label="Close dialog"
                  >
                    <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </RD.Close>
                </div>
                <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-cream/40 px-5 py-4 sm:px-6">{footer}</div>}
              </motion.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  )
}
