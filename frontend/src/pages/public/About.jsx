import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Button from '../../components/ui/Button'
import { Reveal } from '../../components/ui/motion'
import { GitHubMark, LinkedInMark } from '../../features/landing/SiteFooter'
import { CREATOR, PUBLIC_ROUTES } from '../../seo/site'

const EASE = [0.2, 0.8, 0.2, 1]
const ABOUT = PUBLIC_ROUTES.find((r) => r.path === '/about')

const PIPELINE = [
  ['01', 'Ten seconds of video, in the browser', 'You hold still, hold your arms out, or walk a few steps in front of a phone or laptop camera. Frames are read straight from the camera inside the page.'],
  ['02', '33 landmarks per frame, on device', 'MediaPipe pose estimation turns each frame into 33 body landmarks — shoulders, wrists, hips, ankles. The video stays on your device; only these coordinates move on.'],
  ['03', 'Signals, not pictures', 'Wrist motion is analysed for tremor in the 4–12 Hz band; ankle and hip paths give gait cadence and left/right symmetry; the body’s centre gives balance sway. A quality gate rejects noisy recordings instead of guessing.'],
  ['04', 'Compared with you, not an average', 'Your first five sessions form a personal baseline. Every later check is read against it, so the question is always “has this changed for me?”'],
  ['05', 'Shared with the doctor you chose', 'If you connect with a clinician — and they accept — they see the same trend between visits, with flagged checks surfaced first.'],
]

const STACK = [
  ['Interface', 'React 19, Vite, Tailwind CSS, framer-motion'],
  ['On-device vision', 'MediaPipe Pose (33 landmarks), running in the browser'],
  ['3D', 'three.js for the 3D human figure on the home page'],
  ['API', 'FastAPI (Python), Argon2id passwords, httpOnly cookie sessions'],
  ['Data', 'MongoDB Atlas'],
  ['AI', 'Groq with Google Gemini fallback, behind medical guardrails'],
  ['Hosting', 'Cloudflare Pages (web), Render (API)'],
]

const TIMELINE = [
  ['2022 – 2026', 'B.E. Computer Science & Engineering', 'Chandigarh University'],
  ['During university', 'Freelance full-stack developer', 'Built and shipped web platforms for S Raj Infra Projects and R K Technical Support.'],
  ['June 2026 – present', 'Full Stack AI Developer, Omnithrive Technologies', 'Next.js and TypeScript AI products and agentic LLM workflows, including ABHA (Ayushman Bharat) healthcare interoperability.'],
]

const PROJECTS = [
  ['MedoShield AI', 'This product. Designed and built end to end — on-device pose analysis, clinician dashboard, guarded AI assistant, deployment.'],
  ['CipherSQL Studio', 'A SQL learning platform with isolated practice workspaces; provisioning time cut from 60+ seconds to under one second.'],
]

const FACTS = [
  ['Based in', CREATOR.location],
  ['Certificates', 'AWS — Advanced SQL & Database Design; IBM — Full-Stack Web Development'],
  ['Practice', '400+ LeetCode problems solved'],
  ['Open source', '1,000+ GitHub contributions'],
]

function SectionHead({ kicker, id, children, lede }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="kicker">{kicker}</p>
      <h2 id={id} className="mt-3 font-serif text-[2.25rem] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-display-sm">{children}</h2>
      {lede && <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-3">{lede}</p>}
    </Reveal>
  )
}

function ProfileLink({ href, icon: Icon, label, handle }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer me"
      className="group flex min-h-11 items-center justify-between gap-4 border-b border-line py-3 text-ink-2 transition-colors duration-150 hover:text-ink"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-[18px] w-[18px]" />
        <span className="text-[0.9375rem] font-medium">{label}</span>
        <span className="hidden font-mono text-[0.8125rem] text-ink-3 min-[420px]:inline">{handle}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-ink-4 transition-transform duration-150 group-hover:-translate-y-[2px] group-hover:translate-x-[2px]" strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

export default function About() {
  return (
    <MarketingLayout>
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="container pb-16 pt-28 sm:pb-24 sm:pt-40">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="max-w-4xl">
          <p className="kicker">About MedoShield AI</p>
          <h1 className="mt-4 font-serif text-[3rem] font-normal leading-[0.98] tracking-[-0.03em] text-ink sm:text-display-lg lg:text-display-xl">
            Movement, measured <span className="serif-accent">quietly.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[1.125rem] leading-relaxed text-ink-2">{ABOUT.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="#creator" variant="outline" size="lg">Meet the creator</Button>
            <Button to="/register" variant="brand" size="lg" iconRight={ArrowRight}>Start a free check</Button>
          </div>
        </motion.div>
      </section>

      {/* ── Why ───────────────────────────────────────── */}
      <section aria-labelledby="why" className="border-t border-line">
        <div className="container grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <SectionHead kicker="Why it exists" id="why">A neurologist sees you for fifteen minutes, every few months.</SectionHead>
            <Reveal className="mt-8 max-w-[62ch] space-y-5 text-base leading-[1.7] text-ink-2">
              <p>
                Tremor, gait and balance change slowly, and they change between appointments. By the time a visit comes
                round, the story of the last three months has to be reconstructed from memory: “I think it’s been worse in
                the mornings.”
              </p>
              <p>
                MedoShield replaces that guesswork with a ten-second check anyone can take with the phone they already own.
                The goal is modest and specific: a reliable trend line, against your own baseline, that you and your
                clinician can both read.
              </p>
              <p>
                It had to be private by design. Asking people to film themselves at home every day only works if the video
                never has to leave their device — so for a movement check, it doesn’t.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <figure className="overflow-hidden rounded-3xl border border-line bg-cream">
              <img
                src="https://images.unsplash.com/photo-1758691031979-6128d4029604?w=1100&q=78&auto=format&fit=crop"
                srcSet="https://images.unsplash.com/photo-1758691031979-6128d4029604?w=480&q=75&fm=webp&fit=crop 480w, https://images.unsplash.com/photo-1758691031979-6128d4029604?w=800&q=75&fm=webp&fit=crop 800w, https://images.unsplash.com/photo-1758691031979-6128d4029604?w=1100&q=75&fm=webp&fit=crop 1100w"
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt="An older woman checking her health results on a smartphone at home"
                width="1100"
                height="825"
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="border-t border-line bg-paper px-5 py-3 font-mono text-[0.8125rem] text-ink-3">
                A check is designed to take less time than making tea.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section aria-labelledby="science" className="border-t border-line bg-paper">
        <div className="container py-20 sm:py-28">
          <SectionHead kicker="The movement science" id="science" lede="Everything between the camera and the trend line, in five steps.">
            From camera to trend, <span className="serif-plain">on your device first.</span>
          </SectionHead>
          <ol className="mt-12 border-t border-line">
            {PIPELINE.map(([n, title, body], i) => (
              <Reveal as="li" key={n} delay={i * 0.05} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[5rem_minmax(0,18rem)_minmax(0,1fr)] sm:gap-8 sm:py-8">
                <span className="font-mono text-[0.875rem] text-ink-3">{n}</span>
                <h3 className="text-[1.0625rem] font-medium leading-snug text-ink">{title}</h3>
                <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-3">{body}</p>
              </Reveal>
            ))}
          </ol>
          <p className="mt-6 text-[0.875rem] text-ink-3">
            MedoShield is a monitoring and education tool, not a diagnostic device. Read the <Link to="/privacy" className="link">privacy policy</Link> for exactly what is stored.
          </p>
        </div>
      </section>

      {/* ── Stack ────────────────────────────────────── */}
      <section aria-labelledby="stack" className="border-t border-line">
        <div className="container grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <SectionHead kicker="How it is built" id="stack" lede="A small, deliberate stack. AI is used where it helps explain, never where it would have to diagnose.">
            The tech stack
          </SectionHead>
          <Reveal>
            <dl className="border-t border-line">
              {STACK.map(([k, v]) => (
                <div key={k} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-mono text-[0.875rem] text-ink-3">{k}</dt>
                  <dd className="text-[0.9375rem] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── Creator ──────────────────────────────────── */}
      <section id="creator" aria-labelledby="creator-h" className="scroll-mt-20 border-t border-line bg-paper">
        <div className="container py-20 sm:py-28">
          <Reveal>
            <p className="kicker">The creator</p>
            <h2 id="creator-h" className="mt-4 font-serif text-[3.25rem] font-normal leading-[0.95] tracking-[-0.03em] text-ink sm:text-display-lg">
              {CREATOR.name}
            </h2>
            <p className="mt-3 font-mono text-[0.9375rem] text-ink-3">{CREATOR.role} · {CREATOR.location}</p>
          </Reveal>

          <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
            <div className="min-w-0">
              <Reveal className="max-w-[62ch] space-y-5 text-base leading-[1.7] text-ink-2">
                <p className="font-serif text-[1.5rem] leading-[1.35] tracking-[-0.01em] text-ink">
                  Rahul designed and built MedoShield AI end to end — the on-device movement analysis, the clinician
                  workspace, the guarded AI assistant and the deployment it runs on.
                </p>
                <p>
                  {CREATOR.summary} His work sits where software meets healthcare: interoperable health records, clinical
                  tools that respect privacy, and AI that is fenced in by guardrails rather than left to improvise.
                </p>
              </Reveal>

              <Reveal className="mt-14">
                <h3 className="kicker">Timeline</h3>
                <ol className="mt-5 border-l border-line">
                  {TIMELINE.map(([when, what, detail]) => (
                    <li key={what} className="relative pb-8 pl-6 last:pb-0">
                      <span aria-hidden="true" className="absolute -left-[4.5px] top-[0.45rem] h-2 w-2 rounded-full border border-teal-700 bg-paper" />
                      <p className="font-mono text-[0.8125rem] text-ink-3">{when}</p>
                      <p className="mt-1 text-[1rem] font-medium text-ink">{what}</p>
                      <p className="mt-1 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-3">{detail}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>

              <Reveal className="mt-14">
                <h3 className="kicker">Selected projects</h3>
                <ul className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
                  {PROJECTS.map(([name, body]) => (
                    <li key={name} className="bg-paper p-5">
                      <p className="font-serif text-[1.5rem] leading-tight text-ink">{name}</p>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-3">{body}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <aside aria-label="Profile facts" className="min-w-0 lg:pt-1">
              <Reveal className="lg:sticky lg:top-28">
                <h3 className="kicker">Find him online</h3>
                <div className="mt-3 border-t border-line">
                  <ProfileLink href={CREATOR.github} icon={GitHubMark} label="GitHub" handle="RahulChoudhary05" />
                  <ProfileLink href={CREATOR.linkedin} icon={LinkedInMark} label="LinkedIn" handle="rahulchoudhary210505" />
                </div>

                <h3 className="kicker mt-10">Facts</h3>
                <dl className="mt-3 border-t border-line">
                  {FACTS.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 border-b border-line py-3">
                      <dt className="font-mono text-[0.8125rem] text-ink-3">{k}</dt>
                      <dd className="text-[0.9375rem] text-ink">{v}</dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 border-b border-line py-3">
                    <dt className="font-mono text-[0.8125rem] text-ink-3">Patent</dt>
                    <dd className="text-[0.9375rem] text-ink">
                      AI-Enhanced Neuroadaptive VR Therapy System
                      <span className="mt-0.5 block font-mono text-[0.8125rem] text-ink-3">Application No. 202511113779</span>
                    </dd>
                  </div>
                </dl>

                <h3 className="kicker mt-10">Works with</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {CREATOR.skills.map((s) => (
                    <li key={s} className="rounded-md border border-line bg-canvas px-2.5 py-1 font-mono text-[0.8125rem] text-ink-2">{s}</li>
                  ))}
                </ul>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────── */}
      <section className="border-t border-line">
        <div className="container flex flex-col items-start gap-6 py-20 sm:flex-row sm:items-end sm:justify-between sm:py-24">
          <Reveal className="max-w-xl">
            <h2 className="font-serif text-[2.25rem] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-display-sm">
              Ten seconds is enough <span className="serif-accent">to start.</span>
            </h2>
            <p className="mt-3 text-base text-ink-3">Free for patients. Your video never leaves your device for a movement check.</p>
          </Reveal>
          <div className="flex flex-wrap gap-3">
            <Button to="/register" variant="brand" size="lg" iconRight={ArrowRight}>Start a free check</Button>
            <Button to="/join/doctor" variant="outline" size="lg">Join as a clinician</Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
