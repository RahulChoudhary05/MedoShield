import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { errorMessage, fmtDate } from '../../../lib/utils'

function Val({ label, value, unit }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-mono text-[0.8125rem] text-ink-3">{label}</span>
      <span className="num text-ink">{value}</span>
      {unit && <span className="font-mono text-[0.8125rem] text-ink-3">{unit}</span>}
    </span>
  )
}

export default function History({ records }) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: (id) => api.fitness.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fitness'] }),
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ['fitness'] })
      toast.error(errorMessage(err, 'That log couldn’t be deleted. It’s back in the list.'))
    },
  })
  // Destructive-action protection without a modal: hide the row at once and give 5 seconds to undo
  // before anything is deleted on the server.
  const [hidden, setHidden] = useState(() => new Set())
  const timers = useRef({})
  useEffect(() => {
    const pending = timers.current
    // Leaving the page finishes any pending deletes directly (the undo window has been given).
    return () => Object.entries(pending).forEach(([id, t]) => { clearTimeout(t.timer); api.fitness.remove(id).catch(() => {}) })
  }, [])
  function removeWithUndo(r) {
    setHidden((h) => new Set(h).add(r.id))
    const commit = () => { delete timers.current[r.id]; del.mutate(r.id) }
    const timer = setTimeout(commit, 5000)
    timers.current[r.id] = { timer, commit }
    toast(`Log for ${fmtDate(r.date)} deleted`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer)
          delete timers.current[r.id]
          setHidden((h) => { const n = new Set(h); n.delete(r.id); return n })
        },
      },
    })
  }
  const visible = records.filter((r) => !hidden.has(r.id))

  return (
    <ul className="-my-1 divide-y divide-line">
      <AnimatePresence initial={false}>
        {visible.map((r) => {
          const busy = del.isPending && del.variables === r.id
          return (
            <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-4 py-3.5">
              <div className="w-12 shrink-0">
                <p className="num text-[1.25rem] leading-none text-ink">{fmtDate(r.date, 'd')}</p>
                <p className="mt-1 font-mono text-[0.8125rem] text-ink-3">{fmtDate(r.date, 'MMM')}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {r.sleep_hours != null && <Val label="Sleep" value={r.sleep_hours} unit="h" />}
                  {r.stress_level != null && <Val label="Stress" value={r.stress_level} unit="/10" />}
                  {r.walking_distance != null && <Val label="Walk" value={r.walking_distance} unit="km" />}
                  {r.heart_rate != null && <Val label="HR" value={r.heart_rate} unit="bpm" />}
                  {r.weight_kg != null && <Val label="Weight" value={r.weight_kg} unit={`kg${r.bmi ? ` · BMI ${r.bmi}` : ''}`} />}
                </div>
                {r.notes && <p className="mt-1.5 line-clamp-2 text-[0.9375rem] text-ink-3">{r.notes}</p>}
              </div>
              <button onClick={() => removeWithUndo(r)} disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Delete log for ${fmtDate(r.date)}`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
