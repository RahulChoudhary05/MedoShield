import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 120

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch {
      /* ignore */
    }
  }
  return ''
}

/**
 * Voice-note recorder built on MediaRecorder.
 * state: 'idle' | 'recording'. stop() resolves to a File (or null when cancelled / empty).
 * onAutoStop(file) fires when the 2-minute limit stops the recording.
 */
export default function useRecorder(onAutoStop) {
  const autoRef = useRef(onAutoStop)
  autoRef.current = onAutoStop
  const [state, setState] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const rec = useRef(null)
  const stream = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)
  const resolver = useRef(null)
  const cancelled = useRef(false)

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const cleanup = useCallback(() => {
    clearInterval(timer.current)
    timer.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    rec.current = null
    setState('idle')
    setSeconds(0)
  }, [])

  useEffect(() => () => {
    cancelled.current = true
    try {
      rec.current?.state === 'recording' && rec.current.stop()
    } catch {
      /* ignore */
    }
    clearInterval(timer.current)
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const finish = useCallback(() => {
    const r = rec.current
    if (!r || r.state === 'inactive') return
    try {
      r.stop()
    } catch {
      cleanup()
    }
  }, [cleanup])

  const start = useCallback(async () => {
    if (!supported) throw new Error('Voice notes aren’t supported in this browser.')
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    stream.current = s
    chunks.current = []
    cancelled.current = false
    const mime = pickMime()
    const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s)
    rec.current = r
    r.ondataavailable = (e) => e.data?.size && chunks.current.push(e.data)
    r.onstop = () => {
      const type = (r.mimeType || mime || 'audio/webm').split(';')[0]
      const blob = new Blob(chunks.current, { type })
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
      const file = !cancelled.current && blob.size > 800 ? new File([blob], `voice-note-${Date.now()}.${ext}`, { type }) : null
      cleanup()
      if (resolver.current) resolver.current(file)
      else if (file) autoRef.current?.(file) // hit the time limit
      resolver.current = null
    }
    r.start(250)
    setSeconds(0)
    setState('recording')
    const startedAt = Date.now()
    timer.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(sec)
      if (sec >= MAX_SECONDS) finish()
    }, 250)
  }, [supported, cleanup, finish])

  /** Stop and get the recording. */
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        if (!rec.current || rec.current.state === 'inactive') return resolve(null)
        resolver.current = resolve
        finish()
      }),
    [finish],
  )

  /** Stop and throw the recording away. */
  const cancel = useCallback(() => {
    cancelled.current = true
    if (rec.current && rec.current.state !== 'inactive') finish()
    else cleanup()
  }, [finish, cleanup])

  return { state, seconds, supported, start, stop, cancel, max: MAX_SECONDS }
}
