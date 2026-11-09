import { motion } from 'framer-motion'
import { Activity, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Button from '../../components/ui/Button'
import { WordsReveal } from '../../components/ui/motion'
import BodyStage from '../../features/landing/BodyStage'
import { BuiltBy, Clinicians, Everyday, Facts, FAQ, FinalCTA, HowItWorks, Privacy, Science } from '../../features/landing/Sections'

const EASE = [0.2, 0.8, 0.2, 1]
// Hero copy is visible from the first frame and only settles into place (fast LCP, calm motion).
const fade = (d) => ({ initial: { y: 8 }, animate: { y: 0 }, transition: { delay: d * 0.5, duration: 0.5, ease: EASE } })

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="aurora pb-14 pt-28 sm:pb-20 sm:pt-36">
      <div className="container grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 xl:gap-20">
        <div className="max-w-[42rem]">
          <h1 id="hero-title" className="font-display text-[2.625rem] font-semibold leading-[1.06] tracking-[-0.04em] text-white sm:text-[3.75rem] xl:text-[4.75rem]">
            <span className="sr-only">Track tremor, gait and balance in ten seconds.</span>
            <span aria-hidden="true">
              <WordsReveal text="Track tremor, gait" className="sm:block" />{' '}
              <WordsReveal text="and balance in" className="sm:block" delay={0.08} />{' '}
              <WordsReveal text="ten seconds." className="text-teal-300 sm:block" delay={0.16} />
            </span>
          </h1>
          <motion.p {...fade(0.35)} className="mt-7 max-w-[36rem] text-[1.0625rem] leading-relaxed text-white/75 sm:text-lg">
            MedoShield AI is a free movement monitor. A ten-second check with your phone camera is measured against your own baseline, and the trend goes to the doctor you choose.
          </motion.p>
          <motion.div {...fade(0.45)} className="mt-9 flex flex-wrap gap-3">
            <Button to="/register" variant="primary" size="lg" iconRight={ArrowRight}>Start a free check</Button>
            <Button to="/use-cases/remote-patient-monitoring" size="lg" icon={Stethoscope} className="border border-white/20 bg-white/[.06] text-white hover:bg-white/[.12] hover:text-white" variant="ghost">For clinicians</Button>
          </motion.div>
          <motion.ul {...fade(0.55)} className="mt-10 grid max-w-[36rem] gap-3 border-t border-white/10 pt-6 text-[0.9375rem] text-white/70 sm:grid-cols-2">
            <li className="flex items-start gap-2.5"><ShieldCheck className="mt-[3px] h-4 w-4 shrink-0 text-teal-300" strokeWidth={1.8} aria-hidden="true" /> Video never leaves your phone — only 33 landmarks are analysed.</li>
            <li className="flex items-start gap-2.5"><Activity className="mt-[3px] h-4 w-4 shrink-0 text-teal-300" strokeWidth={1.8} aria-hidden="true" /> Compared with your own normal after five checks.</li>
          </motion.ul>
          <motion.p {...fade(0.65)} className="mt-6 text-[0.8125rem] text-white/50">
            Free for patients · runs in your browser · a monitoring tool, not a diagnostic device.
          </motion.p>
        </div>
        <motion.div {...fade(0.2)} className="mx-auto w-full max-w-[32rem] lg:max-w-none">
          <BodyStage />
        </motion.div>
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <MarketingLayout>
      <Hero />
      <Facts />
      <HowItWorks />
      <Science />
      <Privacy />
      <Everyday />
      <Clinicians />
      <FAQ />
      <BuiltBy />
      <FinalCTA />
    </MarketingLayout>
  )
}
