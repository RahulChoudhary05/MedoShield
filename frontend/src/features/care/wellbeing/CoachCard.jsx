import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, Footprints, Gauge, Lock, Moon, RefreshCw, Scale, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Notice } from '../../../components/ui/Feedback'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { readLocal, writeLocal } from '../shared'

const OVERALL = {
  Improving: { tone: 'teal', icon: TrendingUp },
  Stable: { tone: 'teal', icon: Minus },
  Declining: { tone: 'apricot', icon: TrendingDown },
}
const REC = {
  good: { label: 'Going well', dot: 'bg-teal-400', ring: 'ring-teal-100 bg-teal-50/50' },
  watch: { label: 'Keep an eye', dot: 'bg-apricot-300', ring: 'ring-apricot-100 bg-apricot-50/60' },
  improve: { label: 'Room to grow', dot: 'bg-apricot-400', ring: 'ring-apricot-100 bg-apricot-50/50' },
}
const GOALS = [
  { k: 'sleep', label: 'Sleep', icon: Moon, tone: 'icon-teal' },
  { k: 'stress', label: 'Stress', icon: Gauge, tone: 'icon-teal' },
  { k: 'walking', label: 'Walking', icon: Footprints, tone: 'icon-teal' },
  { k: 'bmi', label: 'Weight', icon: Scale, tone: 'icon-teal' },
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
    <Card className="card-tint-teal relative overflow-hidden">
      <CardHeader
        icon={Sparkles}
        tone="teal"
        title="Your AI coach"
        subtitle="Personal, practical suggestions from your recent logs"
        action={r && <Button variant="ghost" size="sm" icon={RefreshCw} loading={coach.isPending} onClick={() => coach.mutate()}>Refresh</Button>}
      />

      <AnimatePresence mode="wait">
        {!r ? (
          <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              {locked ? (
                <>
                  <p className="font-medium text-ink">Log {3 - count} more {3 - count === 1 ? 'day' : 'days'} to unlock coaching</p>
                  <div className="mt-2 flex gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => <span key={i} className={cn('h-2 w-10 rounded-full', i < count ? 'bg-apricot-400' : 'bg-line')} />)}
                  </div>
                </>
              ) : (
                <p className="max-w-lg text-sm text-ink-3">Medo looks at your sleep, stress, walking and heart rate together and turns them into a simple two-week plan.</p>
              )}
              {lockedMsg && <Notice tone="teal" icon={Lock} className="mt-3">{lockedMsg}</Notice>}
            </div>
            <Button variant="primary" icon={locked ? Lock : Sparkles} disabled={locked} loading={coach.isPending} onClick={() => coach.mutate()}>
              {coach.isPending ? 'Reading your logs…' : 'Get my coaching'}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Badge tone={overall.tone} className="self-start px-3 py-1 text-sm"><overall.icon className="h-3.5 w-3.5" /> {r.overallStatus}</Badge>
              <p className="font-display text-lg leading-snug text-ink text-pretty sm:text-xl">{r.summary}</p>
            </div>

            {r.recommendations?.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {r.recommendations.map((rec, i) => {
                  const s = REC[rec.status] || REC.watch
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn('rounded-2xl p-4 ring-1 ring-inset', s.ring)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{rec.category}</p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-3"><span className={cn('h-2 w-2 rounded-full', s.dot)} />{s.label}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-2">{rec.message}</p>
                    </motion.div>
                  )
                })}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              {r.actionPlan?.length > 0 && (
                <div>
                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[.16em] text-ink-4">Two-week action plan</p>
                  <ul className="space-y-2">
                    {r.actionPlan.map((step) => {
                      const on = !!checked[step]
                      return (
                        <li key={step}>
                          <button onClick={() => toggle(step)} aria-pressed={on} className="flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-cream">
                            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', on ? 'border-transparent bg-teal-700 text-white' : 'border-line bg-paper')}>
                              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <span className={cn('text-sm', on ? 'text-ink-4 line-through' : 'text-ink-2')}>{step}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {r.weeklyGoals && (
                <div>
                  <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[.16em] text-ink-4">This week’s goals</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GOALS.filter((g) => r.weeklyGoals[g.k]).map((g) => (
                      <div key={g.k} className="tile bg-paper/80 p-3">
                        <span className={cn('icon-tile h-8 w-8 rounded-xl', g.tone)}><g.icon className="h-4 w-4" /></span>
                        <p className="mt-2 text-xs font-semibold text-ink">{g.label}</p>
                        <p className="mt-0.5 text-xs text-ink-3">{r.weeklyGoals[g.k]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-ink-4">Coaching is general wellness advice, not a medical assessment.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
