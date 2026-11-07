import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Logo from '../../components/brand/Logo'
import { CREATOR } from '../../seo/site'

function GitHubMark(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}
function LinkedInMark(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

const COLUMNS = [
  ['Product', [['How it works', '/#how'], ['The science', '/#science'], ['Privacy by design', '/#privacy'], ['For clinicians', '/join/doctor']]],
  ['Get started', [['Create a free account', '/register'], ['Sign in', '/login'], ['Join as a clinician', '/join/doctor']]],
  ['Company', [['About & creator', '/about'], ['Privacy policy', '/privacy'], ['Terms of use', '/terms']]],
]

/** Site-wide footer with the creator credit (Rahul Choudhary). */
export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="container grid gap-12 py-16 md:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-3">
            Privacy-first tremor, gait and balance monitoring. A monitoring and education tool — it supports, but never replaces, your clinician.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <p className="text-[0.8125rem] font-medium text-ink">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, to]) => (
                  <li key={to}><Link to={to} className="text-[0.9375rem] text-ink-3 transition-colors duration-150 hover:text-ink">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Creator credit */}
      <div className="border-t border-line">
        <div className="container flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.9375rem] text-ink-2">
            Designed &amp; built by{' '}
            <Link to="/about" className="link font-medium" rel="author">{CREATOR.name}</Link>
            <span className="text-ink-4"> — {CREATOR.role}</span>
          </p>
          <div className="flex items-center gap-2">
            <a href={CREATOR.github} target="_blank" rel="noopener noreferrer me" aria-label="Rahul Choudhary on GitHub"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-ink-2 transition hover:border-ink-4 hover:text-ink">
              <GitHubMark className="h-4 w-4" /> GitHub <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" strokeWidth={1.8} />
            </a>
            <a href={CREATOR.linkedin} target="_blank" rel="noopener noreferrer me" aria-label="Rahul Choudhary on LinkedIn"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-ink-2 transition hover:border-ink-4 hover:text-ink">
              <LinkedInMark className="h-4 w-4" /> LinkedIn <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" strokeWidth={1.8} />
            </a>
          </div>
        </div>
        <div className="container flex flex-col gap-2 border-t border-line py-5 text-[0.8125rem] text-ink-4 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} MedoShield AI · Made in India</p>
          <p>Not a medical device. In an emergency call 112 / 108.</p>
        </div>
      </div>
    </footer>
  )
}

export { GitHubMark, LinkedInMark }
