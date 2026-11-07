import { Suspense, lazy, useRef } from 'react'
import { useInView } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * The code-built 3D body-map human, loaded only when it nears the viewport.
 * three.js stays out of the first paint: the chunk is fetched the first time this
 * block scrolls within ~200px of view.
 */
const AnatomyCanvas = lazy(() => import('../../components/three/RealHuman'))

function Placeholder({ label }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <span className="font-mono text-[0.8125rem] text-ink-4">{label}</span>
    </div>
  )
}

export default function LazyHuman({ pose = 'walk', className, label = 'Loading 3D model' }) {
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '200px 0px' })
  return (
    <div ref={ref} className={cn('relative', className)}>
      {near ? (
        <Suspense fallback={<Placeholder label={label} />}>
          <AnatomyCanvas walking={pose === 'walk'} markers autoRotate={false} className="absolute inset-0" />
        </Suspense>
      ) : (
        <Placeholder label={label} />
      )}
    </div>
  )
}
