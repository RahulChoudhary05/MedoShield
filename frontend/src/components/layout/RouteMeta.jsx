import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PRIVATE_TITLES, PUBLIC_ROUTES, SITE, absUrl, fullTitle } from '../../seo/site'

function setMeta(key, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]:not([hreflang])`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Keeps <head> in sync during client-side navigation. The first paint of every public URL
 * already has these tags baked in by scripts/seo-build.mjs; private areas are noindex.
 */
export default function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
    const route = PUBLIC_ROUTES.find((r) => r.path === path)
    if (route) {
      const title = fullTitle(route)
      document.title = title
      setMeta('description', route.description)
      setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
      setMeta('og:title', title, 'property')
      setMeta('og:description', route.description, 'property')
      setMeta('og:url', absUrl(route.path), 'property')
      setMeta('twitter:title', title)
      setMeta('twitter:description', route.description)
      setLink('canonical', absUrl(route.path))
    } else {
      const priv = PRIVATE_TITLES.find(([p]) => path.startsWith(p))
      document.title = priv ? `${priv[1]} · ${SITE.name}` : `Page not found · ${SITE.name}`
      setMeta('robots', 'noindex, nofollow')
      setLink('canonical', absUrl('/'))
    }
  }, [pathname])
  return null
}
