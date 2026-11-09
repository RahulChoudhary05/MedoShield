import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

const EASE = [0.2, 0.8, 0.2, 1]

/** Fade/slide in when scrolled into view. */
export function Reveal({ children, delay = 0, y = 14, className, as = 'div', once = true }) {
  const M = motion[as] || motion.div
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once, margin: '-60px' }} transition={{ duration: 0.5, delay, ease: EASE }}>
      {children}
    </M>
  )
}

/** Staggered children for page entrances. Wrap items in <StaggerItem>. */
export function Stagger({ children, className, delay = 0, gap = 0.06 }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}>
      {children}
    </motion.div>
  )
}
export function StaggerItem({ children, className }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
      {children}
    </motion.div>
  )
}

/** Animated number that counts up when visible. */
export function CountUp({ value, decimals = 0, duration = 1.2, className, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView || value == null || isNaN(value)) return
    const controls = animate(0, Number(value), { duration, ease: EASE, onUpdate: (v) => setDisplay(v) })
    return () => controls.stop()
  }, [inView, value, duration])
  return (
    <span ref={ref} className={cn('num', className)}>
      {value == null || isNaN(value) ? '—' : `${prefix}${display.toFixed(decimals)}${suffix}`}
    </span>
  )
}

/** Card hover: a quiet 2px lift (no tilt, no glare — calmer for a health product). */
export function TiltCard({ children, className }) {
  return <div className={cn('relative transition-transform duration-200 ease-out hover:-translate-y-0.5', className)}>{children}</div>
}

/** Formerly a magnetic CTA wrapper; now a plain inline wrapper (buttons handle their own hover). */
export function Magnetic({ children, className }) {
  return <div className={cn('inline-block', className)}>{children}</div>
}

/** Retired: the Field Notes system has no decorative blobs. Kept so old imports still compile. */
export function Blobs() {
  return null
}

/** Headline that settles in word by word — visible from the first frame (no opacity/blur), so it can be the LCP at once. */
export function WordsReveal({ text, className, delay = 0 }) {
  const words = String(text).split(' ')
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block align-bottom">
          <motion.span className="inline-block" initial={{ y: '40%' }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: delay + i * 0.04, ease: EASE }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/**
 * Page heading block used across the app: serif title first (it carries its own weight),
 * then an optional context line (date, status) and a muted lede, with actions on the right.
 * Labels never sit above the heading.
 */
export function PageHeader({ kicker, title, accent, description, actions, className }) {
  const full = `${title || ''} ${accent || ''}`.toLowerCase()
  const meta = kicker && !full.includes(String(kicker).toLowerCase()) ? kicker : null
  return (
    <header className={cn('mb-8 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="page-title">
          {title}{accent && <> <span className="text-teal-600">{accent}</span></>}
        </h1>
        {meta && <p className="mt-2 text-[0.9375rem] font-medium text-ink-2">{meta}</p>}
        {description && <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
