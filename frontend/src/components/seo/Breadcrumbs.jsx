import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * Visible breadcrumb trail. Mirrors the BreadcrumbList JSON-LD that scripts/seo-build.mjs
 * prerenders for the same page, so users and search engines see the same hierarchy.
 * items: [{ label, to }] — the last item is the current page (not a link).
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[0.875rem] text-ink-3">
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <li key={it.to || it.label} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-ink-2">{it.label}</span>
              ) : (
                <>
                  <Link to={it.to} className="rounded underline-offset-4 transition-colors hover:text-ink hover:underline">{it.label}</Link>
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 text-ink-4" strokeWidth={1.8} />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
