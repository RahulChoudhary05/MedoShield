import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock } from 'lucide-react'
import Logo from '../../components/brand/Logo'

const EASE = [0.2, 0.8, 0.2, 1]

/**
 * Editorial side panels: a real photograph plus product facts. No testimonials.
 */
const PANELS = {
  patient: {
    photo: 'https://images.unsplash.com/photo-1764072955216-547f731d176d?w=1200&q=78&auto=format&fit=crop',
    alt: 'An older man taking a calm morning walk by a lake',
    kicker: 'Field notes · patient',
    title: <>Ten seconds <span className="text-teal-300">once a day.</span></>,
    facts: [
      ['33', 'body landmarks tracked per frame, on your device'],
      ['4–12 Hz', 'tremor band measured at rest and with arms out'],
      ['5 sessions', 'to build the baseline every check is compared with'],
      ['0 frames', 'of raw video uploaded for a movement check'],
    ],
  },
  doctor: {
    photo: 'https://images.unsplash.com/photo-1758691462858-f1286e5daf40?w=1200&q=78&auto=format&fit=crop',
    alt: 'A doctor reviewing results with an older patient at a clinic desk',
    kicker: 'Field notes · clinician',
    title: <>A trend line <span className="text-teal-300">not a snapshot.</span></>,
    facts: [
      ['Tremor', 'dominant frequency and amplitude, check by check'],
      ['Gait', 'cadence and left / right symmetry over time'],
      ['Balance', 'sway against the patient’s own baseline'],
      ['Consent', 'you see a patient only after they request you and you accept'],
    ],
  },
}

function SidePanel({ variant }) {
  const p = PANELS[variant] || PANELS.patient
  return (
    <aside aria-label="About MedoShield" className="aurora hidden lg:flex lg:flex-col">
      <div className="sticky top-0 flex h-dvh flex-col p-8 xl:p-12">
        <motion.figure
          key={variant}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative min-h-0 flex-1 overflow-hidden rounded-2xl ring-1 ring-white/10"
        >
          <img
            src={p.photo}
            srcSet={[480, 800, 1200].map((w) => `${p.photo.replace(/w=\d+/, `w=${w}`)}&fm=webp ${w}w`).join(', ')}
            sizes="(min-width: 1024px) 45vw, 0px"
            alt={p.alt}
            width="1200"
            height="800"
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/10 to-transparent" />
          <figcaption className="glass absolute bottom-4 left-4 rounded-lg px-3 py-1.5 text-[0.8125rem] text-white/90">
            {variant === 'doctor' ? 'Between visits, the data keeps arriving.' : 'Check in the morning, before the day gets busy.'}
          </figcaption>
        </motion.figure>

        <motion.div
          key={`${variant}-facts`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="pt-8"
        >
          <p className="font-display text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white">{p.title}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {p.facts.map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-4">
                <dt className="font-mono text-[0.9375rem] font-medium text-teal-200">{k}</dt>
                <dd className="mt-1 text-[0.875rem] leading-snug text-white/70">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[0.8125rem] text-white/50">A monitoring and education tool — not a diagnostic device.</p>
        </motion.div>
      </div>
    </aside>
  )
}

/** Split auth layout: the form on plain canvas, an editorial panel on large screens. */
export default function AuthShell({ children, variant = 'patient' }) {
  return (
    <div className="grid min-h-dvh overflow-x-clip bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <div className="flex min-w-0 flex-col px-4 py-5 sm:px-10 sm:py-6">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="-m-1 inline-flex min-h-11 items-center rounded-lg p-1" aria-label="MedoShield home">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.875rem] text-ink-3 transition-colors duration-150 hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> Back to site
          </Link>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            {children}
          </motion.div>
        </main>

        <footer className="flex flex-col items-center gap-2 border-t border-line pt-5 text-center text-[0.8125rem] text-ink-3 sm:flex-row sm:justify-between sm:text-left">
          <p className="inline-flex items-center gap-1.5 font-mono">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" /> Argon2id · httpOnly sessions · TLS
          </p>
          <p className="flex gap-4">
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-ink sm:min-h-0">Privacy</Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-ink sm:min-h-0">Terms</Link>
            <Link to="/about" className="inline-flex min-h-11 items-center hover:text-ink sm:min-h-0">About</Link>
          </p>
        </footer>
      </div>

      <SidePanel variant={variant} />
    </div>
  )
}

/** Shared heading block: mono kicker, serif H1, lede. */
export function AuthHeading({ kicker, children, lede }) {
  return (
    <div>
      <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[2.875rem]">{children}</h1>
      {(lede || kicker) && <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-3">{lede || kicker}</p>}
    </div>
  )
}
