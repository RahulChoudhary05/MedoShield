import { motion } from 'framer-motion'
import { ArrowRight, Stethoscope } from 'lucide-react'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Button from '../../components/ui/Button'
import { WordsReveal } from '../../components/ui/motion'
import BodyStage from '../../features/landing/BodyStage'
import { BuiltBy, Clinicians, Everyday, Facts, FAQ, FinalCTA, HowItWorks, Privacy, Science } from '../../features/landing/Sections'

const EASE = [0.2, 0.8, 0.2, 1]
const fade = (d) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.7, ease: EASE } })

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b border-line pb-16 pt-24 sm:pb-24 sm:pt-32">
      <div className="container grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 xl:gap-20">
        <div className="max-w-[40rem]">
          <motion.p {...fade(0)} className="kicker flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden="true" />
            Privacy-first neuro-motor monitoring
          </motion.p>
          <h1 id="hero-title" className="h-display mt-6 text-[2.75rem] leading-[0.98] sm:text-[3.75rem] xl:text-[4.5rem]">
            <span className="sr-only">Your movement, quietly understood.</span>
            <span aria-hidden="true">
              <WordsReveal text="Your movement," className="block" />
              <WordsReveal text="quietly understood." className="block italic text-teal-700" delay={0.12} />
            </span>
          </h1>
          <motion.p {...fade(0.35)} className="mt-7 max-w-[34rem] text-[1.0625rem] leading-relaxed text-ink-2 sm:text-lg">
            A ten-second check with your phone camera measures tremor, gait and balance. MedoShield compares it with your own baseline and shares the trend with the doctor you chose.
          </motion.p>
          <motion.p {...fade(0.45)} className="mt-7 max-w-[34rem] border-l-2 border-teal-700 pl-4 text-[0.9375rem] leading-relaxed text-ink-2">
            Raw video never leaves your phone. Only 33 landmark coordinates per frame are sent for analysis.
          </motion.p>
          <motion.div {...fade(0.55)} className="mt-9 flex flex-wrap gap-3">
            <Button to="/register" variant="primary" size="lg" iconRight={ArrowRight}>Start a free check</Button>
            <Button to="/join/doctor" variant="outline" size="lg" icon={Stethoscope}>For clinicians</Button>
          </motion.div>
          <motion.p {...fade(0.65)} className="mt-6 text-[0.875rem] text-ink-3">
            A monitoring and education tool, not a diagnostic device.
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
