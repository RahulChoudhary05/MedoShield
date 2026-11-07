import { Suspense, lazy, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Footprints, PersonStanding, ScanLine } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Hero stage: the realistic rigged 3D human (components/three/RealHuman.jsx).
 * A lightweight SVG silhouette paints instantly; three.js is fetched only after the page
 * has loaded and the browser is idle, so the 3D never competes with the first paint (LCP).
 */
const AnatomyCanvas = lazy(() => import('../../components/three/RealHuman'))

/**
 * Start the 3D only after the visitor interacts (scroll, touch, pointer move, key) or taps
 * "Load 3D". Page load stays light: the headline and text are interactive immediately, and
 * the ~350 KB 3D engine never adds to the blocking time of the first visit.
 */
function useOnFirstInteraction() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (ready) return undefined
    const events = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel']
    const go = () => { setReady(true); events.forEach((e) => window.removeEventListener(e, go)) }
    events.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }))
    return () => events.forEach((e) => window.removeEventListener(e, go))
  }, [ready])
  return [ready, () => setReady(true)]
}

/** Instant, zero-cost placeholder in the same body-map style. */
function Silhouette() {
  return (
    <svg viewBox="0 0 200 420" className="h-[82%] w-auto" aria-hidden="true">
      <g fill="#EFE9DE" stroke="#B5AC9F" strokeWidth="1.4">
        <rect x="40" y="96" width="20" height="120" rx="10" transform="rotate(6 50 96)" />
        <rect x="140" y="96" width="20" height="120" rx="10" transform="rotate(-6 150 96)" />
        <rect x="70" y="240" width="27" height="160" rx="13" />
        <rect x="103" y="240" width="27" height="160" rx="13" />
        <path d="M58 92c10-10 74-10 84 0l6 72c-4 18-8 40-10 72H62c-2-32-6-54-10-72Z" />
        <rect x="90" y="64" width="20" height="22" rx="8" />
        <ellipse cx="100" cy="42" rx="22" ry="27" />
      </g>
      <ellipse cx="100" cy="410" rx="46" ry="5" fill="#D4CDC3" opacity=".6" />
    </svg>
  )
}

function Toggle({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-paper p-1 shadow-soft">
      {options.map(([v, text, Icon, aria]) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={aria || text}
            onClick={() => onChange(v)}
            className={cn('relative flex h-9 min-w-[2.75rem] items-center justify-center rounded-full px-3 text-[0.875rem] font-medium transition-colors duration-150', on ? 'text-paper' : 'text-ink-3 hover:text-ink')}
          >
            {on && <motion.span layoutId={`pill-${label}`} className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.24, ease: [0.65, 0, 0.35, 1] }} />}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
              {text}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const SEX = [['female', '♀', null, 'Female body'], ['male', '♂', null, 'Male body']]
const MOTION = [['walk', 'Walk', Footprints], ['stand', 'Stand', PersonStanding]]

export default function BodyStage() {
  const [ready, load] = useOnFirstInteraction()
  const [sex, setSex] = useState('female') // the woman is shown first; visitors can switch to the man
  const [mode, setMode] = useState('walk')
  const [markers, setMarkers] = useState(true)

  return (
    <figure className="overflow-hidden rounded-3xl border border-line bg-paper">
      <div className="relative aspect-[4/5] w-full bg-[radial-gradient(60%_55%_at_50%_45%,#F3F6F9_0%,#FCFAF6_72%)] sm:aspect-[5/6]">
        {!ready && (
          <button type="button" onClick={load} className="absolute inset-0 grid place-items-center" aria-label="Load the interactive 3D human">
            <Silhouette />
          </button>
        )}
        {ready && (
          <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><Silhouette /></div>}>
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <AnatomyCanvas sex={sex} walking={mode === 'walk'} markers={markers} className="h-full w-full cursor-grab active:cursor-grabbing" />
            </motion.div>
          </Suspense>
        )}

        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <Toggle label="Body" options={SEX} value={sex} onChange={setSex} />
        </div>
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <Toggle label="Motion" options={MOTION} value={mode} onChange={setMode} />
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:inset-x-4 sm:bottom-4">
          <button
            type="button"
            onClick={() => setMarkers((v) => !v)}
            aria-pressed={markers}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors', markers ? 'border-apricot-200 bg-apricot-50 text-apricot-600' : 'border-line bg-paper text-ink-3 hover:text-ink')}
          >
            <ScanLine className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> Landmarks {markers ? 'on' : 'off'}
          </button>
          <span className="hidden font-mono text-[0.8125rem] text-ink-4 sm:block">Drag to rotate</span>
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
        {[['Landmarks', '33 / frame'], ['Tremor band', '4–12 Hz'], ['Video sent', '0 bytes']].map(([k, v]) => (
          <div key={k} className="px-3 py-3 sm:px-4">
            <dt className="font-mono text-[0.8125rem] text-ink-4">{k}</dt>
            <dd className="mt-0.5 font-mono text-[0.9375rem] tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="sr-only">Interactive 3D human model walking with a natural gait cycle; the markers show the joints MedoShield tracks.</figcaption>
    </figure>
  )
}
