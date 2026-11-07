import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowUp, Loader2, Mic, Paperclip, Square, Trash2 } from 'lucide-react'
import { cn, errorMessage } from '../../../lib/utils'
import useRecorder from './useRecorder'

const MAX_FILE = 10 * 1024 * 1024
const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Text box + voice note recorder + file attach. */
export default function MessageComposer({ onSendText, onSendMedia, uploading, reserveRight }) {
  const [text, setText] = useState('')
  const ta = useRef(null)
  const fileRef = useRef(null)
  const recorder = useRecorder((file) => {
    toast('Voice notes are limited to 2 minutes — sending now')
    onSendMedia(file, 'voice')
  })

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  function send() {
    const t = text.trim()
    if (!t) return
    onSendText(t.slice(0, 2000))
    setText('')
    ta.current?.focus()
  }

  async function startRec() {
    try {
      await recorder.start()
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
      toast.error(denied ? 'Microphone access was blocked. Allow it in your browser to record voice notes.' : errorMessage(err, err?.message || 'Couldn’t start recording.'))
    }
  }

  async function finishRec() {
    const file = await recorder.stop()
    if (file) onSendMedia(file, 'voice')
    else toast('That recording was too short')
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!FILE_TYPES.includes(f.type)) return toast.error('You can share PDF, PNG, JPG or WebP files')
    if (f.size > MAX_FILE) return toast.error('Files must be 10 MB or smaller')
    onSendMedia(f, 'file')
  }

  const recording = recorder.state === 'recording'
  return (
    <div className={cn(reserveRight && 'pr-16 lg:pr-[4.5rem]')}>
      <div className="relative flex min-h-[3.5rem] items-end gap-1.5 rounded-xl border border-line bg-paper p-1.5 transition duration-150 focus-within:border-teal-500 focus-within:ring-[3px] focus-within:ring-teal-100">
        <AnimatePresence mode="wait" initial={false}>
          {recording ? (
            <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 items-center gap-2 py-0.5">
              <button onClick={recorder.cancel} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-rose-50 hover:text-rose-500" aria-label="Discard recording">
                <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="relative h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
              </span>
              <span className="num w-12 shrink-0 text-ink" aria-live="off">{fmt(recorder.seconds)}</span>
              <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
                {Array.from({ length: 32 }).map((_, i) => (
                  <span key={i} className="h-full w-[3px] shrink-0 origin-center animate-wave rounded-full bg-teal-700/60" style={{ animationDelay: `${(i % 8) * -0.14}s`, animationDuration: `${0.8 + (i % 5) * 0.12}s` }} />
                ))}
              </div>
              <span className="sr-only" role="status">Recording voice note</span>
              <button onClick={finishRec} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-500 text-paper transition hover:bg-rose-600" aria-label="Stop and send voice note">
                <Square className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.8} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 items-end gap-1.5">
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={pickFile} tabIndex={-1} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-ink/5 hover:text-ink disabled:opacity-50" aria-label="Attach a file (PDF or image, up to 10 MB)">
                {uploading ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.8} /> : <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </button>
              <label htmlFor="msg-input" className="sr-only">Write a message</label>
              <textarea
                id="msg-input"
                ref={ta}
                rows={1}
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Write a message…"
                className="max-h-[140px] min-h-[2.75rem] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-4"
              />
              {text.trim() ? (
                <motion.button key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.97 }} onClick={send} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink text-paper transition hover:bg-teal-800" aria-label="Send message">
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startRec}
                  disabled={!recorder.supported || uploading}
                  title={recorder.supported ? 'Record a voice note' : 'Voice notes aren’t supported in this browser'}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-700 text-paper transition hover:bg-teal-800 disabled:opacity-40"
                  aria-label="Record a voice note"
                >
                  <Mic className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
