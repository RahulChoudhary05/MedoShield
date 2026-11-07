import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import MarketingLayout from '../../components/layout/MarketingLayout'
import { cn } from '../../lib/utils'

const EASE = [0.2, 0.8, 0.2, 1]

/** Tracks which section heading is nearest the top of the viewport. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -65% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [ids])
  return active
}

function Toc({ sections, active }) {
  return (
    <ol className="space-y-0.5 border-l border-line">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            aria-current={active === s.id ? 'location' : undefined}
            className={cn(
              '-ml-px flex min-h-11 items-center lg:min-h-9 gap-3 border-l py-1.5 pl-4 text-[0.875rem] leading-snug transition-colors duration-150',
              active === s.id ? 'border-teal-700 text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            <span className="font-mono text-[0.8125rem] text-ink-4">{String(i + 1).padStart(2, '0')}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  )
}

/**
 * Long-form document page (privacy, terms): serif title, "last updated" stamp,
 * sticky table of contents on desktop, collapsible contents on mobile.
 * sections: [{ id, title, body }]
 */
export default function LegalPage({ kicker, title, lede, updated, summary, sections }) {
  const ids = sections.map((s) => s.id)
  const [idsKey] = useState(() => ids)
  const active = useActiveSection(idsKey)

  return (
    <MarketingLayout>
      <div className="container pb-24 pt-28 sm:pt-36">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-3xl border-b border-line pb-10"
        >
          <p className="kicker">{kicker}</p>
          <h1 className="mt-3 font-serif text-[2.75rem] font-normal leading-[1] tracking-[-0.025em] text-ink sm:text-display-md lg:text-display-lg">{title}</h1>
          {lede && <p className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{lede}</p>}
          <p className="mt-6 font-mono text-[0.8125rem] text-ink-3">Last updated: <time dateTime={updated.iso}>{updated.label}</time></p>
        </motion.header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="lg:order-none">
            <details className="group rounded-xl border border-line bg-paper lg:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
                On this page
                <ChevronDown className="h-4 w-4 text-ink-3 transition-transform duration-200 group-open:rotate-180" strokeWidth={1.8} aria-hidden="true" />
              </summary>
              <div className="border-t border-line px-4 py-3"><Toc sections={sections} active={active} /></div>
            </details>
            <div className="sticky top-28 hidden lg:block">
              <p className="kicker mb-4">On this page</p>
              <Toc sections={sections} active={active} />
            </div>
          </nav>

          <article className="prose-doc min-w-0">
            {summary && (
              <aside aria-label="Summary" className="mb-10 rounded-xl border border-line bg-paper p-5 sm:p-6">
                <p className="font-mono text-[0.8125rem] text-ink-3">In short</p>
                <ul className="!my-3 !space-y-2">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
              </aside>
            )}
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
                <h2 id={`${s.id}-h`} className={cn(i === 0 && "!mt-0")}>
                  <span className="mr-3 font-mono text-[0.9375rem] text-ink-4" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </div>
    </MarketingLayout>
  )
}
