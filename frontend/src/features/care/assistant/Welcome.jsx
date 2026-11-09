import { motion } from 'framer-motion'
import { ArrowRight, Footprints, Hand, Moon, Pill } from 'lucide-react'
import { LogoMark } from '../../../components/brand/Logo'
import { greeting } from '../../../lib/utils'

const STARTERS = [
  { icon: Hand, text: 'My hands shake more in the evening — what might help?' },
  { icon: Footprints, text: 'How can I make walking around my home safer?' },
  { icon: Moon, text: 'Tips for sleeping better when my muscles feel stiff' },
  { icon: Pill, text: 'What should I ask my doctor about my medication timing?' },
]

const EASE = [0.2, 0.8, 0.2, 1]

export default function Welcome({ name, onPick, disabled }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-1 py-6 sm:py-10">
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-paper" aria-hidden>
        <LogoMark size={32} animated />
      </motion.span>
      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5, ease: EASE }} className="mt-5 font-serif text-[2rem] leading-tight text-ink sm:text-[2.25rem]">
        {greeting()}{name ? `, ${name}` : ''}. <span className="text-teal-600">How are you feeling?</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16, duration: 0.5 }} className="mt-2 max-w-prose text-base text-ink-3">
        I’m Medo. I can explain your movement results, share everyday tips and help you decide when to see a doctor. I won’t diagnose — but I’ll point you to the right care.
      </motion.p>
      <p className="kicker mt-8">Try asking</p>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {STARTERS.map((s, i) => (
          <motion.li key={s.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: EASE }}>
            <button disabled={disabled} onClick={() => onPick(s.text)} className="group flex min-h-[52px] w-full items-center gap-3 px-1 py-3 text-left transition-colors duration-150 hover:bg-cream/60 disabled:opacity-60">
              <s.icon className="h-[18px] w-[18px] shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
              <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-2">{s.text}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} aria-hidden />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
