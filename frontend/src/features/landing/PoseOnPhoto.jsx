import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * A real photograph with the REAL output of MediaPipe Pose Landmarker (heavy model)
 * drawn on top. The 33 landmarks below were produced by running the same model the
 * app uses on this exact image — nothing is hand-placed.
 * Photo: Unsplash (free licence), "older man walking on paved plaza".
 */
export const HERO_PHOTO = 'https://images.unsplash.com/photo-1789597851461-6cdc76122fbc'
const W = 1200
const H = 1600
// [x, y, visibility] normalised — output of PoseLandmarker.detect() on HERO_PHOTO at 1200x1600
const L = [[0.535,0.1234,1],[0.5345,0.1086,1],[0.533,0.1081,1],[0.532,0.1077,1],[0.5307,0.1071,1],[0.5263,0.1054,1],[0.5221,0.1036,1],[0.5073,0.1038,1],[0.493,0.0981,1],[0.518,0.1357,1],[0.5136,0.1331,1],[0.4716,0.1708,1],[0.4214,0.1585,1],[0.4638,0.2978,0.12],[0.3987,0.2905,1],[0.4817,0.3777,0.27],[0.4365,0.3923,1],[0.4844,0.4091,0.3],[0.4322,0.428,0.99],[0.4976,0.4081,0.32],[0.4583,0.4245,0.99],[0.4971,0.3996,0.27],[0.4627,0.4124,0.98],[0.4765,0.3765,1],[0.448,0.3767,1],[0.5247,0.5284,0.61],[0.4864,0.5328,0.95],[0.3922,0.6448,0.67],[0.4402,0.6934,0.98],[0.3483,0.6473,0.75],[0.4202,0.7212,0.9],[0.4185,0.7056,0.83],[0.5291,0.7289,0.97]]
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32], [7, 11], [8, 12]]
const JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]
const P = (i) => [L[i][0] * W, L[i][1] * H]

function Tag({ x, y, label, value, delay, align = 'left' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.6 }}
      className={cn('absolute rounded-xl border border-white/70 bg-paper/90 px-3 py-2 shadow-soft backdrop-blur', align === 'right' && '-translate-x-full')}
      style={{ left: `${x}%`, top: `${y}%` }}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[.14em] text-ink-4">{label}</p>
      <p className="num text-sm font-semibold text-ink">{value}</p>
    </motion.div>
  )
}

export default function PoseOnPhoto({ className }) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-cream', className)}>
      <img
        src={`${HERO_PHOTO}?w=1200&q=80&auto=format&fit=crop`}
        srcSet={`${HERO_PHOTO}?w=640&q=75&auto=format&fit=crop 640w, ${HERO_PHOTO}?w=1200&q=80&auto=format&fit=crop 1200w`}
        sizes="(min-width: 768px) 560px, 100vw"
        width={W}
        height={H}
        alt="An older man walking across a city plaza, with his body landmarks detected by MedoShield's on-device pose AI"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-top grayscale-[10%]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full" aria-hidden>
        {BONES.map(([a, b], i) => {
          const sure = Math.min(L[a][2], L[b][2]) >= 0.5
          const [x1, y1] = P(a)
          const [x2, y2] = P(b)
          return (
            <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={sure ? '#C5D8CB' : '#FFFDF9'} strokeOpacity={sure ? 0.95 : 0.55}
              strokeWidth={sure ? 7 : 4} strokeLinecap="round" strokeDasharray={sure ? undefined : '10 12'}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }} />
          )
        })}
        {JOINTS.map((i, k) => {
          const [x, y] = P(i)
          const sure = L[i][2] >= 0.5
          return (
            <motion.g key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 + k * 0.04, type: 'spring', stiffness: 300 }} style={{ transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r={sure ? 13 : 9} fill="#FFFDF9" fillOpacity={sure ? 1 : 0.6} stroke="#2F5444" strokeWidth={sure ? 5 : 3} />
            </motion.g>
          )
        })}
        {/* wrist focus ring = where tremor is measured */}
        <motion.circle cx={P(16)[0]} cy={P(16)[1]} r={34} fill="none" stroke="#DFA180" strokeWidth={4}
          style={{ transformOrigin: `${P(16)[0]}px ${P(16)[1]}px` }} animate={{ scale: [1, 1.45, 1], opacity: [0.9, 0.2, 0.9] }} transition={{ duration: 2.4, repeat: Infinity }} />
        {/* scan line */}
        <motion.rect x={0} width={W} height={4} fill="#FFFDF9" opacity={0.7}
          animate={{ y: [H * 0.08, H * 0.76, H * 0.08] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      </svg>
      <Tag x={58} y={36} label="Wrist · tremor" value="0.0 Hz" delay={1.6} />
      <Tag x={8} y={56} label="Stride" value="Symmetry 97%" delay={1.8} />
      <Tag x={60} y={66} label="Cadence" value="108 spm" delay={2} />
    </div>
  )
}
