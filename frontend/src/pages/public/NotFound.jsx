import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Button from '../../components/ui/Button'
import Logo from '../../components/brand/Logo'
import { homeFor, useAuth } from '../../store/auth'

const EASE = [0.2, 0.8, 0.2, 1]

/** A flat trace with one small, out-of-place step — the 404 as a measurement. */
function FlatTrace() {
  return (
    <svg viewBox="0 0 320 60" className="h-auto w-full max-w-[320px]" aria-hidden="true">
      <line x1="0" y1="30" x2="320" y2="30" stroke="#E3DCCF" strokeWidth="1" />
      <motion.path
        d="M0 30 H150 L158 18 L166 42 L174 30 H320"
        fill="none"
        stroke="#3F6D56"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.65, 0, 0.35, 1] }}
      />
      <circle cx="166" cy="42" r="3" fill="#B95A31" />
    </svg>
  )
}

export default function NotFound() {
  const { status, role } = useAuth()
  const signedIn = status === 'authenticated'
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4 py-5 sm:px-10">
      <header>
        <Link to="/" className="-m-1 inline-flex min-h-11 items-center rounded-lg p-1" aria-label="MedoShield home"><Logo /></Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <p className="kicker">Error 404 · page not found</p>
          <h1 className="mt-3 font-serif text-[3rem] font-normal leading-[1] tracking-[-0.025em] text-ink sm:text-display-md">
            Nothing to measure <span className="serif-accent">here.</span>
          </h1>
          <div className="mt-8"><FlatTrace /></div>
          <p className="mt-8 max-w-md text-base leading-relaxed text-ink-3">
            The link may be old, or the page has moved. Everything else is where you left it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to={signedIn ? homeFor(role) : '/'} icon={ArrowLeft} size="lg">{signedIn ? 'Back to your dashboard' : 'Go to the home page'}</Button>
            {!signedIn && <Button to="/login" variant="outline" size="lg">Sign in</Button>}
          </div>
          <nav aria-label="Other pages" className="mt-10 border-t border-line pt-5">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[0.9375rem]">
              {[['About MedoShield', '/about'], ['Privacy policy', '/privacy'], ['Terms of use', '/terms']].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="group inline-flex min-h-11 items-center gap-1.5 text-ink-2 hover:text-ink">
                    {label}
                    <ArrowRight className="h-4 w-4 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </motion.div>
      </main>
    </div>
  )
}
