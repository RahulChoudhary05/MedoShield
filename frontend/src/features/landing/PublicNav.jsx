import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import Logo from '../../components/brand/Logo'
import Button from '../../components/ui/Button'
import { useAuth, homeFor } from '../../store/auth'
import { cn } from '../../lib/utils'

// Section links resolve against the landing page from anywhere on the site.
const LINKS = [
  ['How it works', '/#how'],
  ['Science', '/#science'],
  ['Privacy', '/#privacy'],
  ['Clinicians', '/#clinicians'],
  ['About', '/about'],
]

function NavItem({ href, children, onClick, className }) {
  const { pathname } = useLocation()
  if (href.startsWith('/#') && pathname === '/') {
    return <a href={href.slice(1)} onClick={onClick} className={className}>{children}</a>
  }
  return <NavLink to={href} onClick={onClick} className={className}>{children}</NavLink>
}

export default function PublicNav() {
  const { status, role } = useAuth()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12))
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-colors duration-300', scrolled ? 'border-b border-line bg-canvas/90 backdrop-blur-md' : 'border-b border-transparent')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>
      <nav aria-label="Primary" className="container flex h-16 items-center gap-6">
        <Link to="/" aria-label="MedoShield AI home" className="shrink-0"><Logo /></Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <NavItem href={href} className="rounded-lg px-3 py-2 text-[0.9375rem] text-ink-2 transition-colors duration-150 hover:text-ink">{label}</NavItem>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {status === 'authenticated' ? (
            <Button to={homeFor(role)} variant="primary" size="sm" iconRight={ArrowRight}>Open dashboard</Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">Sign in</Button>
              <Button to="/register" variant="primary" size="sm">Start a free check</Button>
            </>
          )}
        </div>
        <button className="ml-auto grid h-11 w-11 place-items-center rounded-lg border border-line bg-paper sm:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Menu className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog" aria-modal="true" aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-canvas px-5 pb-8 pt-3 sm:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="flex h-12 items-center justify-between">
              <Logo />
              <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-paper" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" strokeWidth={1.8} /></button>
            </div>
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {LINKS.map(([label, href], i) => (
                <motion.li key={href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.3 }}>
                  <NavItem href={href} onClick={() => setOpen(false)} className="flex items-center justify-between py-4 font-serif text-[2rem] leading-none">
                    {label} <ArrowRight className="h-5 w-5 text-ink-4" strokeWidth={1.6} />
                  </NavItem>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto grid gap-3">
              <Button to="/register" size="lg" variant="primary" onClick={() => setOpen(false)}>Start a free check</Button>
              <Button to="/login" size="lg" variant="outline" onClick={() => setOpen(false)}>Sign in</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
