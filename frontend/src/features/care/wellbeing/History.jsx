import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Footprints, Gauge, HeartPulse, Loader2, Moon, Scale, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { errorMessage, fmtDate } from '../../../lib/utils'

function Pill({ icon: Icon, children, cls }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  )
}

export default function History({ records }) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: (id) => api.fitness.remove(id),
    onSuccess: () => {
      toast.success('Log removed')
      qc.invalidateQueries({ queryKey: ['fitness'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <ul className="divide-y divide-line/70">
      <AnimatePresence initial={false}>
        {records.map((r) => {
          const busy = del.isPending && del.variables === r.id
          return (
            <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 py-3.5 sm:items-center">
              <div className="w-14 shrink-0 text-center">
                <p className="num text-xl font-semibold leading-none text-ink">{fmtDate(r.date, 'd')}</p>
                <p className="mt-0.5 text-[0.7rem] uppercase tracking-wider text-ink-4">{fmtDate(r.date, 'MMM')}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {r.sleep_hours != null && <Pill icon={Moon} cls="bg-cream text-ink-2 ring-1 ring-inset ring-line/70">{r.sleep_hours} h</Pill>}
                  {r.stress_level != null && <Pill icon={Gauge} cls="bg-cream text-ink-2 ring-1 ring-inset ring-line/70">Stress {r.stress_level}/10</Pill>}
                  {r.walking_distance != null && <Pill icon={Footprints} cls="bg-cream text-ink-2 ring-1 ring-inset ring-line/70">{r.walking_distance} km</Pill>}
                  {r.heart_rate != null && <Pill icon={HeartPulse} cls="bg-cream text-ink-2 ring-1 ring-inset ring-line/70">{r.heart_rate} bpm</Pill>}
                  {r.weight_kg != null && <Pill icon={Scale} cls="bg-cream text-ink-2 ring-1 ring-inset ring-line/70">{r.weight_kg} kg{r.bmi ? ` · BMI ${r.bmi}` : ''}</Pill>}
                </div>
                {r.notes && <p className="mt-1.5 line-clamp-2 text-sm text-ink-3">{r.notes}</p>}
              </div>
              <button onClick={() => del.mutate(r.id)} disabled={busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-4 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Delete log for ${fmtDate(r.date)}`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
