import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Phone, Siren } from 'lucide-react'
import { toast } from 'sonner'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import { Notice } from '../../components/ui/Feedback'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'

const HOLD_MS = 1400

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy_m: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    )
  })
}

/** Press-and-hold SOS (prevents accidental triggers). Shares location with the emergency contact + care team. */
export default function SOSButton() {
  const [holding, setHolding] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const timer = useRef(null)

  async function fire() {
    setHolding(false)
    setSending(true)
    try {
      const pos = await getPosition()
      const res = await api.sos({ ...(pos || {}), message: '' })
      setResult({ ...res, located: !!pos })
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    } catch (e) {
      toast.error(errorMessage(e, 'Could not send SOS. Call emergency services directly.'))
      setResult({ failed: true })
    } finally {
      setSending(false)
    }
  }
  const start = () => {
    setHolding(true)
    timer.current = setTimeout(fire, HOLD_MS)
  }
  const cancel = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }

  return (
    <>
      <div className="fixed bottom-28 right-4 z-30 lg:bottom-6 lg:right-6">
        <motion.button
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !holding && start()}
          onKeyUp={cancel}
          whileTap={{ scale: 0.94 }}
          aria-label="Emergency SOS - press and hold"
          className="group relative grid h-14 w-14 place-items-center rounded-full bg-rose-500 text-white shadow-[0_14px_34px_-10px_rgba(219,79,64,.75)] outline-none ring-4 ring-rose-100 transition hover:bg-rose-600"
        >
          <span className="absolute inset-0 animate-pulse2 rounded-full bg-rose-400/60" />
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
            <motion.circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray={163} initial={false}
              animate={{ strokeDashoffset: holding ? 0 : 163 }} transition={{ duration: holding ? HOLD_MS / 1000 : 0.2, ease: 'linear' }} />
          </svg>
          <Siren className="relative h-6 w-6" />
          <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lift transition group-hover:opacity-100">
            {sending ? 'Sending…' : 'Hold for SOS'}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>{sending && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-rose-500/15 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="rounded-3xl bg-paper px-8 py-6 text-center shadow-lift"><Siren className="mx-auto h-8 w-8 animate-pulse text-rose-500" /><p className="mt-2 font-display text-lg font-semibold">Sending SOS…</p><p className="text-sm text-ink-3">Getting your location</p></div></motion.div>}</AnimatePresence>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)} title={result?.failed ? 'SOS not sent' : 'SOS alert sent'} description={result?.failed ? 'Please call emergency services now.' : 'Your care team has been notified.'}
        footer={<><Button variant="outline" onClick={() => setResult(null)}>Close</Button><Button variant="danger" icon={Phone} href="tel:112">Call 112</Button></>}>
        {!result?.failed && (
          <div className="space-y-3">
            <Notice tone={result?.sms_sent ? 'success' : 'warn'} title={result?.sms_sent ? `SMS sent to ${result.contact}` : 'SMS not sent'}>
              {result?.sms_sent ? 'Your emergency contact has your location.' : (result?.detail || 'Add an emergency contact in Settings so we can text them next time.')}
            </Notice>
            {result?.maps_link ? (
              <a href={result.maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm text-teal-700 hover:bg-teal-50"><MapPin className="h-4 w-4" /> View shared location</a>
            ) : (
              <Notice tone="info">Location wasn't available — allow location access for faster help.</Notice>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}
