import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, Search, SearchX, Stethoscope, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { PageHeader } from '../../components/ui/Data'
import { Card } from '../../components/ui/Card'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import DoctorCard from '../../features/care/careteam/DoctorCard'
import RequestDialog from '../../features/care/careteam/RequestDialog'
import AppointmentsList from '../../features/care/careteam/AppointmentsList'

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function CareTeam() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'appointments' ? 'appointments' : 'find'
  const specialty = params.get('specialty') || ''
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim().slice(0, 60))
  const [requesting, setRequesting] = useState(null)

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const all = useQuery({ queryKey: ['doctors', 'directory', {}], queryFn: () => api.doctors.directory({}), staleTime: 5 * 60_000 })
  const filtered = useQuery({
    queryKey: ['doctors', 'directory', { specialty, q }],
    queryFn: () => api.doctors.directory({ ...(specialty ? { specialty } : {}), ...(q ? { q } : {}) }),
    enabled: !!(specialty || q),
    placeholderData: keepPreviousData,
  })
  const appts = useQuery({ queryKey: ['patient', 'appointments'], queryFn: api.patient.appointments })

  const directory = specialty || q ? filtered : all
  const doctors = directory.data?.doctors || []
  const specialties = useMemo(() => {
    const s = new Set(all.data?.specialties || [])
    if (specialty) s.add(specialty)
    return [...s].sort()
  }, [all.data, specialty])

  const appointments = appts.data?.appointments || []
  const relation = useMemo(() => {
    const map = {}
    for (const a of appointments) {
      const id = a.doctor?.id
      if (!id) continue
      if (a.status === 'accepted') map[id] = 'accepted'
      else if (a.status === 'pending' && map[id] !== 'accepted') map[id] = 'pending'
    }
    return map
  }, [appointments])
  const activeCount = appointments.filter((a) => a.status === 'pending' || a.status === 'accepted').length

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="Your care"
        accent="team"
        subtitle="Find a specialist who fits, request a visit, and keep every appointment in one place."
        actions={
          <Segmented
            value={tab}
            onChange={(v) => setParam('tab', v === 'appointments' ? 'appointments' : '')}
            options={[
              { value: 'find', label: 'Find a doctor', icon: Search },
              { value: 'appointments', label: 'My appointments', icon: CalendarHeart, count: activeCount || undefined },
            ]}
          />
        }
      />

      <AnimatePresence mode="wait">
        {tab === 'find' ? (
          <motion.div key="find" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            <div className="card mb-6 p-3 sm:p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
                <label htmlFor="doc-search" className="sr-only">Search doctors</label>
                <input
                  id="doc-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={60}
                  placeholder="Search by name, specialty or clinic"
                  className="input border-transparent bg-cream pl-11 pr-11 shadow-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-4 hover:bg-ink/5" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Filter by specialty">
                <button onClick={() => setParam('specialty', '')} aria-pressed={!specialty} className={cn('chip shrink-0', !specialty && 'border-ink bg-ink text-white hover:border-ink hover:bg-ink-2 hover:text-white')}>
                  All specialties
                </button>
                {all.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />)}
                {specialties.map((s) => {
                  const on = s.toLowerCase() === specialty.toLowerCase()
                  return (
                    <button key={s} onClick={() => setParam('specialty', on ? '' : s)} aria-pressed={on} className={cn('chip shrink-0', on && 'border-transparent bg-teal-700 text-white shadow-glow hover:border-transparent hover:bg-teal-700 hover:text-white')}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {directory.isError ? (
              <ErrorState error={directory.error} onRetry={directory.refetch} />
            ) : directory.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
            ) : doctors.length === 0 ? (
              <Card>
                <EmptyState
                  icon={specialty || q ? SearchX : Stethoscope}
                  tone="teal"
                  title={specialty || q ? 'No doctors match yet' : 'Doctors are joining soon'}
                  text={specialty || q ? 'Try a different search or clear the specialty filter.' : 'Verified specialists will appear here as they join MedoShield.'}
                  action={(specialty || q) && <Button variant="outline" size="sm" onClick={() => { setSearch(''); setParam('specialty', '') }}>Clear filters</Button>}
                />
              </Card>
            ) : (
              <>
                <p className={cn('mb-3 text-sm text-ink-3 transition-opacity', directory.isFetching && 'opacity-60')} aria-live="polite">
                  {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}{specialty ? ` in ${specialty}` : ''}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence>
                    {doctors.map((d, i) => <DoctorCard key={d.id} d={d} index={i} relation={relation[d.id]} onRequest={setRequesting} />)}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="appts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            {appts.isError ? (
              <ErrorState error={appts.error} onRetry={appts.refetch} />
            ) : appts.isLoading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
            ) : appointments.length === 0 ? (
              <Card>
                <EmptyState icon={CalendarHeart} title="No appointments yet" text="When you request a visit, you’ll follow its status here — and message your doctor once they accept." action={<Button variant="primary" size="sm" icon={Search} onClick={() => setParam('tab', '')}>Find a doctor</Button>} />
              </Card>
            ) : (
              <AppointmentsList items={appointments} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <RequestDialog doctor={requesting} onOpenChange={(o) => !o && setRequesting(null)} onDone={() => setParam('tab', 'appointments')} />
    </div>
  )
}
