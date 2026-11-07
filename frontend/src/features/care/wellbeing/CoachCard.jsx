import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, Footprints, Gauge, Lock, Moon, RefreshCw, Scale, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { readLocal, writeLocal } from '../shared'
import { Section } from '../kit'

const OVERALL = {
  Improving: { cls: 'border-teal-100 bg-teal-50 text-teal-700', icon: TrendingUp },
  Stable: { cls: 'border-line bg-cream text-ink-2', icon: Minus },
  Declining: { cls: 'border-apricot-100 bg-apricot-50 text-apricot-600', icon: TrendingDown },
}
const REC = {
  good: { label: 'Going well', dot: 'bg-teal-600' },
  watch: { label: 'Keep an eye', dot: 'bg-butter-300' },
  improve: { label: 'Room to grow', dot: 'bg-apricot-500' },
}
const GOALS = [
  { k: 'sleep', label: 'Sleep', icon: Moon },
  { k: 'stress', label: 'Stress', icon: Gauge },
  { k: 'walking', label: 'Walking', icon: Footprints },
  { k: 'bmi', label: 'Weight', icon: Scale },
]
const PLAN_KEY = 'medo:coach-plan-done'

export default function CoachCard({ count }) {
  const [checked, setChecked] = useState(() => readLocal(PLAN_KEY, {}) || {})
  const coach = useMutation({ mutationFn: () => api.fitness.coach(), onError: (err) => err?.response?.status !== 422 && toast.error(errorMessage(err)) })
  const r = coach.data
  const locked = count < 3
  const lockedMsg = coach.error?.response?.status === 422 ? errorMessage(coach.error) : null

  function toggle(step) {
    const next = { ...checked, [step]: !checked[step] }
    setChecked(next)
    writeLocal(PLAN_KEY, next)
  }

  const overall = r && (OVERALL[r.overallStatus] || OVERALL.Stable)

  return (
    <Section
      icon={Sparkles}
      kicker="From your recent logs"
      title="Your AI coach"
      action={r && <Button variant="ghost" icon={RefreshCw} loading={coach.isPending} onClick={() => coach.mutate()}>Refresh coaching</Button>}
    >
      <AnimatePresence mode="wait">
        {!r ? (
          <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              {locked ? (
                <>
                  <p className="font-medium text-ink">Log {3 - count} more {3 - count === 1 ? 'day' : 'days'} to unlock coaching</p>
                  <div className="mt-2 flex gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => <span key={i} className={cn('h-1.5 w-10 rounded-full', i < count ? 'bg-teal-700' : 'bg-cream')} />)}
                  </div>
                </>
              ) : (
                <p className="max-w-lg text-[0.9375rem] text-ink-3">Medo looks at your sleep, stress, walking and heart rate together and turns them into a simple two-week plan.</p>
              )}
              {lockedMsg && <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-ink-2"><Lock className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden /> {lockedMsg}</p>}
            </div>
            <Button variant="primary" icon={locked ? Lock : Sparkles} disabled={locked} loading={coach.isPending} onClick={() => coach.mutate()}>
              {coach.isPending ? 'Reading your logs…' : 'Get my coaching'}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" aria-live="polite">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className={cn('inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border px-2 py-0.5 font-mono text-[0.8125rem]', overall.cls)}><overall.icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> {r.overallStatus}</span>
              <p className="font-serif text-[1.375rem] leading-snug text-ink text-pretty">{r.summary}</p>
            </div>

            {r.recommendations?.length > 0 && (
              <ul className="divide-y divide-line border-y border-line">
                {r.recommendations.map((rec, i) => {
                  const st = REC[rec.status] || REC.watch
                  return (
                    <li key={i} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <div>
                        <p className="font-medium text-ink">{rec.category}</p>
                        <p className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-3"><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />{st.label}</p>
                      </div>
                      <p className="text-[0.9375rem] text-ink-2">{rec.message}</p>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              {r.actionPlan?.length > 0 && (
                <div>
                  <p className="kicker mb-2">Two-week action plan</p>
                  <ul>
                    {r.actionPlan.map((step) => {
                      const on = !!checked[step]
                      return (
                        <li key={step}>
                          <button onClick={() => toggle(step)} aria-pressed={on} className="flex min-h-[44px] w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-cream/70">
                            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', on ? 'border-teal-700 bg-teal-700 text-paper' : 'border-ink-4/60 bg-paper')} aria-hidden>
                              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <span className={cn('text-[0.9375rem]', on ? 'text-ink-3 line-through' : 'text-ink-2')}>{step}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {r.weeklyGoals && (
                <div>
                  <p className="kicker mb-2">This week’s goals</p>
                  <dl className="divide-y divide-line">
                    {GOALS.filter((g) => r.weeklyGoals[g.k]).map((g) => (
                      <div key={g.k} className="flex items-start gap-3 py-2.5">
                        <g.icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-hidden />
                        <div className="min-w-0">
                          <dt className="font-medium text-ink">{g.label}</dt>
                          <dd className="text-[0.9375rem] text-ink-3">{r.weeklyGoals[g.k]}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
            <p className="text-[0.8125rem] text-ink-3">Coaching is general wellness advice, not a medical assessment.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  )
}
