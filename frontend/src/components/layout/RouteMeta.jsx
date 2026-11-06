import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE = 'MedoShield AI'
const PUBLIC = {
  '/': ['MedoShield AI — Privacy-first tremor, gait & balance monitoring', 'A 10-second phone check measures tremor, gait and balance on your device and shares the trend with your doctor.'],
  '/login': ['Sign in', 'Sign in to MedoShield AI as a patient or clinician.'],
  '/register': ['Create your free account', 'Start privacy-first movement monitoring in under a minute.'],
  '/join/doctor': ['Join as a clinician', 'Monitor patients between visits with objective motion biomarkers.'],
}
const PRIVATE = [
  ['/app/check', 'Movement check'], ['/app/video', 'Video review'], ['/app/reports', 'Lab reports'], ['/app/timeline', 'Timeline'],
  ['/app/assistant', 'Ask Medo'], ['/app/medications', 'Medications'], ['/app/wellbeing', 'Wellbeing'], ['/app/care', 'Care team'],
  ['/app/messages', 'Messages'], ['/app/settings', 'Settings'], ['/app', 'Home'],
  ['/doctor/patients', 'Patients'], ['/doctor/appointments', 'Appointments'], ['/doctor/messages', 'Messages'], ['/doctor/settings', 'Settings'], ['/doctor', 'Clinic overview'],
]

function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Per-route <title>, description, canonical and robots (private areas are noindex). */
export default function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const pub = PUBLIC[pathname]
    const priv = PRIVATE.find(([p]) => pathname.startsWith(p))
    if (pub) {
      document.title = pathname === '/' ? pub[0] : `${pub[0]} · ${SITE}`
      setMeta('description', pub[1])
      setMeta('og:title', document.title, 'property')
      setMeta('og:description', pub[1], 'property')
      setMeta('robots', 'index, follow, max-image-preview:large')
    } else {
      document.title = priv ? `${priv[1]} · ${SITE}` : `Page not found · ${SITE}`
      setMeta('robots', 'noindex, nofollow')
    }
    const canonical = document.head.querySelector('link[rel="canonical"]')
    if (canonical) canonical.href = `${window.location.origin}${pub ? pathname : '/'}`
  }, [pathname])
  return null
}
