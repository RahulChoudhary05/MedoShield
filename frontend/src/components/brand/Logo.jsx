import { cn } from '../../lib/utils'

/** The MedoShield mark: a pine tile carrying a single movement trace that resolves into an ember dot. */
export function LogoMark({ size = 32, className, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#2549CC" />
      <path
        d="M13 36h8.5l4.5-13 7.5 21 5-11H50"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animated ? { strokeDasharray: 90, strokeDashoffset: 90, animation: 'ms-draw 1.4s .15s cubic-bezier(.2,.8,.2,1) forwards' } : undefined}
      />
      <circle cx="50" cy="33" r="3.6" fill="#F98E66" />
      {animated && <style>{'@keyframes ms-draw{to{stroke-dashoffset:0}}'}</style>}
    </svg>
  )
}

export default function Logo({ className, size = 30, tagline = false, animated, inverse = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} animated={animated} />
      <span className="leading-none">
        <span className={cn('font-display text-[1.0625rem] font-semibold tracking-[-0.03em]', inverse ? 'text-white' : 'text-ink')}>MedoShield</span>
        {tagline && <span className={cn('mt-1 block text-[0.75rem]', inverse ? 'text-white/55' : 'text-ink-3')}>Neuro-motor care</span>}
      </span>
    </span>
  )
}
