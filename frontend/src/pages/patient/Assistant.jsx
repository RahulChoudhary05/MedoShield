import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Info, Lock, PanelLeft, SquarePen, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, errorMessage } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Feedback'
import ConversationRail from '../../features/care/assistant/ConversationRail'
import { AssistantMessage, MedoAvatar, TypingMessage, UserMessage } from '../../features/care/assistant/MessageItem'
import Composer from '../../features/care/assistant/Composer'
import Welcome from '../../features/care/assistant/Welcome'
import { ConfirmDialog } from '../../features/care/shared'

let tmpSeq = 0
const tmpId = () => `tmp-${Date.now()}-${tmpSeq++}`

export default function Assistant() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingConvo, setLoadingConvo] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const scrollRef = useRef(null)
  const composerRef = useRef(null)
  const loadToken = useRef(0)

  const conversations = useQuery({ queryKey: ['assistant', 'conversations'], queryFn: api.assistant.conversations })

  const send = useMutation({
    mutationFn: ({ text, cid }) => api.assistant.send(text, cid),
    onMutate: ({ text, localId }) => {
      setMessages((ms) => [...ms.filter((m) => m.id !== localId), { id: localId, role: 'user', content: text, pending: true }])
    },
    onSuccess: (res, { localId, cid, token }) => {
      qc.invalidateQueries({ queryKey: ['assistant', 'conversations'] })
      if (token !== loadToken.current) return // user moved to another conversation meanwhile
      setMessages((ms) => [
        ...ms.map((m) => (m.id === localId ? { ...m, pending: false } : m)),
        {
          id: tmpId(), role: 'assistant', content: res.reply, chips: res.chips, urgency: res.urgency,
          suggested_specialty: res.suggested_specialty, source: res.source, model: res.model,
        },
      ])
      if (!cid) setActiveId(res.conversation_id)
    },
    onError: (err, { localId, token }) => {
      if (token !== loadToken.current) return
      setMessages((ms) => ms.map((m) => (m.id === localId ? { ...m, pending: false, error: true } : m)))
      toast.error(errorMessage(err, 'Medo couldn’t reply just now.'))
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.assistant.remove(id),
    onSuccess: (_, id) => {
      toast.success('Conversation deleted')
      if (id === activeId) startNew()
      setToDelete(null)
      qc.invalidateQueries({ queryKey: ['assistant', 'conversations'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, send.isPending, loadingConvo])

  function sendText(text) {
    const t = text.trim()
    if (!t || send.isPending) return
    send.mutate({ text: t.slice(0, 2000), localId: tmpId(), cid: activeId, token: loadToken.current })
  }

  function retry(m) {
    if (send.isPending) return
    send.mutate({ text: m.content, localId: m.id, cid: activeId, token: loadToken.current })
  }

  function startNew() {
    loadToken.current++
    setActiveId(null)
    setMessages([])
    setLoadingConvo(false)
    setRailOpen(false)
    send.reset()
    setTimeout(() => composerRef.current?.focus(), 50)
  }

  async function openConversation(id) {
    setRailOpen(false)
    if (id === activeId) return
    const token = ++loadToken.current
    setActiveId(id)
    setMessages([])
    setLoadingConvo(true)
    try {
      const c = await qc.fetchQuery({ queryKey: ['assistant', 'conversation', id], queryFn: () => api.assistant.conversation(id), staleTime: 0 })
      if (token !== loadToken.current) return
      setMessages((c.messages || []).map((m, i) => ({ ...m, id: `${id}-${i}` })))
    } catch (err) {
      if (token !== loadToken.current) return
      toast.error(errorMessage(err, 'Couldn’t open that conversation.'))
      setActiveId(null)
    } finally {
      if (token === loadToken.current) setLoadingConvo(false)
    }
  }

  function onChip(chip) {
    const c = chip.toLowerCase()
    if (c.includes('sos')) {
      const btn = document.querySelector('[aria-label^="Emergency SOS"]')
      btn?.focus()
      toast('Press and hold the red SOS button', { description: 'It shares your location with your emergency contact and care team.' })
      return
    }
    if (c === 'find a doctor' || c === 'book a doctor') return navigate('/app/care')
    sendText(chip)
  }

  const lastAssistantIdx = messages.reduce((acc, m, i) => (m.role === 'assistant' ? i : acc), -1)
  const empty = !loadingConvo && messages.length === 0
  const activeTitle = conversations.data?.conversations?.find((c) => c.id === activeId)?.title

  const rail = (
    <ConversationRail
      query={conversations}
      activeId={activeId}
      onSelect={openConversation}
      onNew={startNew}
      onDelete={setToDelete}
      className="h-full"
    />
  )

  return (
    <div>
      <div className="relative grid h-[calc(100dvh-12.75rem)] min-h-[520px] overflow-hidden rounded-3xl border border-line/80 bg-paper shadow-soft lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-[17.5rem_1fr]">
        {/* Desktop rail */}
        <aside className="hidden min-h-0 border-r border-line/70 bg-cream/60 lg:block" aria-label="Conversations">{rail}</aside>

        {/* Mobile rail drawer */}
        <AnimatePresence>
          {railOpen && (
            <>
              <motion.button
                aria-label="Close conversations"
                className="absolute inset-0 z-20 bg-ink/20 backdrop-blur-[2px] lg:hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setRailOpen(false)}
              />
              <motion.aside
                aria-label="Conversations"
                className="absolute inset-y-0 left-0 z-30 flex w-[85%] max-w-[20rem] flex-col border-r border-line bg-paper shadow-lift lg:hidden"
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                <div className="flex items-center justify-between px-4 pt-3">
                  <p className="font-display font-semibold">Your chats</p>
                  <button onClick={() => setRailOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-ink/5" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">{rail}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Thread */}
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Conversation with Medo">
          <header className="flex items-center gap-3 border-b border-line/70 px-3 py-3 sm:px-5">
            <button onClick={() => setRailOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-ink/5 lg:hidden" aria-label="Show conversations">
              <PanelLeft className="h-5 w-5" />
            </button>
            <MedoAvatar size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-semibold leading-tight">{activeTitle || 'Medo'}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-pulse2 rounded-full bg-teal-400" /><span className="relative h-2 w-2 rounded-full bg-teal-500" /></span>
                Guarded health companion
              </p>
            </div>
            <button onClick={startNew} className="btn btn-sm btn-ghost shrink-0" aria-label="Start a new conversation">
              <SquarePen className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
            </button>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_left,rgba(231,251,246,.9),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(243,240,255,.9),transparent_55%)] px-3 py-5 sm:px-6" aria-live="polite">
            {loadingConvo ? (
              <Spinner label="Opening conversation…" className="h-full" />
            ) : empty ? (
              <Welcome name={user?.first_name} onPick={sendText} disabled={send.isPending} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <UserMessage key={m.id} m={m} onRetry={retry} />
                  ) : (
                    <AssistantMessage key={m.id} m={m} showChips={i === lastAssistantIdx && i === messages.length - 1} onChip={onChip} disabled={send.isPending} />
                  ),
                )}
                {send.isPending && send.variables?.token === loadToken.current && <TypingMessage />}
              </div>
            )}
          </div>

          <div className="border-t border-line/60 bg-paper/90 px-3 pb-3 pt-3 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <Composer ref={composerRef} onSend={sendText} disabled={send.isPending || loadingConvo} reserveRight />
            </div>
          </div>
        </section>
      </div>

      <p className="mt-3 flex items-start justify-center gap-1.5 px-4 text-center text-xs text-ink-4">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          Medo offers general health information, not a diagnosis. In an emergency call <a href="tel:112" className="font-semibold text-rose-500 hover:underline">112</a>.
          <span className="ml-1.5 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Chats are private to you.</span>
        </span>
      </p>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this conversation?"
        description={toDelete?.title ? `“${toDelete.title}” will be removed for good.` : undefined}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(toDelete.id)}
      />
    </div>
  )
}
