import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, CircleSlash } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'

const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
const nowMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function partOfDay(slot) {
  const h = Number(slot.slice(0, 2))
  if (h < 11) return 'Morning'
  if (h < 16) return 'Afternoon'
  if (h < 20) return 'Evening'
  return 'Night'
}

function fmt12(slot) {
  const h = Number(slot.slice(0, 2))
  const m = slot.slice(3, 5)
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`
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
  taken: { label: 'Taken', cls: 'text-teal-700', dot: 'bg-teal-600' },
  skipped: { label: 'Skipped', cls: 'text-ink-3', dot: 'bg-ink-4' },
  due: { label: 'Due now', cls: 'text-apricot-600', dot: 'bg-apricot-500' },
  late: { label: 'Not logged', cls: 'text-apricot-600', dot: 'bg-apricot-300' },
  upcoming: { label: 'Later', cls: 'text-ink-3', dot: 'bg-line' },
}

export default function TodaySchedule({ plan }) {
  const qc = useQueryClient()
  const [minute, setMinute] = useState(nowMin)
  useEffect(() => {
    const t = setInterval(() => setMinute(nowMin()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Optimistic: the dose flips to Taken/Skipped instantly; on failure every cached plan is rolled back.
  const log = useMutation({
    mutationFn: (body) => api.meds.log(body),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['meds'] })
      const snapshot = qc.getQueriesData({ queryKey: ['meds'] })
      const entry = { medication_name: v.medication_name, time_slot: v.time_slot, status: v.status, taken_at: new Date().toISOString(), optimistic: true }
      qc.setQueriesData({ queryKey: ['meds'] }, (old) => (old && Array.isArray(old.today) ? { ...old, today: [...old.today, entry] } : old))
      return { snapshot }
    },
    onSuccess: (_, v) => {
      toast.success(v.status === 'taken' ? `${v.medication_name} logged — well done` : `${v.medication_name} marked as skipped`)
    },
    onError: (err, _v, ctx) => {
      ctx?.snapshot?.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(errorMessage(err, 'That dose wasn’t saved. Please try again.'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meds'] }),
  })

  const doses = buildDoses(plan, minute)
  const pendingKey = log.isPending ? `${log.variables?.medication_name}@${log.variables?.time_slot}` : null

  return (
    <ol className="-my-1 divide-y divide-line">
      {doses.map(({ slot, items }, gi) => {
        const allDone = items.every((i) => i.status)
        return (
          <motion.li key={slot} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04, duration: 0.35 }} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <div className="flex items-baseline gap-2 sm:block">
              <p className={cn('num text-[1.25rem] leading-none', allDone ? 'text-ink-3' : 'text-ink')}>{fmt12(slot)}</p>
              <p className="kicker sm:mt-1.5">{partOfDay(slot)}</p>
            </div>
            <ul className="space-y-2">
              {items.map((it) => {
                const st = STATE[it.state]
                const busy = pendingKey === `${it.name}@${slot}`
                return (
                  <li key={it.name} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2', it.state === 'due' ? 'bg-apricot-50' : 'bg-cream/50')}>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-medium', it.status === 'skipped' ? 'text-ink-3 line-through decoration-ink-4' : 'text-ink')}>{it.name}</p>
                      <p className={cn('flex items-center gap-1.5 font-mono text-[0.8125rem]', st.cls)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />{st.label}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => log.mutate({ medication_name: it.name, time_slot: slot, status: 'taken' })}
                        disabled={busy || it.status === 'taken'}
                        className={cn('btn h-11 px-3.5 text-[0.9375rem]', it.status === 'taken' ? 'btn-brand' : 'btn-outline')}
                        aria-label={`Mark ${it.name} at ${slot} as taken`}
                      >
                        <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden /> {it.status === 'taken' ? 'Taken' : 'Take'}
                      </button>
                      <button
                        onClick={() => log.mutate({ medication_name: it.name, time_slot: slot, status: 'skipped' })}
                        disabled={busy || it.status === 'skipped'}
                        className="btn btn-ghost h-11 px-3 text-[0.9375rem]"
                        aria-label={`Skip ${it.name} at ${slot}`}
                      >
                        <CircleSlash className="h-4 w-4" strokeWidth={1.8} aria-hidden /> <span className="hidden sm:inline">Skip</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </motion.li>
        )
      })}
    </ol>
  )
}
