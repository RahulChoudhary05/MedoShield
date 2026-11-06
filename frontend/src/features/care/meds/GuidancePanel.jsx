import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Ban, BarChart3, Info, Leaf, Phone, ShieldAlert, Sparkles, Stethoscope, TriangleAlert, Wand2 } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Notice } from '../../../components/ui/Feedback'
import { ScoreBar } from '../../../components/ui/Data'
import Markdown from '../../../components/ui/Markdown'
import { api } from '../../../lib/api'
import { errorMessage } from '../../../lib/utils'

const EXAMPLES = ['Headache and mild fever since yesterday', 'Runny nose and sneezing every morning', 'Heartburn after dinner']

function OptionCard({ o, i }) {
  const nonDrug = o.class === 'Non-drug'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="tile card-glow flex flex-col p-4 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[1.05rem] font-semibold leading-tight text-ink">{o.name}</p>
          <p className="mt-0.5 text-xs text-ink-3">{o.class}</p>
        </div>
        {nonDrug ? <Badge tone="teal"><Leaf className="h-3 w-3" /> Gentle first step</Badge> : o.risk_level === 'review' ? <Badge tone="apricot">Check first</Badge> : <Badge tone="teal">Usually suitable</Badge>}
      </div>
      <div className="mt-3">
        <ScoreBar label="Suitability for you" value={o.suitability} />
      </div>
      <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm text-ink-2 ring-1 ring-inset ring-line/70">
        <span className="text-xs font-medium uppercase tracking-[.12em] text-ink-4">Label guidance · {o.age_group}</span>
        <p className="mt-0.5">{o.label_guidance}</p>
      </div>
      {o.matched_symptoms?.length > 0 && <p className="mt-2 text-xs text-ink-3">Helps with: {o.matched_symptoms.join(', ')}</p>}
      {o.cautions?.map((c) => <p key={c} className="mt-2 flex gap-1.5 text-xs text-apricot-600"><TriangleAlert className="h-3.5 w-3.5 shrink-0" />{c}</p>)}
      {o.interactions?.map((c) => <p key={c} className="mt-2 flex gap-1.5 text-xs text-rose-600"><ShieldAlert className="h-3.5 w-3.5 shrink-0" />{c}</p>)}
      {o.notes && <p className="mt-2 text-xs text-ink-3">{o.notes}</p>}
    </motion.div>
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
    <Card className="overflow-hidden">
      <CardHeader icon={Wand2} tone="teal" title="Symptom guidance" subtitle="Safe over-the-counter options, screened against your profile" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="sym" className="label">What are you feeling?</label>
          <textarea id="sym" className="input min-h-[120px]" placeholder="Describe your symptoms in plain words…" value={symptoms} maxLength={600} onChange={(e) => setSymptoms(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((x) => <button type="button" key={x} onClick={() => setSymptoms(x)} className="chip text-xs">{x}</button>)}
          </div>
          <div className="flex items-end gap-3">
            <div className="w-28">
              <label htmlFor="age" className="label">Age <span className="font-normal text-ink-4">(optional)</span></label>
              <input id="age" type="number" inputMode="numeric" min={0} max={120} className="input" value={age} onChange={(e) => setAge(e.target.value)} placeholder="—" />
            </div>
            <Button variant="brand" type="submit" icon={Sparkles} loading={guide.isPending} className="flex-1">Get guidance</Button>
          </div>
          <p className="flex gap-1.5 text-xs text-ink-4"><Info className="mt-px h-3.5 w-3.5 shrink-0" /> We check your allergies, conditions and current medicines automatically.</p>
        </form>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {guide.isPending ? (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-44" />)}
              </motion.div>
            ) : !r ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-full min-h-[14rem] place-items-center rounded-3xl border border-dashed border-line bg-cream/50 p-6 text-center">
                <div>
                  <Stethoscope className="mx-auto h-7 w-7 text-teal-400" />
                  <p className="mt-3 font-display font-semibold">Guidance appears here</p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">We’ll suggest gentle options, flag anything risky for you, and tell you when it’s better to see a doctor.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {r.red_flags?.length > 0 && (
                  <Notice tone="danger" icon={ShieldAlert} title="Please get medical advice" action={<a href="tel:112" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"><Phone className="h-3.5 w-3.5" /> 112</a>}>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">{r.red_flags.map((f) => <li key={f}>{f}</li>)}</ul>
                  </Notice>
                )}
                {r.see_doctor && !r.red_flags?.length && (
                  <Notice tone="warn" icon={Stethoscope} title="A doctor or pharmacist is your best next step">
                    We couldn’t find a safe over-the-counter match for what you described.
                  </Notice>
                )}
                {r.options?.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">{r.options.map((o, i) => <OptionCard key={o.name} o={o} i={i} />)}</div>
                )}
                {r.excluded?.length > 0 && (
                  <div className="rounded-2xl border border-line/70 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink"><Ban className="h-4 w-4 text-rose-400" /> Not right for you</p>
                    <ul className="space-y-1.5">
                      {r.excluded.map((x) => (
                        <li key={x.name} className="text-sm text-ink-2"><span className="font-medium">{x.name}</span> <span className="text-ink-3">— {x.reasons.join('; ')}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.ai_insight && (
                  <div className="card-tint-teal rounded-2xl p-4 ring-1 ring-inset ring-teal-100">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.14em] text-teal-600"><Sparkles className="h-3.5 w-3.5" /> Medo’s take</p>
                    <Markdown>{r.ai_insight}</Markdown>
                  </div>
                )}
                {r.population_context && (
                  <div className="rounded-2xl bg-teal-50/60 p-4 ring-1 ring-inset ring-teal-100">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.14em] text-teal-500"><BarChart3 className="h-3.5 w-3.5" /> Population context · {r.matched_condition}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Records', r.population_context.records?.toLocaleString()],
                        ['Share', `${r.population_context.share_pct}%`],
                        ['Mean age', r.population_context.mean_age],
                        ['Abnormal tests', `${r.population_context.abnormal_pct}%`],
                      ].map(([k, v]) => (
                        <div key={k}><p className="num text-xl font-semibold text-ink">{v ?? '—'}</p><p className="text-xs text-ink-3">{k}</p></div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="flex gap-1.5 text-xs text-ink-4"><Info className="mt-px h-3.5 w-3.5 shrink-0" /> {r.disclaimer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}
