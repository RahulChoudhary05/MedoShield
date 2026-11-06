import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import Logo from '../../components/brand/Logo'
import Button from '../../components/ui/Button'
import { useAuth, homeFor } from '../../store/auth'
import { cn } from '../../lib/utils'

const LINKS = [
  ['How it works', '#how'],
  ['Features', '#features'],
  ['Security', '#security'],
  ['For clinicians', '#clinicians'],
  ['FAQ', '#faq'],
]

export default function PublicNav() {
  const { status, role } = useAuth()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24))
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className={cn('mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-full px-3 pl-5 transition-all duration-500', scrolled ? 'glass shadow-lift' : 'bg-transparent')}
      >
        <Link to="/" aria-label="MedoShield home"><Logo size={32} /></Link>
        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map(([l, h]) => (
            <li key={h}><a href={h} className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-2 transition hover:bg-ink/5 hover:text-ink">{l}</a></li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {status === 'authenticated' ? (
            <Button to={homeFor(role)} variant="primary" size="sm" iconRight={ArrowRight}>Open dashboard</Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">Sign in</Button>
              <Button to="/register" variant="primary" size="sm" iconRight={ArrowRight}>Start free</Button>
            </>
          )}
        </div>
        <button className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-line bg-paper sm:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-canvas/95 p-5 backdrop-blur-xl sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between">
              <Logo size={32} />
              <button className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-10 space-y-2">
              {LINKS.map(([l, h], i) => (
                <motion.li key={h} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <a href={h} onClick={() => setOpen(false)} className="block font-display text-3xl font-semibold tracking-tight">{l}</a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-10 grid gap-3">
              <Button to="/register" size="lg" variant="primary">Start free</Button>
              <Button to="/login" size="lg" variant="outline">Sign in</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
