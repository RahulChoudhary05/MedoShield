import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PublicNav from '../../features/landing/PublicNav'
import SiteFooter from '../../features/landing/SiteFooter'

/** Shell for public marketing pages: nav, main landmark, creator-credit footer, hash scrolling. */
export default function MarketingLayout({ children }) {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) { el.scrollIntoView({ block: 'start' }); return }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas">
      <PublicNav />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
