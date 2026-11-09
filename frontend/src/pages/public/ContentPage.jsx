import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Breadcrumbs from '../../components/seo/Breadcrumbs'
import Button from '../../components/ui/Button'
import { Reveal } from '../../components/ui/motion'
import { CONTENT_UPDATED, childrenOf, contentFor, HUBS } from '../../seo/content'
import { CREATOR, SITE } from '../../seo/site'
import { LinkedInMark } from '../../features/landing/SiteFooter'
import { fmtDate } from '../../lib/utils'
import NotFound from './NotFound'

/** Feature, use-case, comparison, hub, referral and partner pages — all rendered from src/seo/content.js. */
export default function ContentPage() {
  const { pathname } = useLocation()
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const page = contentFor(path)
  if (!page) return <NotFound />

  const parent = page.parent && HUBS.find((h) => h.path === page.parent)
  const crumbs = [{ label: 'Home', to: '/' }, ...(parent ? [{ label: parent.navLabel, to: parent.path }] : []), { label: page.navLabel || page.heading, to: page.path }]
  const kids = page.kind === 'hub' ? childrenOf(page.path) : []
  const related = (page.related || []).map(contentFor).filter(Boolean)

  return (
    <MarketingLayout>
      <article className="container pb-24 pt-28 sm:pt-32">
        <header className="max-w-3xl">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-6 font-serif text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.025em] text-ink sm:text-display-md">{page.heading}</h1>
          <p className="mt-5 max-w-[62ch] text-[1.0625rem] leading-relaxed text-ink-2 sm:text-lg">{page.intro}</p>
          <p className="mt-6 text-[0.875rem] text-ink-3">
            By <Link to="/about" rel="author" className="link">{CREATOR.name}</Link>, builder of {SITE.name}
            <span aria-hidden="true"> · </span>
            Updated <time dateTime={page.updated || CONTENT_UPDATED}>{fmtDate(page.updated || CONTENT_UPDATED)}</time>
          </p>
        </header>

        {page.kind === 'refer' && <ShareBox />}
        {page.kind === 'partners' && <PartnerContact />}

        {kids.length > 0 && (
          <ul className="mt-14 max-w-3xl divide-y divide-line border-y border-line">
            {kids.map((k) => (
              <li key={k.path}>
                <Link to={k.path} className="group flex items-start gap-6 py-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-[1.75rem] font-semibold leading-tight text-ink group-hover:underline group-hover:decoration-line group-hover:underline-offset-[6px]">{k.heading}</h2>
                    <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-3">{k.description}</p>
                  </div>
                  <ArrowRight aria-hidden className="mt-3 h-5 w-5 shrink-0 text-ink-4 transition-transform duration-150 group-hover:translate-x-[3px] group-hover:text-ink" strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {page.table && <CompareTable table={page.table} />}

        {page.sections?.length > 0 && (
          <div className="prose-doc mt-14">
            {page.sections.map((s) => (
              <section key={s.h}>
                <h2>{s.h}</h2>
                {s.p?.map((t) => <p key={t.slice(0, 32)}>{t}</p>)}
                {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
              </section>
            ))}
          </div>
        )}

        {page.faq?.length > 0 && (
          <section aria-labelledby="faq-title" className="mt-16 max-w-3xl">
            <h2 id="faq-title" className="font-serif text-[1.75rem] font-semibold text-ink">Common questions</h2>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {page.faq.map(([q, a]) => (
                <div key={q} className="py-5">
                  <dt className="font-medium text-ink">{q}</dt>
                  <dd className="mt-2 max-w-[65ch] text-[0.9375rem] leading-relaxed text-ink-3">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <nav aria-labelledby="related-title" className="mt-16 max-w-3xl">
            <h2 id="related-title" className="text-[1.0625rem] font-semibold text-ink">Read next</h2>
            <ul className="mt-4 space-y-1">
              {related.map((r) => (
                <li key={r.path}>
                  <Link to={r.path} className="group inline-flex min-h-11 items-center gap-2 text-[0.9375rem] text-teal-800 hover:text-ink">
                    {r.heading}
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-[3px]" strokeWidth={1.8} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {page.kind !== 'refer' && page.kind !== 'partners' && (
          <Reveal className="mt-20 flex flex-col gap-6 border-t border-ink/80 pt-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[28ch] font-serif text-[2rem] leading-tight text-ink">Take a ten-second check today.</p>
            <div className="flex flex-wrap gap-3">
              <Button to={page.cta?.to || '/register'} size="lg" iconRight={ArrowRight}>{page.cta?.label || 'Start a free check'}</Button>
              {!page.cta && <Button to="/use-cases/remote-patient-monitoring" variant="outline" size="lg">For clinicians</Button>}
            </div>
          </Reveal>
        )}
      </article>
    </MarketingLayout>
  )
}

function CompareTable({ table }) {
  return (
    <div className="mt-14 max-w-4xl overflow-x-auto rounded-xl border border-line bg-paper">
      <table className="w-full min-w-[560px] text-left text-[0.9375rem]">
        <thead className="border-b border-line bg-cream/50">
          <tr>{table.columns.map((c, i) => <th key={i} scope="col" className="px-4 py-3 font-medium text-ink">{c || <span className="sr-only">Aspect</span>}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {table.rows.map(([label, ...cells]) => (
            <tr key={label}>
              <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium text-ink-2">{label}</th>
              {cells.map((c, i) => <td key={i} className="px-4 py-3 text-ink-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Referral: one link, copied or shared natively. No personal data in the URL. */
function ShareBox() {
  const [copied, setCopied] = useState(false)
  const link = `${SITE.url}/register?utm_source=referral&utm_medium=share&utm_campaign=invite`
  const text = 'I’ve been using MedoShield to track tremor, walking and balance with a ten-second phone check. It’s free and the video stays on your phone.'
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Your browser blocked the clipboard. Select the link and copy it instead.')
    }
  }
  async function share() {
    try { await navigator.share({ title: SITE.name, text, url: link }) } catch { /* cancelled */ }
  }
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  return (
    <section aria-labelledby="share-title" className="mt-12 max-w-2xl rounded-xl border border-line bg-paper p-5 sm:p-6">
      <h2 id="share-title" className="text-[1.0625rem] font-semibold text-ink">Your invite link</h2>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="invite-link" className="sr-only">Invite link</label>
        <input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} className="input font-mono text-[0.875rem]" />
        <div className="flex gap-2">
          <Button variant="outline" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
          {canShare && <Button icon={Share2} onClick={share}>Share</Button>}
        </div>
      </div>
      <p className="mt-3 text-[0.875rem] text-ink-3">Or send it by <a className="link" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> or <a className="link" href={`mailto:?subject=${encodeURIComponent('Try MedoShield')}&body=${encodeURIComponent(`${text}\n\n${link}`)}`}>email</a>.</p>
    </section>
  )
}

function PartnerContact() {
  return (
    <section aria-labelledby="partner-title" className="mt-12 max-w-2xl rounded-xl border border-line bg-paper p-5 sm:p-6">
      <h2 id="partner-title" className="text-[1.0625rem] font-semibold text-ink">Start a conversation</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-3">Tell us who you support and how you would like to use MedoShield. You’ll hear back directly from {CREATOR.name}.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href={CREATOR.linkedin} target="_blank" rel="noopener noreferrer" icon={LinkedInMark} iconRight={ArrowUpRight}>Message on LinkedIn</Button>
        <Button to="/join/doctor" variant="outline">Join as a clinician instead</Button>
      </div>
    </section>
  )
}
