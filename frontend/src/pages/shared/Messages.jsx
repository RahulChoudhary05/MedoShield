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

export default function Messages() {
  const { otherId } = useParams()
  const role = useAuth((s) => s.role)
  const isPatient = role !== 'doctor'
  const base = isPatient ? '/app/messages' : '/doctor/messages'

  const threadsQ = useQuery({ queryKey: ['chat', 'threads'], queryFn: api.chat.threads, refetchInterval: 20_000 })
  const threads = threadsQ.data?.threads || []
  const active = threads.find((t) => t.id === otherId)

  if (threadsQ.isError) {
    return (
      <div>
        <PageHeader eyebrow={isPatient ? 'Care' : 'Patients'} title="Secure" accent="messages" />
        <ErrorState error={threadsQ.error} onRetry={threadsQ.refetch} />
      </div>
    )
  }

  // No care links at all (and no explicit thread requested): friendly empty state.
  if (!threadsQ.isLoading && threads.length === 0 && !otherId) {
    return (
      <div>
        <PageHeader eyebrow={isPatient ? 'Care' : 'Patients'} title="Secure" accent="messages" subtitle="Private conversations between patients and their doctors." />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card card-tint-teal relative overflow-hidden px-6 py-14 text-center">
          <span className="icon-tile icon-teal relative mx-auto h-16 w-16 rounded-[1.6rem] shadow-soft">
            <MessagesSquare className="h-7 w-7" />
          </span>
          <h2 className="relative mt-5 text-2xl font-semibold">
            {isPatient ? <>Messaging opens once a doctor <span className="serif-accent">accepts</span> your appointment</> : <>No patient conversations <span className="serif-accent">yet</span></>}
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-3 text-pretty">
            {isPatient
              ? 'Request a visit with a specialist. As soon as they accept, you can send messages, voice notes and files here.'
              : 'Accept a patient’s appointment request and a private conversation with them will appear here.'}
          </p>
          <div className="relative mt-6 flex justify-center">
            <Button variant="primary" icon={CalendarHeart} to={isPatient ? '/app/care' : '/doctor/appointments'}>
              {isPatient ? 'Find a doctor' : 'Review requests'}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <div className="relative grid h-[calc(100dvh-12.75rem)] min-h-[520px] overflow-hidden rounded-3xl border border-line/80 bg-paper shadow-soft lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-[20rem_1fr]">
        <aside className={cn('min-h-0 border-r border-line/70 bg-gradient-to-b from-cream to-paper', otherId ? 'hidden lg:flex' : 'flex')} aria-label="Conversations">
          <ThreadList threads={threads} loading={threadsQ.isLoading} activeId={otherId} base={base} className="w-full" />
        </aside>

        {otherId ? (
          threadsQ.isLoading ? (
            <div className="flex min-h-0 flex-col p-5">
              <Skeleton className="h-12 w-56" />
              <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className={cn('h-12', i % 2 ? 'ml-auto w-2/3' : 'w-1/2')} />)}</div>
            </div>
          ) : (
            <ThreadView key={otherId} otherId={otherId} thread={active} role={isPatient ? 'patient' : 'doctor'} base={base} />
          )
        ) : (
          <div className="hidden min-h-0 flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(231,251,246,.8),transparent_65%)] px-8 text-center lg:flex">
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="icon-tile icon-teal h-16 w-16 rounded-[1.6rem] shadow-glow">
              <MessagesSquare className="h-7 w-7" />
            </motion.span>
            <p className="mt-5 font-display text-xl font-semibold">Pick a <span className="serif-accent">conversation</span></p>
            <p className="mt-1 max-w-sm text-sm text-ink-3">
              {isPatient ? 'Message your doctor, send a quick voice note, or share a report.' : 'Choose a patient to reply, send instructions or share files.'}
            </p>
            <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Visible only to you and your {isPatient ? 'doctor' : 'patient'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
