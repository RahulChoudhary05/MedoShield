import { useEffect, useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import Lenis from 'lenis'
import { ArrowRight, Lock, ShieldCheck, Stethoscope, Users } from 'lucide-react'
import PublicNav from '../../features/landing/PublicNav'
import { Clinicians, Everyday, FAQ, Features, FinalCTA, Footer, HowItWorks, Ribbon, Security, Stats } from '../../features/landing/Sections'
import PoseOnPhoto from '../../features/landing/PoseOnPhoto'
import Button from '../../components/ui/Button'
import { Magnetic } from '../../components/ui/motion'
import { cn } from '../../lib/utils'



function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    let id
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (a && a.getAttribute('href').length > 1) { e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { offset: -90 }) }
    }
    document.addEventListener('click', onClick)
    return () => { cancelAnimationFrame(id); lenis.destroy(); document.removeEventListener('click', onClick) }
  }, [])
}

function PreviewMetric({ label, value, sub, tone = 'ink' }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-paper px-4 py-3.5">
      <p className="text-[0.7rem] font-medium uppercase tracking-[.14em] text-ink-4">{label}</p>
      <p className={cn('num mt-1 text-2xl font-semibold', tone === 'sage' ? 'text-teal-700' : tone === 'clay' ? 'text-apricot-500' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
    </div>
  )
}

function ProductPreview() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotate = useTransform(scrollYProgress, [0, 0.45], [10, 0])
  const scale = useTransform(scrollYProgress, [0, 0.45], [0.94, 1])
  return (
    <motion.div ref={ref} style={{ rotateX: rotate, scale, transformPerspective: 1600 }} className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[3rem] bg-teal-100/40 blur-3xl" />
      <div className="overflow-hidden rounded-[2rem] border border-line/80 bg-paper shadow-lift">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-line/70 bg-cream/50 px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="mx-auto hidden rounded-full border border-line/70 bg-paper px-4 py-1 font-mono text-[0.7rem] text-ink-4 sm:block">app.medoshield.ai/check</span>
          <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-teal-700"><Lock className="h-3 w-3" /> On-device</span>
        </div>
        <div className="grid gap-0 md:grid-cols-[0.9fr_1fr]">
          <div className="relative aspect-[3/4] border-b border-line/70 md:aspect-auto md:min-h-[560px] md:border-b-0 md:border-r">
            <PoseOnPhoto />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-line/70 bg-paper/90 px-3 py-1.5 text-xs font-medium text-ink-2 backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-pulse2 rounded-full bg-apricot-400" /><span className="relative h-2 w-2 rounded-full bg-apricot-500" /></span>
              Recording · 33 landmarks
            </div>
            <div className="absolute bottom-4 left-4 right-4 h-1.5 overflow-hidden rounded-full bg-line/70">
              <motion.div className="h-full rounded-full bg-teal-600" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
            </div>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-3">Today's movement check</p>
                <p className="font-display text-xl font-semibold">Steady and consistent</p>
              </div>
              <span className="badge bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-100">Low risk</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PreviewMetric label="Motor index" value="92" sub="+3 vs. baseline" tone="sage" />
              <PreviewMetric label="Tremor" value="0.0 Hz" sub="No 4–12 Hz peak" />
              <PreviewMetric label="Gait symmetry" value="97%" sub="Left / right steps" />
              <PreviewMetric label="Cadence" value="108" sub="steps per minute" />
            </div>
            <div className="rounded-2xl border border-line/60 bg-paper px-4 py-3">
              <p className="mb-2 text-xs text-ink-3">30-day trend</p>
              <svg viewBox="0 0 300 60" className="w-full">
                <motion.path d="M0,44 C30,40 50,38 75,40 C100,42 120,30 150,32 C180,34 200,24 225,22 C250,20 275,24 300,16" fill="none" stroke="#3A6652" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
                <circle cx="300" cy="16" r="3.5" fill="#C06D48" />
              </svg>
            </div>
            <p className="mt-auto flex items-center gap-2 text-xs text-ink-3"><Stethoscope className="h-3.5 w-3.5 text-teal-700" /> Shared with Dr. Sarah Johnson · Neurologist</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function Hero() {
  const fade = (d) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] } })
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60%_55%_at_50%_0%,rgba(197,216,203,.55),transparent_70%)]" />
      <div className="container relative text-center">
        <motion.p {...fade(0)} className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-600" /> Privacy-first neuro-motor monitoring
        </motion.p>
        <motion.h1 {...fade(0.08)} id="hero-title" className="mx-auto mt-7 max-w-4xl font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-display-lg lg:text-[5rem] text-balance">
          Your movement, <span className="serif-accent">quietly understood.</span>
        </motion.h1>
        <motion.p {...fade(0.16)} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-3 sm:text-xl text-pretty">
          A ten-second check with your phone camera measures tremor, gait and balance — on your device.
          MedoShield tracks the change against your own baseline and shares the trend with your doctor.
        </motion.p>
        <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnetic><Button to="/register" size="lg" variant="primary" iconRight={ArrowRight}>Start a free check</Button></Magnetic>
          <Button to="/join/doctor" size="lg" variant="outline" icon={Stethoscope}>For clinicians</Button>
        </motion.div>
        <motion.ul {...fade(0.32)} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-3">
          {[[Lock, 'Video never leaves your device'], [ShieldCheck, 'Guarded medical AI'], [Users, 'Your doctor sees the trend']].map(([I, t]) => (
            <li key={t} className="flex items-center gap-1.5"><I className="h-4 w-4 text-teal-700" /> {t}</li>
          ))}
        </motion.ul>
        <ProductPreview />
      </div>
    </section>
  )
}

export default function Landing() {
  useLenis()
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas">
      <motion.div style={{ scaleX: bar }} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-teal-600" />
      <PublicNav />
      <main id="main">
        <Hero />
        <Ribbon />
        <HowItWorks />
        <Stats />
        <Everyday />
        <Features />
        <Security />
        <Clinicians />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
