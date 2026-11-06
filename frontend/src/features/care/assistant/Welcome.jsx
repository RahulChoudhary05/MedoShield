import { motion } from 'framer-motion'
import { Footprints, Hand, Moon, Pill } from 'lucide-react'
import { LogoMark } from '../../../components/brand/Logo'
import { cn, greeting } from '../../../lib/utils'

const STARTERS = [
  { icon: Hand, tone: 'icon-teal', text: 'My hands shake more in the evening — what might help?' },
  { icon: Footprints, tone: 'icon-teal', text: 'How can I make walking around my home safer?' },
  { icon: Moon, tone: 'icon-teal', text: 'Tips for sleeping better when my muscles feel stiff' },
  { icon: Pill, tone: 'icon-teal', text: 'What should I ask my doctor about my medication timing?' },
]

export default function Welcome({ name, onPick, disabled }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-2 py-8 text-center sm:py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative"
      >
        <span className="absolute inset-0 -z-10 animate-pulse2 rounded-[1.75rem] bg-teal-100" />
        <span className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-paper shadow-soft ring-1 ring-line">
          <LogoMark size={48} animated />
        </span>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem] text-balance">
        {greeting()}{name ? `, ${name}` : ''}. <span className="serif-accent text-teal-600">How are you feeling?</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 max-w-md text-[0.9375rem] text-ink-3 text-pretty">
        I’m Medo. I can explain your movement results, share everyday tips and help you decide when to see a doctor. I won’t diagnose — but I’ll always point you to the right care.
      </motion.p>
      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s.text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
            whileHover={{ y: -2 }}
            disabled={disabled}
            onClick={() => onPick(s.text)}
            className="card card-glow group flex items-start gap-3 p-4 text-left transition-shadow hover:shadow-lift disabled:opacity-60"
          >
            <span className={cn('icon-tile h-10 w-10 shrink-0 rounded-xl transition-transform group-hover:-rotate-6 group-hover:scale-105', s.tone)}>
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm leading-snug text-ink-2">{s.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
