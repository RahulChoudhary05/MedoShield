import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Quote, ShieldCheck, Sparkles } from 'lucide-react'
import Logo from '../../components/brand/Logo'
import { Blobs } from '../../components/ui/motion'

const PANELS = {
  patient: {
    quote: 'I record a short walk every morning. My neurologist noticed my tremor change before I did.',
    who: 'Arjun, 65 — early Parkinson’s monitoring',
  },
  doctor: {
    quote: 'Instead of one snapshot every three months, I see a trend line — and the patients who need me first.',
    who: 'Movement-disorder clinic, Bengaluru',
  },
}

export default function AuthLayout({ children, variant = 'patient' }) {
  const p = PANELS[variant]
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="w-fit"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-4"><Lock className="h-3.5 w-3.5" /> Encrypted in transit · Argon2id · httpOnly sessions</p>
      </div>

      <div className="relative hidden overflow-hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-50 via-paper to-apricot-50 ring-1 ring-line">
          <img src="https://images.unsplash.com/photo-1764072955216-547f731d176d?w=1400&q=78&auto=format&fit=crop" alt="" aria-hidden width="1400" height="928" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-paper/55 via-paper/20 to-paper/90" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <span className="eyebrow w-fit"><Sparkles className="h-3.5 w-3.5 text-apricot-400" /> MedoShield AI</span>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="relative mx-auto w-full max-w-md">
              <div className="glass rounded-[2rem] p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-3">Motor index · 30 days</p>
                  <span className="badge bg-teal-50 text-teal-700">Stable</span>
                </div>
                <svg viewBox="0 0 320 110" className="mt-4 w-full">
                  <defs><linearGradient id="al" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A6652" stopOpacity=".3" /><stop offset="1" stopColor="#3A6652" stopOpacity="0" /></linearGradient></defs>
                  <motion.path d="M0,70 C30,62 50,58 80,60 C110,62 130,40 160,44 C190,48 210,36 240,30 C270,24 290,30 320,22" fill="none" stroke="#3A6652" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.4 }} />
                  <path d="M0,70 C30,62 50,58 80,60 C110,62 130,40 160,44 C190,48 210,36 240,30 C270,24 290,30 320,22 L320,110 L0,110Z" fill="url(#al)" />
                </svg>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['92', 'Index'], ['0.0', 'Tremor Hz'], ['98%', 'Symmetry']].map(([v, l]) => (
                    <div key={l} className="rounded-2xl bg-white/80 py-2.5"><p className="num text-lg font-semibold">{v}</p><p className="text-[0.68rem] text-ink-4">{l}</p></div>
                  ))}
                </div>
              </div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="glass absolute -right-6 -top-6 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-teal-600" /> Video never uploaded
              </motion.div>
            </motion.div>

            <figure className="max-w-md">
              <Quote className="h-7 w-7 text-apricot-300" />
              <blockquote className="mt-3 font-serif text-[1.65rem] italic leading-snug text-ink">{p.quote}</blockquote>
              <figcaption className="mt-3 text-sm text-ink-3">{p.who}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>
  )
}
