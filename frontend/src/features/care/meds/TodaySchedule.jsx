import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, CircleSlash, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'

const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
const nowMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function partOfDay(slot) {
  const h = Number(slot.slice(0, 2))
  if (h < 11) return { icon: Sunrise, label: 'Morning', tone: 'icon-teal' }
  if (h < 16) return { icon: Sun, label: 'Afternoon', tone: 'icon-teal' }
  if (h < 20) return { icon: Sunset, label: 'Evening', tone: 'icon-teal' }
  return { icon: Moon, label: 'Night', tone: 'icon-teal' }
}

function fmt12(slot) {
  const h = Number(slot.slice(0, 2))
  const m = slot.slice(3, 5)
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

/** Build [{slot, items:[{name, status, state}]}] from plan.schedule + plan.today. */
export function buildDoses(plan, minute = nowMin()) {
  const today = plan?.today || []
  return Object.entries(plan?.schedule || {}).map(([slot, names]) => ({
    slot,
    items: names.map((name) => {
      const logs = today.filter((l) => l.medication_name?.toLowerCase() === name?.toLowerCase() && l.time_slot === slot)
      const status = logs.length ? logs.sort((a, b) => String(b.taken_at).localeCompare(String(a.taken_at)))[0].status : null
      const diff = minute - toMin(slot)
      const state = status || (diff >= -30 && diff <= 60 ? 'due' : diff > 60 ? 'late' : 'upcoming')
      return { name, status, state }
    }),
  }))
}

const STATE = {
  taken: { label: 'Taken', cls: 'bg-teal-50 text-teal-700' },
  skipped: { label: 'Skipped', cls: 'bg-ink/[.06] text-ink-3' },
  due: { label: 'Due now', cls: 'bg-apricot-50 text-apricot-600' },
  late: { label: 'Not logged', cls: 'bg-apricot-50 text-apricot-600' },
  upcoming: { label: 'Later', cls: 'bg-cream text-ink-4' },
}

export default function TodaySchedule({ plan }) {
  const qc = useQueryClient()
  const [minute, setMinute] = useState(nowMin)
  useEffect(() => {
    const t = setInterval(() => setMinute(nowMin()), 60_000)
    return () => clearInterval(t)
  }, [])

  const log = useMutation({
    mutationFn: (body) => api.meds.log(body),
    onSuccess: (_, v) => {
      toast.success(v.status === 'taken' ? `${v.medication_name} logged — well done` : `${v.medication_name} marked as skipped`)
      qc.invalidateQueries({ queryKey: ['meds'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const doses = buildDoses(plan, minute)
  const pendingKey = log.isPending ? `${log.variables?.medication_name}@${log.variables?.time_slot}` : null

  return (
    <ol className="relative space-y-5">
      <span aria-hidden className="absolute bottom-3 left-[1.375rem] top-3 w-px bg-line" />
      {doses.map(({ slot, items }, gi) => {
        const pod = partOfDay(slot)
        const allDone = items.every((i) => i.status)
        return (
          <motion.li key={slot} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }} className="relative flex gap-4">
            <span className={cn('icon-tile relative z-10 h-11 w-11 shrink-0 ring-4 ring-paper', allDone ? 'icon-teal shadow-glow' : pod.tone)}>
              {allDone ? <Check className="h-5 w-5" strokeWidth={2.6} /> : <pod.icon className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 pt-1">
                <span className="num text-lg font-semibold text-ink">{fmt12(slot)}</span>
                <span className="text-xs text-ink-4">{pod.label}</span>
              </p>
              <ul className="mt-2 space-y-2">
                {items.map((it) => {
                  const st = STATE[it.state]
                  const busy = pendingKey === `${it.name}@${slot}`
                  return (
                    <li key={it.name} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-3.5 py-2.5 transition', it.state === 'due' ? 'border-apricot-200 bg-apricot-50/40' : 'border-line/70 bg-cream/60')}>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate font-medium', it.status === 'skipped' ? 'text-ink-3 line-through decoration-ink-4' : 'text-ink')}>{it.name}</p>
                        <span className={cn('badge mt-0.5', st.cls)}>{st.label}</span>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => log.mutate({ medication_name: it.name, time_slot: slot, status: 'taken' })}
                          disabled={busy || it.status === 'taken'}
                          className={cn('btn btn-sm', it.status === 'taken' ? 'btn-brand' : 'btn-soft')}
                          aria-label={`Mark ${it.name} at ${slot} as taken`}
                        >
                          <Check className="h-4 w-4" /> {it.status === 'taken' ? 'Taken' : 'Take'}
                        </button>
                        <button
                          onClick={() => log.mutate({ medication_name: it.name, time_slot: slot, status: 'skipped' })}
                          disabled={busy || it.status === 'skipped'}
                          className="btn btn-sm btn-ghost"
                          aria-label={`Skip ${it.name} at ${slot}`}
                        >
                          <CircleSlash className="h-4 w-4" /> <span className="hidden sm:inline">Skip</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
