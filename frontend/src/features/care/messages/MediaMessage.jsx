import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, Loader2, Pause, Play } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn } from '../../../lib/utils'

/** Fetches an authenticated media URL as a blob and exposes an object URL (revoked on unmount). */
function useMediaBlob(url) {
  const [state, setState] = useState({ src: null, type: '', error: null })
  useEffect(() => {
    if (!url) return
    let alive = true
    let objectUrl = null
    api.chat
      .media(url)
      .then((res) => {
        if (!alive) return
        objectUrl = URL.createObjectURL(res.data)
        setState({ src: objectUrl, type: res.data?.type || '', error: null })
      })
      .catch((error) => alive && setState({ src: null, type: '', error }))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])
  return state
}

const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

function VoicePlayer({ src, mine }) {
  const audio = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(NaN)
  const bars = useRef(Array.from({ length: 26 }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7 + (src?.length || 0))) * 0.7)).current
  const progress = Number.isFinite(duration) && duration > 0 ? time / duration : 0

  function toggle() {
    const a = audio.current
    if (!a) return
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }

  return (
    <div className="flex w-[15rem] max-w-full items-center gap-3">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(0) }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-95', mine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-teal-700 text-white hover:brightness-110')}
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-7 items-center gap-[2px]" aria-hidden>
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn('w-[3px] rounded-full transition-colors', i / bars.length < progress ? (mine ? 'bg-white' : 'bg-teal-500') : mine ? 'bg-white/35' : 'bg-ink/15')}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <p className={cn('mt-0.5 text-[0.7rem] tabular-nums', mine ? 'text-white/70' : 'text-ink-4')}>
          {playing || time > 0 ? fmt(time) : Number.isFinite(duration) ? fmt(duration) : 'Voice note'}
        </p>
      </div>
    </div>
  )
}

export default function MediaMessage({ m, mine }) {
  const { src, type, error } = useMediaBlob(m.media_url)

  if (error) {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm', mine ? 'text-white/80' : 'text-ink-3')}>
        <AlertCircle className="h-4 w-4" /> Attachment unavailable
      </p>
    )
  }
  if (!src) {
    return (
      <p className={cn('flex items-center gap-2 text-sm', mine ? 'text-white/80' : 'text-ink-3')}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading {m.msg_type === 'voice' ? 'voice note' : 'attachment'}…
      </p>
    )
  }
  if (m.msg_type === 'voice') return <VoicePlayer src={src} mine={mine} />

  const name = m.file_name || 'attachment'
  const isImage = type.startsWith('image/')
  return (
    <div className="w-[15rem] max-w-full">
      {isImage && (
        <a href={src} target="_blank" rel="noopener noreferrer" className="mb-2 block overflow-hidden rounded-2xl">
          <img src={src} alt={name} className="max-h-56 w-full object-cover" />
        </a>
      )}
      <div className="flex items-center gap-3">
        {!isImage && (
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', mine ? 'bg-white/15' : 'bg-rose-50 text-rose-500')}>
            <FileText className="h-5 w-5" />
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>{name}</p>
        <a
          href={src}
          download={name}
          aria-label={`Download ${name}`}
          className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full transition', mine ? 'bg-white/15 hover:bg-white/25' : 'bg-cream text-ink-2 hover:bg-line')}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
