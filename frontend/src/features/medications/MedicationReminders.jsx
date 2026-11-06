import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill } from 'lucide-react'
import { api } from '../../lib/api'

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.18)
      o.stop(ctx.currentTime + i * 0.18 + 0.55)
    })
  } catch { /* audio blocked until user interacts - fine */ }
}

const hhmm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const minutes = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))

/** Background reminder engine: fires a toast (and OS notification if allowed) when a dose is due. */
export default function MedicationReminders() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['meds', 'plan', 'self'], queryFn: () => api.meds.plan(), refetchInterval: 5 * 60_000 })
  const latest = useRef(data)
  latest.current = data

  useEffect(() => {
    const check = () => {
      const plan = latest.current
      if (!plan?.schedule) return
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
      for (const [slot, names] of Object.entries(plan.schedule)) {
        const diff = nowMin - minutes(slot)
        if (diff < 0 || diff > 10) continue
        for (const name of names) {
          const done = (plan.today || []).some((l) => l.medication_name === name && l.time_slot === slot)
          const key = `medo-remind:${dayKey}:${slot}:${name}`
          let seen = null
          try { seen = sessionStorage.getItem(key) } catch { /* ignore */ }
          if (done || seen) continue
          try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
          chime()
          if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification('Time for your medicine', { body: `${name} · ${slot}`, icon: '/favicon.svg', tag: key }) } catch { /* ignore */ }
          }
          const log = async (status) => {
            try {
              await api.meds.log({ medication_name: name, time_slot: slot, status })
              qc.invalidateQueries({ queryKey: ['meds'] })
              toast.success(status === 'taken' ? `${name} logged — nice work!` : `${name} skipped`)
            } catch {
              toast.error('Could not log this dose')
            }
          }
          toast(`${name} is due`, {
            id: key,
            description: `Scheduled for ${slot}`,
            icon: <Pill className="h-4 w-4 text-teal-600" />,
            duration: 60_000,
            action: { label: 'Taken', onClick: () => log('taken') },
            cancel: { label: 'Skip', onClick: () => log('skipped') },
          })
        }
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [qc])

  return null
}

export { hhmm }
