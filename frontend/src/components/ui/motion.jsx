import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

const EASE = [0.2, 0.7, 0.2, 1]

/** Fade/slide in when scrolled into view. */
export function Reveal({ children, delay = 0, y = 18, className, as = 'div', once = true }) {
  const M = motion[as] || motion.div
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once, margin: '-60px' }} transition={{ duration: 0.65, delay, ease: EASE }}>
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
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
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

/** 3D tilt-on-hover card with a moving specular highlight. */
export function TiltCard({ children, className, max = 8, glare = true }) {
  const ref = useRef(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 20 })
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 20 })
  const gx = useTransform(mx, (v) => `${v * 100}%`)
  const gy = useTransform(my, (v) => `${v * 100}%`)
  const glareBg = useTransform([gx, gy], ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgba(255,255,255,.55), transparent 45%)`)
  function onMove(e) {
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  function reset() {
    mx.set(0.5)
    my.set(0.5)
  }
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} className={cn('relative [transform-style:preserve-3d]', className)}>
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  )
}

/** Magnetic hover wrapper for CTAs. */
export function Magnetic({ children, strength = 0.25, className }) {
  const ref = useRef(null)
  const x = useSpring(0, { stiffness: 260, damping: 18 })
  const y = useSpring(0, { stiffness: 260, damping: 18 })
  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/** Soft animated gradient blobs for section backgrounds. */
export function Blobs({ className, variant = 'warm' }) {
  const sets = {
    warm: ['bg-teal-100/60', 'bg-apricot-100/50', 'bg-cream'],
    cool: ['bg-teal-100/50', 'bg-cream', 'bg-teal-50'],
    sunny: ['bg-butter-100/60', 'bg-apricot-50', 'bg-teal-50'],
  }[variant]
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className={cn('absolute -left-24 -top-24 h-[28rem] w-[28rem] animate-blob rounded-full blur-3xl', sets[0])} />
      <div className={cn('absolute -right-20 top-10 h-[24rem] w-[24rem] animate-blob rounded-full blur-3xl [animation-delay:-6s]', sets[1])} />
      <div className={cn('absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] animate-blob rounded-full blur-3xl [animation-delay:-12s]', sets[2])} />
    </div>
  )
}
