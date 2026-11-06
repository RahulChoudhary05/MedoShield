import { Fragment, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Check, Clock, Lock, MessageCircleHeart, UserRound } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, errorMessage, fmtDate, fmtDay, toDate } from '../../../lib/utils'
import { Avatar } from '../../../components/ui/Data'
import { ErrorState, Spinner } from '../../../components/ui/Feedback'
import MediaMessage from './MediaMessage'
import MessageComposer from './MessageComposer'

const dayKey = (v) => {
  const d = toDate(v)
  return d && !isNaN(d) ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : ''
}

export default function ThreadView({ otherId, thread, role, base }) {
  const qc = useQueryClient()
  const key = ['chat', 'messages', otherId]
  const scrollRef = useRef(null)
  const nearBottom = useRef(true)

  const q = useQuery({
    queryKey: key,
    queryFn: () => api.chat.messages(otherId),
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    retry: (n, err) => err?.response?.status !== 403 && err?.response?.status !== 404 && n < 2,
  })
  const messages = q.data?.messages || []

  // Opening the thread marks messages read server-side; refresh unread counts.
  useEffect(() => {
    if (q.isSuccess && thread?.unread) qc.invalidateQueries({ queryKey: ['chat', 'threads'] })
  }, [q.dataUpdatedAt, q.isSuccess, thread?.unread, qc])

  // Auto-scroll on new messages if the reader is already near the bottom.
  const lastId = messages[messages.length - 1]?.id
  useEffect(() => {
    const el = scrollRef.current
    if (el && nearBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' })
  }, [lastId, messages.length])
  useEffect(() => {
    nearBottom.current = true
  }, [otherId])

  const append = (m) => qc.setQueryData(key, (old) => ({ messages: [...(old?.messages || []), m] }))
  const replace = (tmp, m) => qc.setQueryData(key, (old) => ({ messages: (old?.messages || []).map((x) => (x.id === tmp ? m : x)) }))
  const drop = (tmp) => qc.setQueryData(key, (old) => ({ messages: (old?.messages || []).filter((x) => x.id !== tmp) }))

  const sendText = useMutation({
    mutationFn: ({ content }) => api.chat.send(otherId, content),
    onMutate: async ({ content, tmp }) => {
      nearBottom.current = true
      await qc.cancelQueries({ queryKey: key })
      append({ id: tmp, sender_role: role, content, msg_type: 'text', created_at: new Date().toISOString(), pending: true })
    },
    onSuccess: (m, { tmp }) => {
      replace(tmp, m)
      qc.invalidateQueries({ queryKey: ['chat', 'threads'] })
    },
    onError: (err, { tmp }) => {
      drop(tmp)
      toast.error(errorMessage(err, 'Message not sent.'))
    },
  })

  const sendMedia = useMutation({
    mutationFn: ({ file, kind }) => api.chat.sendMedia(otherId, file, kind),
    onSuccess: (m, { kind }) => {
      nearBottom.current = true
      append(m)
      qc.invalidateQueries({ queryKey: ['chat', 'threads'] })
      toast.success(kind === 'voice' ? 'Voice note sent' : 'File shared')
    },
    onError: (err) => toast.error(errorMessage(err, 'Upload failed. Please try again.')),
  })

  const grouped = useMemo(() => {
    const out = []
    let prevDay = null
    let prevSender = null
    for (const m of messages) {
      const dk = dayKey(m.created_at)
      if (dk !== prevDay) {
        out.push({ type: 'day', id: `day-${dk}`, label: fmtDay(m.created_at) })
        prevDay = dk
        prevSender = null
      }
      out.push({ type: 'msg', m, first: m.sender_role !== prevSender })
      prevSender = m.sender_role
    }
    return out
  }, [messages])

  const blocked = q.error?.response?.status === 403
  const isPatient = role === 'patient'
  const name = thread?.name || (isPatient ? 'Your doctor' : 'Patient')

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={`Conversation with ${name}`}>
      <header className="flex items-center gap-3 border-b border-line/70 px-3 py-3 sm:px-5">
        <Link to={base} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-ink/5 lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold leading-tight">{name}</p>
          <p className="truncate text-xs text-ink-3">{thread?.subtitle || (isPatient ? 'Doctor' : 'Patient')}</p>
        </div>
        {!isPatient && (
          <Link to={`/doctor/patients/${otherId}`} className="btn btn-sm btn-outline shrink-0">
            <UserRound className="h-4 w-4" /> <span className="hidden sm:inline">Patient file</span>
          </Link>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(236,247,244,.55),transparent_60%)] px-3 py-4 sm:px-6"
        aria-live="polite"
      >
        {q.isLoading ? (
          <Spinner label="Loading messages…" className="h-full" />
        ) : q.isError ? (
          <ErrorState className="mx-auto mt-6 max-w-md" error={q.error} onRetry={blocked ? undefined : q.refetch} />
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-[1.6rem] bg-gradient-to-br from-teal-100 to-teal-50 text-teal-600">
                <MessageCircleHeart className="h-7 w-7" />
              </motion.span>
              <p className="mt-4 font-display text-lg font-semibold">Start the conversation</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">
                {isPatient ? 'Ask a question, share how you’ve been, or send a voice note — your doctor will reply here.' : 'Send a note, instructions, or a voice message. Your patient is notified right away.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col">
            {grouped.map((g) =>
              g.type === 'day' ? (
                <div key={g.id} className="sticky top-0 z-10 my-3 flex justify-center">
                  <span className="rounded-full border border-line/70 bg-paper/90 px-3 py-1 text-[0.7rem] font-medium text-ink-3 shadow-soft backdrop-blur">{g.label}</span>
                </div>
              ) : (
                <Fragment key={g.m.id}>
                  <Bubble m={g.m} mine={g.m.sender_role === role} first={g.first} />
                </Fragment>
              ),
            )}
            {sendMedia.isPending && (
              <div className="mt-2 flex justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-xs text-ink-3 ring-1 ring-line">
                  <Clock className="h-3.5 w-3.5 animate-spin-slow" /> Uploading {sendMedia.variables?.kind === 'voice' ? 'voice note' : 'file'}…
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line/60 bg-paper/90 px-3 pb-3 pt-3 sm:px-6">
        {blocked ? (
          <p className="flex items-center justify-center gap-2 py-2 text-sm text-ink-3"><Lock className="h-4 w-4" /> Messaging isn’t open for this conversation.</p>
        ) : (
          <div className="mx-auto max-w-3xl">
            <MessageComposer
              reserveRight={isPatient}
              uploading={sendMedia.isPending}
              onSendText={(content) => sendText.mutate({ content, tmp: `tmp-${Date.now()}` })}
              onSendMedia={(file, kind) => sendMedia.mutate({ file, kind })}
            />
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[0.7rem] text-ink-4">
              <Lock className="h-3 w-3" /> Private between you and {isPatient ? 'your doctor' : 'your patient'}{isPatient ? ' · not for emergencies' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function Bubble({ m, mine, first }) {
  const media = m.msg_type === 'voice' || m.msg_type === 'file'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn('flex flex-col', mine ? 'items-end' : 'items-start', first ? 'mt-3' : 'mt-1')}
    >
      <div
        className={cn(
          'max-w-[85%] break-words rounded-3xl px-4 py-2.5 text-[0.9375rem] leading-relaxed sm:max-w-[70%]',
          mine ? 'bg-teal-700 text-white shadow-[0_10px_24px_-12px_rgba(15,60,50,.45)]' : 'border border-line/80 bg-paper text-ink shadow-soft',
          mine ? (first ? 'rounded-br-lg' : 'rounded-r-lg') : first ? 'rounded-bl-lg' : 'rounded-l-lg',
          m.pending && 'opacity-70',
        )}
      >
        {media ? <MediaMessage m={m} mine={mine} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
      </div>
      <span className="mt-1 flex items-center gap-1 px-2 text-[0.68rem] text-ink-4">
        {fmtDate(m.created_at, 'h:mm a')}
        {mine && (m.pending ? <Clock className="h-3 w-3" aria-label="Sending" /> : <Check className="h-3 w-3 text-teal-500" aria-label="Sent" />)}
      </span>
    </motion.div>
  )
}
