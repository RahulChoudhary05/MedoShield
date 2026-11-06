import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

/** Browser notification permission: 'granted' | 'denied' | 'default' | 'unsupported'. */
export default function useNotify() {
  const [perm, setPerm] = useState(() => (supported() ? Notification.permission : 'unsupported'))

  useEffect(() => {
    if (!supported()) return
    const sync = () => setPerm(Notification.permission)
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  const request = useCallback(async () => {
    if (!supported()) {
      toast.error('This browser doesn’t support notifications')
      return 'unsupported'
    }
    try {
      const p = await Notification.requestPermission()
      setPerm(p)
      if (p === 'granted') toast.success('Reminders are on', { description: 'We’ll nudge you when a dose is due while MedoShield is open.' })
      else if (p === 'denied') toast('Notifications are blocked', { description: 'You can allow them from your browser’s site settings.' })
      return p
    } catch {
      return Notification.permission
    }
  }, [])

  return { perm, request }
}
