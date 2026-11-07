import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, BellRing, Camera, Check, FileText, MessageSquare, Minus, Server, Siren, Smartphone, Stethoscope,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { CountUp, Reveal } from '../../components/ui/motion'
import { CREATOR, FAQ as FAQ_ITEMS } from '../../seo/site'
import { cn } from '../../lib/utils'
import GuardrailDemo from './GuardrailDemo'
import LazyHuman from './HeroScene'
import { Spark, StepBars, SwayPlot, TremorSpectrum, TrendLine } from './Visuals'

const EASE = [0.2, 0.8, 0.2, 1]
const VIEW = { once: true, margin: '-60px' }

/* ───────────────────────── shared pieces ───────────────────────── */

/** Editorial section header: a margin note (number + name) beside a serif heading. */
function SectionHead({ id, n, name, title, accent, lede, children }) {
  return (
    <div className="grid gap-6 border-t border-ink/80 pt-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <p className="kicker flex gap-3 md:flex-col md:gap-1">
        <span className="text-ink">§ {n}</span>
        <span>{name}</span>
      </p>
      <Reveal>
        <h2 id={id} className="h-display max-w-[20ch] text-[2.375rem] leading-[1.02] sm:text-display-md lg:text-[3.5rem]">
          {title}{accent && <> <span className="italic text-teal-700">{accent}</span></>}
        </h2>
        {lede && <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink-2 sm:text-[1.0625rem]">{lede}</p>}
        {children}
      </Reveal>
    </div>
  )
}

function Section({ id, labelledBy, className, children }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('scroll-mt-20 py-20 sm:py-28', className)}>
      <div className="container">{children}</div>
    </section>
  )
}

/* ───────────────────────── 2. product facts ───────────────────────── */

const FACTS = [
  { value: 33, label: 'body landmarks tracked per frame, on your own device' },
  { text: '4–12', unit: 'Hz', label: 'tremor band, read from a Welch power spectrum' },
  { value: 10, unit: 's', label: 'per check, with the phone you already own' },
  { value: 5, unit: 'sessions', label: 'of good-quality data build your personal baseline' },
]

export function Facts() {
  return (
    <section aria-labelledby="facts-title" className="border-b border-line">
      <h2 id="facts-title" className="sr-only">MedoShield in four numbers</h2>
      <div className="container">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.05}
              className={cn('flex flex-col py-8 pr-4 sm:py-10', i % 2 === 1 && 'border-l border-line pl-4 sm:pl-6', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l lg:pl-6')}>
              <dt className="order-2 mt-3 max-w-[24ch] text-[0.9375rem] leading-snug text-ink-3">{f.label}</dt>
              <dd className="order-1 flex items-baseline gap-1.5">
                {f.text
                  ? <span className="font-serif text-[2.75rem] leading-none tracking-[-0.02em] text-ink sm:text-[3.5rem]">{f.text}</span>
                  : <CountUp value={f.value} className="font-serif text-[2.75rem] font-normal leading-none text-ink sm:text-[3.5rem]" />}
                {f.unit && <span className="font-mono text-[0.875rem] text-ink-3">{f.unit}</span>}
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ───────────────────────── 3. how it works ───────────────────────── */

const STEPS = [
  {
    n: '01', title: 'Record ten seconds',
    text: 'Prop your phone up, step back, then walk, stand still or hold your hands out. MediaPipe Pose finds 33 body landmarks in the browser while the camera feed stays on the phone.',
    meta: 'Camera → landmarks, on device',
  },
  {
    n: '02', title: 'Measured on the landmarks',
    text: 'Wrist motion becomes a frequency spectrum, so tremor shows up as a peak in the 4–12 Hz band. Ankle and trunk signals give cadence, left/right symmetry and sway.',
    meta: 'Landmarks → biomarkers',
  },
  {
    n: '03', title: 'Compared with you, shared with your doctor',
    text: 'Each check is scored against a baseline built from your first five good sessions, then the trend goes to the clinician you chose.',
    meta: 'Biomarkers → trend → clinician',
  },
]

function StepVisual({ n }) {
  if (n === '01') return <LazyHuman pose="walk" className="aspect-[4/3] w-full" label="Loading the 3D walker" />
  if (n === '02') {
    return (
      <div className="flex aspect-[4/3] flex-col justify-center gap-2 px-4">
        <TremorSpectrum axis={false} label={false} />
        <p className="font-mono text-[0.8125rem] text-ink-3"><span className="text-apricot-600">peak 5.4 Hz</span> inside 4–12 Hz</p>
      </div>
    )
  }
  return (
    <div className="flex aspect-[4/3] flex-col justify-center gap-2 px-4">
      <TrendLine axis={false} />
      <p className="font-mono text-[0.8125rem] text-ink-3">baseline band · <span className="text-apricot-600">latest check flagged</span></p>
    </div>
  )
}

export function HowItWorks() {
  return (
    <Section id="how" labelledBy="how-title">
      <SectionHead
        id="how-title" n="01" name="How it works"
        title="Three steps," accent="no wearables."
        lede="A check takes less time than finding a pen. Everything that touches the camera happens on your phone; what leaves it is a list of coordinates."
      />
      <ol className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-6 lg:gap-8">
        {STEPS.map((s, i) => (
          <motion.li key={s.n} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW}
            transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }} className="flex flex-col">
            <div className="overflow-hidden rounded-xl border border-line bg-paper">
              <StepVisual n={s.n} />
            </div>
            <div className="mt-6 flex items-baseline gap-4 border-t border-line pt-4">
              <span className="font-mono text-[0.875rem] text-ink-4">{s.n}</span>
              <div>
                <h3 className="text-[1.1875rem] font-medium leading-snug">{s.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-2">{s.text}</p>
                <p className="mt-3 font-mono text-[0.8125rem] text-ink-3">{s.meta}</p>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  )
}

/* ───────────────────────── 4. the science ───────────────────────── */

const MEASURES = [
  {
    key: 'tremor', title: 'Rest and postural tremor',
    text: 'Wrist positions are resampled to an even rate and turned into a power spectrum. Voluntary movement lives below 3 Hz and is ignored; landmark jitter sets a noise floor, so only a genuine peak in the 4–12 Hz band counts.',
    spec: [['Landmarks', '15, 16 · wrists'], ['Method', 'Welch PSD, noise-corrected'], ['Output', 'peak Hz, tremor index 0–1']],
    visual: <TremorSpectrum />,
  },
  {
    key: 'gait', title: 'Gait cadence and symmetry',
    text: 'Steps are found from the forward–back separation of the ankles. Their timing gives cadence and step-time variability; comparing steps that end on the left with those that end on the right gives symmetry.',
    spec: [['Landmarks', '27, 28 · ankles; 15, 16 · arm swing'], ['Method', 'step peaks, step-time ratio'], ['Output', 'spm, variability, symmetry']],
    visual: <StepBars />,
  },
  {
    key: 'sway', title: 'Balance sway',
    text: 'While you stand still, the side-to-side wobble of the trunk is tracked with its slow drift removed. More sway than your own baseline is the signal, not a population threshold.',
    spec: [['Landmarks', '11, 12 · shoulders; 23, 24 · hips'], ['Method', 'detrended lateral trunk motion'], ['Output', 'sway, compared with baseline']],
    visual: <SwayPlot />,
  },
]

const LIMITS = [
  ['It is not a diagnosis.', 'A change in your trend is a reason to talk to your clinician, not a conclusion about a condition.'],
  ['A phone is not a gait lab.', 'Lighting, framing and loose clothing move landmarks. A signal-quality gate rejects noisy recordings instead of guessing.'],
  ['The first five checks calibrate.', 'Until your baseline exists, results are labelled calibrating rather than scored.'],
  ['Frame rate sets a ceiling.', 'At 30 frames per second the fastest frequency a camera can see is 15 Hz, so the top of the band is read with less certainty.'],
]

export function Science() {
  return (
    <Section id="science" labelledBy="science-title" className="bg-paper/60">
      <SectionHead
        id="science-title" n="02" name="The science"
        title="What a check measures," accent="and how."
        lede="Three movement signals, each computed from named landmarks with a stated method. Each result is compared with your own baseline (a median and spread from your first sessions), never with a stranger’s average."
      />
      <div className="mt-12 divide-y divide-line border-y border-line md:mt-16">
        {MEASURES.map((m) => (
          <article key={m.key} aria-labelledby={`m-${m.key}`} className="grid gap-8 py-10 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,0.9fr)]">
            <h3 id={`m-${m.key}`} className="font-serif text-[1.75rem] font-normal leading-tight">{m.title}</h3>
            <Reveal>
              <p className="max-w-[56ch] text-base leading-relaxed text-ink-2">{m.text}</p>
              <dl className="mt-6 grid gap-x-6 gap-y-2 font-mono text-[0.8125rem] sm:grid-cols-[6rem_1fr]">
                {m.spec.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-4">{k}</dt>
                    <dd className="text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.08} className="rounded-xl border border-line bg-canvas p-4 sm:p-5 md:col-start-2 lg:col-start-auto">
              {m.visual}
            </Reveal>
          </article>
        ))}
      </div>

      <Reveal className="mt-12 grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <h3 className="font-mono text-[0.875rem] font-medium text-ink">Honest limits</h3>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {LIMITS.map(([t, d]) => (
            <li key={t} className="border-l border-line pl-4">
              <p className="font-medium text-ink">{t}</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-3">{d}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  )
}

/* ───────────────────────── 5. privacy by design ───────────────────────── */

const FLOW = [
  { icon: Smartphone, title: 'Your phone', lines: ['camera frames', 'MediaPipe Pose, in the browser'], boundary: true },
  { icon: null, title: '33 landmarks / frame', lines: ['x, y, z, visibility', 'no pixels, no face image'] },
  { icon: Server, title: 'MedoShield server', lines: ['biomarkers, baseline', 'risk level and trend'] },
  { icon: Stethoscope, title: 'The doctor you chose', lines: ['the trend, not the video', 'access you can revoke'] },
]

function FlowDiagram() {
  return (
    <figure className="mt-12 md:mt-16">
      <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-0">
        {FLOW.map((f, i) => (
          <li key={f.title} className="contents">
            <motion.div
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW} transition={{ delay: i * 0.12, duration: 0.5, ease: EASE }}
              className={cn(
                'relative rounded-xl p-4 sm:p-5',
                f.boundary ? 'border border-dashed border-ink-4 bg-paper' : f.icon ? 'border border-line bg-paper' : 'border border-teal-200 bg-teal-50/70',
              )}
            >
              <div className="flex items-center gap-2.5">
                {f.icon ? <f.icon className="h-[1.125rem] w-[1.125rem] text-ink-2" strokeWidth={1.8} aria-hidden="true" />
                  : <span className="font-mono text-[0.8125rem] text-teal-800" aria-hidden="true">[x,y,z]</span>}
                <p className="text-[0.9375rem] font-medium text-ink">{f.title}</p>
              </div>
              <ul className="mt-3 space-y-1 font-mono text-[0.8125rem] text-ink-3">
                {f.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
              {f.boundary && (
                <p className="mt-4 border-t border-dashed border-line pt-3 font-mono text-[0.8125rem] text-apricot-600">raw video stops here</p>
              )}
            </motion.div>
            {i < FLOW.length - 1 && (
              <span aria-hidden="true" className="flex items-center justify-center py-1 md:px-2 md:py-0">
                <motion.span initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={VIEW} transition={{ delay: i * 0.12 + 0.2, duration: 0.4, ease: EASE }}
                  className="block h-5 w-px origin-top bg-ink-4 md:hidden" />
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={VIEW} transition={{ delay: i * 0.12 + 0.2, duration: 0.4, ease: EASE }}
                  className="hidden h-px w-6 origin-left bg-ink-4 md:block lg:w-8" />
              </span>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 font-mono text-[0.8125rem] text-ink-3">Fig. 2. What leaves the phone during a movement check.</figcaption>
    </figure>
  )
}

const STAYS = ['Camera video of your movement check', 'Individual camera frames', 'Your surroundings, room and face image']
const LEAVES = ['33 landmark coordinates per frame', 'Derived biomarkers, quality score and risk level', 'What you add yourself: medications, lab reports, messages']
const SEES = ['You, always', 'Doctors you sent a request to who accepted it', 'Nobody else; you can revoke access at any time']

function Ledger({ title, items, icon: Icon, tone }) {
  return (
    <div>
      <h4 className="font-mono text-[0.875rem] font-medium text-ink">{title}</h4>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {items.map((t) => (
          <li key={t} className="flex gap-3 py-2.5 text-[0.9375rem] text-ink-2">
            <Icon className={cn('mt-1 h-4 w-4 shrink-0', tone)} strokeWidth={1.8} aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Privacy() {
  return (
    <Section id="privacy" labelledBy="privacy-title">
      <SectionHead
        id="privacy-title" n="03" name="Privacy by design"
        title="Your video" accent="never leaves the phone."
        lede="Privacy here is an architecture decision, not a settings page. Pose estimation runs on the device, so the server only ever receives numbers that describe how joints moved."
      />
      <FlowDiagram />

      <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <h3 className="font-serif text-[1.75rem] font-normal leading-tight">What is stored, and what is not</h3>
          <div className="mt-8 grid gap-8">
            <Ledger title="Stays on your phone" items={STAYS} icon={Minus} tone="text-ink-4" />
            <Ledger title="Sent and stored, encrypted in transit" items={LEAVES} icon={Check} tone="text-teal-700" />
            <Ledger title="Who can see your results" items={SEES} icon={Check} tone="text-teal-700" />
          </div>
        </div>
        <div>
          <h3 className="font-serif text-[1.75rem] font-normal leading-tight">The assistant is guarded too</h3>
          <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-ink-2">
            Ask Medo answers health questions inside six server-side layers. Pick a message to see where it stops.
          </p>
          <GuardrailDemo className="mt-6" />
        </div>
      </div>
    </Section>
  )
}

/* ───────────────────────── around the check ───────────────────────── */

const TOOLS = [
  { icon: MessageSquare, title: 'Ask Medo', text: 'A medical assistant with prompt-injection guardrails and emergency triage that answers in plain language.' },
  { icon: BellRing, title: 'Medication reminders', text: 'Doses on a schedule, with a history of what was taken and what was missed.' },
  { icon: FileText, title: 'Lab-report explainer', text: 'Upload a report and get each value explained in plain language against its reference range.' },
  { icon: Siren, title: 'SOS', text: 'Press and hold to share your location with your emergency contact and care team.' },
]

export function Everyday() {
  return (
    <Section id="everyday" labelledBy="everyday-title" className="pt-0 sm:pt-0">
      <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <p className="kicker">Around the check</p>
        <div>
          <h2 id="everyday-title" className="h-display text-[2rem] leading-tight sm:text-display-sm">The rest of the week, in the same app.</h2>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {TOOLS.map((t, i) => (
              <motion.li key={t.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW} transition={{ delay: i * 0.05, duration: 0.5 }}
                className="bg-canvas p-6">
                <t.icon className="h-5 w-5 text-teal-700" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="mt-4 text-[1.0625rem] font-medium">{t.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-3">{t.text}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

/* ───────────────────────── 6. for clinicians ───────────────────────── */

const RISK = {
  low: ['Low', 'bg-teal-50 text-teal-800'],
  medium: ['Medium', 'bg-butter-50 text-[#6E5716]'],
  high: ['High', 'bg-rose-50 text-rose-600'],
  calibrating: ['Calibrating', 'bg-lilac-50 text-lilac-600'],
}
const PATIENTS = [
  { name: 'A. Mehta', age: 67, last: 'Today, 08:12', hz: '5.4', sym: '91%', risk: 'high', spark: [72, 73, 72, 71, 69, 68, 66, 64], tone: 'ember' },
  { name: 'R. Iyer', age: 72, last: 'Yesterday', hz: '—', sym: '96%', risk: 'low', spark: [70, 71, 70, 72, 71, 72, 73, 72] },
  { name: 'S. Kaur', age: 58, last: '2 days ago', hz: '6.1', sym: '93%', risk: 'medium', spark: [74, 73, 73, 71, 72, 70, 70, 69] },
  { name: 'D. Thomas', age: 63, last: '3 days ago', hz: '—', sym: '—', risk: 'calibrating', spark: [70, 72, 69, 71], tone: 'stone' },
]

function DoctorPreview() {
  return (
    <figure className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <p className="text-[0.9375rem] font-medium">Clinic overview</p>
        <p className="font-mono text-[0.8125rem] text-ink-4">sample data</p>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
        {[['Patients', '12'], ['Flagged this week', '2'], ['Checks to review', '5']].map(([k, v]) => (
          <div key={k} className="px-4 py-4 sm:px-5">
            <dt className="text-[0.8125rem] leading-tight text-ink-3">{k}</dt>
            <dd className="mt-1 font-serif text-[2rem] leading-none text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <table className="w-full text-left text-[0.875rem]">
        <caption className="sr-only">Sample patient list with latest movement check results</caption>
        <thead>
          <tr className="border-b border-line font-mono text-[0.8125rem] text-ink-4">
            <th scope="col" className="px-5 py-2.5 font-normal">Patient</th>
            <th scope="col" className="hidden px-3 py-2.5 font-normal sm:table-cell">Tremor</th>
            <th scope="col" className="hidden px-3 py-2.5 font-normal md:table-cell">Symmetry</th>
            <th scope="col" className="hidden px-3 py-2.5 font-normal sm:table-cell">30 days</th>
            <th scope="col" className="px-5 py-2.5 text-right font-normal">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PATIENTS.map((p) => (
            <tr key={p.name}>
              <td className="px-5 py-3">
                <p className="font-medium text-ink">{p.name} <span className="font-normal text-ink-4">· {p.age}</span></p>
                <p className="text-[0.8125rem] text-ink-3">{p.last}</p>
              </td>
              <td className={cn('hidden px-3 py-3 font-mono tabular-nums sm:table-cell', p.risk === 'high' ? 'text-apricot-600' : 'text-ink-2')}>{p.hz === '—' ? '—' : `${p.hz} Hz`}</td>
              <td className="hidden px-3 py-3 font-mono tabular-nums text-ink-2 md:table-cell">{p.sym}</td>
              <td className="hidden px-3 py-3 sm:table-cell"><Spark values={p.spark} tone={p.tone} /></td>
              <td className="px-5 py-3 text-right">
                <span className={cn('badge', RISK[p.risk][1])}>{RISK[p.risk][0]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line bg-cream/50 px-5 py-4">
        <p className="font-mono text-[0.8125rem] text-ink-3">AI summary · A. Mehta</p>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">
          Rest tremor peak at 5.4 Hz on the last three checks, up from no measurable peak at baseline. Gait symmetry down four points. Recording quality good.
        </p>
      </div>
      <figcaption className="sr-only">Illustration of the MedoShield clinician dashboard with sample data.</figcaption>
    </figure>
  )
}

const CLINICIAN_POINTS = [
  'Every patient’s movement trend between visits, measured against their own baseline',
  'Flagged checks first, each with its recording-quality score',
  'AI-assisted summaries you can read in under a minute, never a diagnosis',
  'Appointment requests and secure messaging in one place',
]

export function Clinicians() {
  return (
    <Section id="clinicians" labelledBy="clinicians-title" className="bg-paper/60">
      <SectionHead
        id="clinicians-title" n="04" name="For clinicians"
        title="The months between visits," accent="on one screen."
        lede="Patients invite you. You see objective tremor, gait and balance trends, the checks that moved, and how trustworthy each recording was."
      />
      <div className="mt-12 grid gap-10 md:mt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
        <Reveal><DoctorPreview /></Reveal>
        <Reveal delay={0.08} className="flex flex-col">
          <h3 className="font-serif text-[1.75rem] font-normal leading-tight">Built for a ten-minute appointment</h3>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {CLINICIAN_POINTS.map((t) => (
              <li key={t} className="flex gap-3 py-3.5 text-base text-ink-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden="true" />{t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/join/doctor" variant="brand" size="lg" iconRight={ArrowRight}>Join as a clinician</Button>
          </div>
          <p className="mt-4 text-[0.875rem] text-ink-3">Patients share data with you only after you accept their request.</p>
        </Reveal>
      </div>
    </Section>
  )
}

/* ───────────────────────── 7. FAQ ───────────────────────── */

export function FAQ() {
  return (
    <Section id="faq" labelledBy="faq-title">
      <SectionHead id="faq-title" n="05" name="Questions" title="Plain answers." />
      <dl className="mt-12 border-b border-line md:mt-16">
        {FAQ_ITEMS.map(([q, a], i) => (
          <motion.div key={q} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW} transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}
            className="grid gap-2 border-t border-line py-6 md:grid-cols-[11rem_minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10 lg:grid-cols-[14rem_minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <span className="hidden font-mono text-[0.8125rem] text-ink-4 md:block" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <dt className="text-[1.0625rem] font-medium leading-snug text-ink">{q}</dt>
            <dd className="max-w-[60ch] text-base leading-relaxed text-ink-2">{a}</dd>
          </motion.div>
        ))}
      </dl>
    </Section>
  )
}

/* ───────────────────────── 8. built by ───────────────────────── */

export function BuiltBy() {
  const facts = [['Role', CREATOR.role], ['Work', CREATOR.work], ['Education', CREATOR.education], ['Patent', CREATOR.patent.replace(/^Patent:\s*/, '')]]
  return (
    <section aria-labelledby="builtby-title" className="border-y border-line bg-paper py-20 sm:py-24">
      <div className="container grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal>
          <p className="kicker">The maker</p>
          <h2 id="builtby-title" className="h-display mt-4 text-[2.375rem] leading-[1.02] sm:text-display-md">
            Designed and built end to end by <span className="italic text-teal-700">{CREATOR.name}.</span>
          </h2>
          <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-ink-2">
            {CREATOR.summary} MedoShield covers the whole stack: on-device pose estimation, signal processing, a guarded LLM assistant, a clinician dashboard and the deployment behind them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/about" variant="primary" size="lg" iconRight={ArrowRight}>Read the build story</Button>
            <Button href={CREATOR.github} target="_blank" rel="noopener noreferrer me" variant="outline" size="lg" iconRight={ArrowUpRight}>View code on GitHub</Button>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <dl className="divide-y divide-line border-y border-line">
            {facts.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-6">
                <dt className="font-mono text-[0.8125rem] text-ink-4">{k}</dt>
                <dd className="text-[0.9375rem] text-ink-2">{v}</dd>
              </div>
            ))}
            <div className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-6">
              <dt className="font-mono text-[0.8125rem] text-ink-4">Stack</dt>
              <dd className="font-mono text-[0.8125rem] leading-relaxed text-ink-2">{CREATOR.skills.join(' · ')}</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────────────── 9. final CTA ───────────────────────── */

export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="py-24 sm:py-32">
      <div className="container">
        <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="kicker flex items-center gap-2"><Camera className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> Ten seconds, phone camera</p>
            <h2 id="cta-title" className="h-display mt-5 text-[2.75rem] leading-[0.98] sm:text-display-lg">
              Take today’s check. <span className="italic text-teal-700">Bring a clearer trend</span> to your next appointment.
            </h2>
          </div>
          <div>
            <div className="flex flex-wrap gap-3">
              <Button to="/register" variant="primary" size="lg" iconRight={ArrowRight}>Start a free check</Button>
              <Button to="/join/doctor" variant="outline" size="lg" icon={Stethoscope}>For clinicians</Button>
            </div>
            <p className="mt-5 max-w-[44ch] text-[0.875rem] leading-relaxed text-ink-3">
              Free for patients. A monitoring and education tool, not a diagnostic device. In an emergency call 112 / 108.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
