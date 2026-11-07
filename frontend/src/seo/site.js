/**
 * Single source of truth for SEO — used by the React app (RouteMeta) at runtime
 * and by scripts/seo-build.mjs at build time, so every public URL ships real,
 * route-specific HTML <head> tags (no JavaScript needed for crawlers / link previews).
 * Plain ESM, no JSX: Node imports this file directly.
 */
export const SITE = {
  name: 'MedoShield AI',
  shortName: 'MedoShield',
  url: 'https://medoshield.pages.dev',
  locale: 'en_IN',
  themeColor: '#F6F2EA',
  ogImage: '/og/og-default.png',
  ogImageAlt: 'MedoShield AI — privacy-first tremor, gait and balance monitoring from a ten-second phone check',
  tagline: 'Privacy-first tremor, gait & balance monitoring',
  description:
    'A ten-second phone check measures tremor, gait and balance on your own device, tracks change against your baseline and shares the trend with your doctor.',
  keywords: [
    'tremor test online', 'Parkinson\'s monitoring app', 'gait analysis app', 'balance assessment', 'remote patient monitoring',
    'neurology telemedicine', 'pose estimation health', 'movement disorder tracking', 'MediaPipe pose', 'privacy-first health AI',
  ],
}

/** The person who designed and built MedoShield AI. */
export const CREATOR = {
  name: 'Rahul Choudhary',
  role: 'Full Stack & AI Developer',
  summary:
    'Full Stack & AI developer building production-grade MERN / PERN platforms and agentic, LLM-integrated systems — from architecture to deployment.',
  location: 'India',
  github: 'https://github.com/RahulChoudhary05',
  linkedin: 'https://www.linkedin.com/in/rahulchoudhary210505/',
  education: 'B.E. Computer Science & Engineering, Chandigarh University (2022 – 2026)',
  work: 'Full Stack AI Developer at Omnithrive Technologies',
  patent: 'Patent: AI-Enhanced Neuroadaptive VR Therapy System (Application No. 202511113779)',
  skills: ['React', 'Next.js', 'TypeScript', 'FastAPI', 'Node.js', 'MongoDB', 'PostgreSQL', 'Docker', 'Cloudflare', 'Azure', 'LLM integration', 'Agentic AI'],
}

/**
 * Public, indexable routes. `heading`/`intro` are also emitted as crawlable fallback
 * content inside <noscript> and as the BreadcrumbList name.
 */
export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'MedoShield AI — Tremor, gait & balance monitoring',
    description: SITE.description,
    heading: 'Your movement, quietly understood.',
    intro: 'A ten-second check with your phone camera measures tremor, gait and balance on your device. MedoShield tracks the change against your own baseline and shares the trend with your doctor.',
    changefreq: 'weekly', priority: 1.0,
  },
  {
    path: '/about',
    title: 'About MedoShield & creator Rahul Choudhary',
    description: 'Why MedoShield AI exists, how its on-device movement science works, and who built it — Rahul Choudhary, Full Stack & AI developer.',
    heading: 'About MedoShield AI',
    intro: 'MedoShield AI was designed and built end-to-end by Rahul Choudhary — a privacy-first platform that measures neuro-motor signals with a phone camera and puts the trend in front of a clinician.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/register',
    title: 'Create your free account',
    description: 'Start privacy-first tremor, gait and balance monitoring in under a minute. Free for patients — your video never leaves your device.',
    heading: 'Start caring smarter',
    intro: 'Create a free patient account and take your first ten-second movement check.',
    changefreq: 'monthly', priority: 0.8,
  },
  {
    path: '/join/doctor',
    title: 'Join as a clinician',
    description: 'Monitor patients between visits with objective tremor, gait and balance biomarkers, AI-assisted summaries and secure messaging.',
    heading: 'Join MedoShield as a clinician',
    intro: 'See each patient\'s movement trend between visits, review flagged checks and message securely.',
    changefreq: 'monthly', priority: 0.7,
  },
  {
    path: '/login',
    title: 'Sign in',
    description: 'Sign in to MedoShield AI as a patient or clinician to continue privacy-first tremor, gait and balance monitoring.',
    heading: 'Welcome back',
    intro: 'Sign in to continue your monitoring.',
    changefreq: 'yearly', priority: 0.4,
  },
  {
    path: '/privacy',
    title: 'Privacy policy',
    description: 'How MedoShield AI handles your data: on-device pose tracking, no raw video storage, encrypted sessions and doctor access only with your consent.',
    heading: 'Privacy policy',
    intro: 'Your video never leaves your device. Here is exactly what we store, why, and how you control it.',
    changefreq: 'yearly', priority: 0.3,
  },
  {
    path: '/terms',
    title: 'Terms of use',
    description: 'The terms for using MedoShield AI, a monitoring and education tool that supports, but never replaces, a qualified clinician.',
    heading: 'Terms of use',
    intro: 'MedoShield AI is a monitoring and education tool, not a diagnostic device.',
    changefreq: 'yearly', priority: 0.3,
  },
]

/** Private areas: titled for the browser tab, never indexed. */
export const PRIVATE_TITLES = [
  ['/app/check', 'Movement check'], ['/app/video', 'Video review'], ['/app/reports', 'Lab reports'], ['/app/timeline', 'Timeline'],
  ['/app/assistant', 'Ask Medo'], ['/app/medications', 'Medications'], ['/app/wellbeing', 'Wellbeing'], ['/app/care', 'Care team'],
  ['/app/messages', 'Messages'], ['/app/settings', 'Settings'], ['/app', 'Home'],
  ['/doctor/patients', 'Patients'], ['/doctor/appointments', 'Appointments'], ['/doctor/messages', 'Messages'],
  ['/doctor/settings', 'Settings'], ['/doctor', 'Clinic overview'],
]

export const FAQ = [
  ['Is my video uploaded?', 'No. Pose tracking runs in your browser; only 33 body-landmark coordinates per frame are sent for analysis. Raw video never leaves your device for a movement check.'],
  ['Is MedoShield a diagnostic device?', 'No. It is a monitoring and education tool that supports, but never replaces, assessment by a qualified clinician.'],
  ['What does a check measure?', 'Rest and postural tremor frequency (4–12 Hz band), gait cadence and left/right symmetry, and balance sway — compared against your own personal baseline.'],
  ['Who can see my results?', 'Only you, and doctors you sent an appointment request to who accepted it. You can revoke access at any time.'],
  ['How accurate is a phone camera?', 'Each check is scored against your own baseline built from your first five sessions, with a signal-quality gate that rejects noisy recordings instead of guessing.'],
  ['Who built MedoShield AI?', 'MedoShield AI was designed and built by Rahul Choudhary, a Full Stack & AI developer from India.'],
]

export const fullTitle = (route) => (route.path === '/' ? route.title : `${route.title} · ${SITE.name}`)
export const absUrl = (path = '/') => `${SITE.url}${path === '/' ? '/' : path}`

/** JSON-LD graph shared by every page (Organization, WebSite, Person) + page-specific nodes. */
export function jsonLd(route) {
  const url = absUrl(route.path)
  const person = {
    '@type': 'Person', '@id': `${SITE.url}/#creator`, name: CREATOR.name, jobTitle: CREATOR.role,
    description: CREATOR.summary, url: `${SITE.url}/about`, sameAs: [CREATOR.github, CREATOR.linkedin],
    knowsAbout: CREATOR.skills, alumniOf: { '@type': 'CollegeOrUniversity', name: 'Chandigarh University' },
    address: { '@type': 'PostalAddress', addressCountry: 'IN' },
  }
  const graph = [
    { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: `${SITE.url}/`, logo: `${SITE.url}/icons/icon-512.png`, founder: { '@id': `${SITE.url}/#creator` } },
    { '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, inLanguage: 'en-IN', publisher: { '@id': `${SITE.url}/#org` }, creator: { '@id': `${SITE.url}/#creator` } },
    person,
    {
      '@type': route.path === '/about' ? 'AboutPage' : route.path === '/' ? 'MedicalWebPage' : 'WebPage',
      '@id': `${url}#webpage`, url, name: fullTitle(route), description: route.description, inLanguage: 'en-IN',
      isPartOf: { '@id': `${SITE.url}/#website` }, author: { '@id': `${SITE.url}/#creator` },
      primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE.url}${SITE.ogImage}`, width: 1200, height: 630 },
      ...(route.path === '/about' ? { mainEntity: { '@id': `${SITE.url}/#creator` } } : {}),
    },
  ]
  if (route.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: route.heading, item: url },
      ],
    })
  }
  if (route.path === '/') {
    graph.push({
      '@type': 'SoftwareApplication', '@id': `${SITE.url}/#app`, name: SITE.name, url: `${SITE.url}/`,
      applicationCategory: 'HealthApplication', applicationSubCategory: 'Remote patient monitoring', operatingSystem: 'Web, Android, iOS',
      description: SITE.description, image: `${SITE.url}${SITE.ogImage}`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      author: { '@id': `${SITE.url}/#creator` }, publisher: { '@id': `${SITE.url}/#org` },
      featureList: ['On-device pose estimation (33 landmarks)', 'Tremor frequency analysis (4–12 Hz)', 'Gait cadence & symmetry', 'Personal baseline', 'Clinician dashboard', 'Guarded medical AI assistant'],
    })
    graph.push({
      '@type': 'FAQPage', '@id': `${SITE.url}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    })
    graph[3].about = [
      { '@type': 'MedicalCondition', name: 'Parkinson\'s disease' },
      { '@type': 'MedicalSignOrSymptom', name: 'Tremor' },
      { '@type': 'MedicalSignOrSymptom', name: 'Gait disturbance' },
    ]
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}
