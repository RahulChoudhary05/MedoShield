import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Ban, Info, Phone, ShieldAlert, Stethoscope, TriangleAlert, Wand2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Markdown from '../../../components/ui/Markdown'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { Section } from '../kit'

const EXAMPLES = ['Headache and mild fever since yesterday', 'Runny nose and sneezing every morning', 'Heartburn after dinner']
const EASE = [0.2, 0.8, 0.2, 1]

function OptionRow({ o, i }) {
  const nonDrug = o.class === 'Non-drug'
  const tag = nonDrug ? { t: 'Gentle first step', c: 'text-teal-700' } : o.risk_level === 'review' ? { t: 'Check first', c: 'text-apricot-600' } : { t: 'Usually suitable', c: 'text-teal-700' }
  const v = Math.max(0, Math.min(100, Number(o.suitability) || 0))
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }} className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[1.0625rem] font-semibold text-ink">{o.name} <span className="font-mono text-[0.8125rem] font-normal text-ink-3">· {o.class}</span></p>
        <span className={cn('font-mono text-[0.8125rem]', tag.c)}>{tag.t}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="kicker shrink-0">Suitability</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream" aria-hidden>
          <span className="block h-full rounded-full" style={{ width: `${v}%`, background: v >= 70 ? '#234A38' : v >= 45 ? '#B8963A' : '#AF4A39' }} />
        </span>
        <span className="num w-8 text-right text-ink">{o.suitability == null ? '—' : Math.round(v)}</span>
      </div>
      <p className="mt-2 text-[0.9375rem] text-ink-2"><span className="kicker mr-1.5">Label · {o.age_group}</span>{o.label_guidance}</p>
      {o.matched_symptoms?.length > 0 && <p className="mt-1.5 text-[0.8125rem] text-ink-3">Helps with: {o.matched_symptoms.join(', ')}</p>}
      {o.cautions?.map((c) => <p key={c} className="mt-1.5 flex gap-1.5 text-[0.8125rem] text-apricot-600"><TriangleAlert className="h-3.5 w-3.5 shrink-0 translate-y-0.5" strokeWidth={1.8} aria-hidden />{c}</p>)}
      {o.interactions?.map((c) => <p key={c} className="mt-1.5 flex gap-1.5 text-[0.8125rem] text-rose-600"><ShieldAlert className="h-3.5 w-3.5 shrink-0 translate-y-0.5" strokeWidth={1.8} aria-hidden />{c}</p>)}
      {o.notes && <p className="mt-1.5 text-[0.8125rem] text-ink-3">{o.notes}</p>}
    </motion.li>
  )
}

export default function GuidancePanel() {
  const [symptoms, setSymptoms] = useState('')
  const [age, setAge] = useState('')
  const guide = useMutation({
    mutationFn: (body) => api.meds.guidance(body),
    onError: (err) => toast.error(errorMessage(err)),
  })
  const r = guide.data

  function submit(e) {
    e.preventDefault()
    const s = symptoms.trim()
    if (s.length < 2) return toast.error('Tell us a little about how you feel first')
    const a = age === '' ? undefined : Number(age)
    if (a !== undefined && (!Number.isInteger(a) || a < 0 || a > 120)) return toast.error('Age should be between 0 and 120')
    guide.mutate({ symptoms: s.slice(0, 600), ...(a !== undefined ? { age: a } : {}) })
  }

  return (
    <Section icon={Wand2} kicker="Over-the-counter" title="Symptom guidance" description="Safe options, screened against your allergies, conditions and current medicines.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-8">
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="sym" className="label">What are you feeling?</label>
          <textarea id="sym" className="input min-h-[120px]" placeholder="Describe your symptoms in plain words…" value={symptoms} maxLength={600} onChange={(e) => setSymptoms(e.target.value)} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example symptoms">
            {EXAMPLES.map((x) => <button type="button" key={x} onClick={() => setSymptoms(x)} className="chip min-h-[44px] text-left">{x}</button>)}
          </div>
          <div className="flex items-end gap-3">
            <div className="w-28">
              <label htmlFor="age" className="label">Age <span className="font-normal text-ink-3">(optional)</span></label>
              <input id="age" type="number" inputMode="numeric" min={0} max={120} className="input" value={age} onChange={(e) => setAge(e.target.value)} placeholder="—" />
            </div>
            <Button variant="brand" type="submit" icon={Wand2} loading={guide.isPending} className="flex-1">Get guidance</Button>
          </div>
        </form>

        <div className="min-w-0" aria-live="polite" aria-busy={guide.isPending}>
          <AnimatePresence mode="wait">
            {guide.isPending ? (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
              </motion.div>
            ) : !r ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[10rem] items-center gap-3 rounded-xl border border-dashed border-line px-5 py-6">
                <Stethoscope className="h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
                <p className="text-[0.9375rem] text-ink-3">Describe how you feel and we’ll suggest gentle options, flag anything risky, and say when a doctor is the better step.</p>
              </motion.div>
            ) : (
              <motion.div key="res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {r.red_flags?.length > 0 && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
                    <p className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Please get medical advice</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.9375rem]">{r.red_flags.map((f) => <li key={f}>{f}</li>)}</ul>
                    <a href="tel:112" className="btn btn-md btn-danger mt-3"><Phone className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Call 112</a>
                  </div>
                )}
                {r.see_doctor && !r.red_flags?.length && (
                  <div className="flex items-start gap-3 rounded-xl border border-butter-100 bg-butter-50 px-4 py-3 text-[#6E5716]">
                    <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    <p className="text-[0.9375rem]"><span className="font-medium">A doctor or pharmacist is your best next step.</span> We couldn’t find a safe over-the-counter match for what you described.</p>
                  </div>
                )}
                {r.options?.length > 0 && <ul className="-my-1 divide-y divide-line">{r.options.map((o, i) => <OptionRow key={o.name} o={o} i={i} />)}</ul>}
                {r.excluded?.length > 0 && (
                  <div className="border-t border-line pt-4">
                    <p className="mb-2 flex items-center gap-1.5 font-medium text-ink"><Ban className="h-4 w-4 text-rose-500" strokeWidth={1.8} aria-hidden /> Not right for you</p>
                    <ul className="space-y-1.5">
                      {r.excluded.map((x) => (
                        <li key={x.name} className="text-[0.9375rem] text-ink-2"><span className="font-medium">{x.name}</span> <span className="text-ink-3">— {x.reasons.join('; ')}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.ai_insight && (
                  <div className="border-t border-line pt-4">
                    <p className="kicker mb-1">Medo’s take</p>
                    <Markdown>{r.ai_insight}</Markdown>
                  </div>
                )}
                {r.population_context && (
                  <div className="border-t border-line pt-4">
                    <p className="kicker mb-3">Population context · {r.matched_condition}</p>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        ['Records', r.population_context.records?.toLocaleString()],
                        ['Share', `${r.population_context.share_pct}%`],
                        ['Mean age', r.population_context.mean_age],
                        ['Abnormal tests', `${r.population_context.abnormal_pct}%`],
                      ].map(([k, v]) => (
                        <div key={k}><dt className="kicker">{k}</dt><dd className="num mt-1 text-[1.25rem] text-ink">{v ?? '—'}</dd></div>
                      ))}
                    </dl>
                  </div>
                )}
                <p className="flex gap-1.5 border-t border-line pt-4 text-[0.8125rem] text-ink-3"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden /> {r.disclaimer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}
