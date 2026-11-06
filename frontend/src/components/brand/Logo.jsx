import { cn } from '../../lib/utils'

/** The MedoShield mark: a soft shield carrying a "movement pulse" that resolves into a warm dot. */
export function LogoMark({ size = 36, className, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ms-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5E8C74" />
          <stop offset="1" stopColor="#2F5444" />
        </linearGradient>
        <linearGradient id="ms-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M32 4 9 12.5v17.2C9 45 19 56 32 60c13-4 23-15 23-30.3V12.5Z" fill="url(#ms-g)" />
      <path d="M32 4 9 12.5v17.2C9 45 19 56 32 60c13-4 23-15 23-30.3V12.5Z" fill="url(#ms-sheen)" />
      <path
        d="M17 35h7.5l4-11 7 20 4.5-9H47"
        fill="none"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animated ? { strokeDasharray: 80, strokeDashoffset: 80, animation: 'ms-draw 1.6s .2s cubic-bezier(.2,.7,.2,1) forwards' } : undefined}
      />
      <circle cx="47" cy="35" r="3.4" fill="#DFA180" />
      {animated && <style>{'@keyframes ms-draw{to{stroke-dashoffset:0}}'}</style>}
    </svg>
  )
}

export default function Logo({ className, size = 34, tagline = false, animated }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} animated={animated} />
      <span className="leading-none">
        <span className="font-display text-[1.2rem] font-semibold tracking-tight text-ink">
          Medo<span className="text-teal-700">Shield</span>
        </span>
        {tagline && <span className="mt-1 block text-[0.68rem] font-medium uppercase tracking-[.18em] text-ink-3">Neuro-motor care</span>}
      </span>
    </span>
  )
}
