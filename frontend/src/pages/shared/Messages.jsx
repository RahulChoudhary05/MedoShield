import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarHeart, MessagesSquare, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuth } from '../../store/auth'
import { PageHeader } from '../../components/ui/Data'
import Button from '../../components/ui/Button'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import ThreadList from '../../features/care/messages/ThreadList'
import ThreadView from '../../features/care/messages/ThreadView'

/** Shared by patients (/app/messages) and doctors (/doctor/messages). */
export default function Messages() {
  const { otherId } = useParams()
  const role = useAuth((s) => s.role)
  const isPatient = role !== 'doctor'
  const base = isPatient ? '/app/messages' : '/doctor/messages'

  const threadsQ = useQuery({ queryKey: ['chat', 'threads'], queryFn: api.chat.threads, refetchInterval: 20_000 })
  const threads = threadsQ.data?.threads || []
  const active = threads.find((t) => t.id === otherId)

  const header = (compact) => (
    <PageHeader
      kicker={isPatient ? 'Care team' : 'Patients'}
      title="Secure"
      accent="messages"
      description={compact ? undefined : 'Private conversations between patients and their doctors.'}
      className={cn(compact && 'mb-5 pb-4', compact && otherId && 'hidden lg:flex')}
    />
  )

  if (threadsQ.isError) {
    return (
      <div>
        {header(false)}
        <ErrorState error={threadsQ.error} onRetry={threadsQ.refetch} />
      </div>
    )
  }

  // No care links at all (and no explicit thread requested): calm empty state.
  if (!threadsQ.isLoading && threads.length === 0 && !otherId) {
    return (
      <div>
        {header(false)}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="card px-6 py-14 text-center"
          aria-labelledby="messages-empty"
        >
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <MessagesSquare aria-hidden className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <h2 id="messages-empty" className="mx-auto mt-5 max-w-xl font-serif text-[1.75rem] font-normal leading-tight">
            {isPatient
              ? <>Messaging opens once a doctor <span className="italic text-teal-700">accepts</span> your appointment</>
              : <>No patient conversations <span className="italic text-teal-700">yet</span></>}
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-3">
            {isPatient
              ? 'Request a visit with a specialist. As soon as they accept, you can send messages, voice notes and files here.'
              : 'Accept a patient’s appointment request and a private conversation with them will appear here.'}
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="primary" icon={CalendarHeart} to={isPatient ? '/app/care' : '/doctor/appointments'}>
              {isPatient ? 'Find a doctor' : 'Review requests'}
            </Button>
          </div>
        </motion.section>
      </div>
    )
  }

  return (
    <div>
      {header(true)}
      <div
        className={cn(
          'relative grid overflow-hidden rounded-3xl border border-line bg-paper lg:h-[calc(100dvh-17rem)] lg:min-h-[480px] lg:grid-cols-[20rem_1fr]',
          otherId ? 'h-[calc(100dvh-12.75rem)] min-h-[460px]' : 'h-[calc(100dvh-19rem)] min-h-[420px]',
        )}
      >
        <aside className={cn('min-h-0 border-r border-line bg-canvas/60', otherId ? 'hidden lg:flex' : 'flex')} aria-label="Conversations">
          <ThreadList threads={threads} loading={threadsQ.isLoading} activeId={otherId} base={base} className="w-full" />
        </aside>

        {otherId ? (
          threadsQ.isLoading ? (
            <div className="flex min-h-0 flex-col p-5" aria-busy="true" aria-label="Loading conversation">
              <Skeleton className="h-12 w-56" />
              <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className={cn('h-12', i % 2 ? 'ml-auto w-2/3' : 'w-1/2')} />)}</div>
            </div>
          ) : (
            <ThreadView key={otherId} otherId={otherId} thread={active} role={isPatient ? 'patient' : 'doctor'} base={base} />
          )
        ) : (
          <div className="hidden min-h-0 flex-col items-center justify-center px-8 text-center lg:flex">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-cream text-ink-2 ring-1 ring-inset ring-line">
              <MessagesSquare aria-hidden className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-5 font-serif text-[1.75rem] font-normal leading-tight">Pick a <span className="italic text-teal-700">conversation</span></h2>
            <p className="mt-2 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-3">
              {isPatient ? 'Message your doctor, send a quick voice note, or share a report.' : 'Choose a patient to reply, send instructions or share files.'}
            </p>
            <p className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.8125rem] text-teal-800">
              <ShieldCheck aria-hidden className="h-4 w-4" strokeWidth={1.8} /> Visible only to you and your {isPatient ? 'doctor' : 'patient'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
