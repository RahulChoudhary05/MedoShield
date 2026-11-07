import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Info, Lock, PanelLeft, SquarePen, X } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { PageHeader } from '../../components/ui/motion'
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
      <PageHeader
        kicker="Assistant · guarded"
        title="Ask"
        accent="Medo"
        description="General health information in plain words. Emergencies, unsafe requests and anything that needs a doctor are routed by a safety layer first."
        className="mb-5 pb-5"
      />

      <div className="relative grid h-[calc(100dvh-20rem)] min-h-[480px] overflow-hidden rounded-3xl border border-line bg-paper lg:h-[calc(100dvh-17.5rem)] lg:grid-cols-[17.5rem_1fr]">
        {/* Desktop rail */}
        <aside className="hidden min-h-0 border-r border-line bg-cream/50 lg:block" aria-label="Conversations">{rail}</aside>

        {/* Mobile rail drawer */}
        <AnimatePresence>
          {railOpen && (
            <>
              <motion.button
                aria-label="Close conversations"
                className="absolute inset-0 z-20 bg-ink/20 lg:hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setRailOpen(false)}
              />
              <motion.aside
                aria-label="Conversations"
                className="absolute inset-y-0 left-0 z-30 flex w-[85%] max-w-[20rem] flex-col border-r border-line bg-canvas shadow-float lg:hidden"
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ duration: 0.24, ease: [0.65, 0, 0.35, 1] }}
              >
                <div className="flex items-center justify-between px-4 pt-3">
                  <p className="font-medium text-ink">Your chats</p>
                  <button onClick={() => setRailOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg text-ink-3 hover:bg-ink/5" aria-label="Close conversations">
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="min-h-0 flex-1">{rail}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Thread */}
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Conversation with Medo">
          <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-5">
            <button onClick={() => setRailOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-ink/5 lg:hidden" aria-label="Show conversations">
              <PanelLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <MedoAvatar size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight text-ink">{activeTitle || 'New conversation'}</p>
              <p className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-3">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden />
                Guarded health companion
              </p>
            </div>
            <button onClick={startNew} className="btn btn-md btn-ghost shrink-0 px-3" aria-label="Start a new conversation">
              <SquarePen className="h-4 w-4" strokeWidth={1.8} /> <span className="hidden sm:inline">New</span>
            </button>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-canvas/40 px-3 py-5 sm:px-6" aria-live="polite" aria-busy={send.isPending || loadingConvo}>
            {loadingConvo ? (
              <div className="mx-auto max-w-3xl space-y-4" aria-label="Opening conversation">
                <div className="skeleton ml-auto h-12 w-2/3" />
                <div className="skeleton h-24 w-5/6" />
                <div className="skeleton ml-auto h-10 w-1/2" />
              </div>
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

          <div className="border-t border-line bg-paper px-3 pb-3 pt-3 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <Composer ref={composerRef} onSend={sendText} disabled={send.isPending || loadingConvo} reserveRight />
            </div>
          </div>
        </section>
      </div>

      <p className="mt-3 flex items-start justify-center gap-1.5 px-4 text-center text-[0.8125rem] text-ink-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
        <span>
          Medo offers general health information, not a diagnosis. In an emergency call <a href="tel:112" className="font-medium text-rose-600 underline underline-offset-2">112</a>.
          <span className="ml-1.5 inline-flex items-center gap-1"><Lock className="h-3 w-3" strokeWidth={1.8} aria-hidden /> Chats are private to you.</span>
        </span>
      </p>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this conversation?"
        description={toDelete?.title ? `“${toDelete.title}” will be removed for good.` : undefined}
        confirmLabel="Delete conversation"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(toDelete.id)}
      />
    </div>
  )
}
