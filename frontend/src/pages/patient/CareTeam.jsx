import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, Search, SearchX, Stethoscope, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { PageHeader } from '../../components/ui/motion'
import Segmented from '../../components/ui/Segmented'
import Button from '../../components/ui/Button'
import { Empty, InlineError } from '../../features/care/kit'
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
       
        title="Your care"
        accent="team"
        description="Find a specialist who fits, request a visit, and keep every appointment in one place."
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
            <div className="mb-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} aria-hidden />
                <label htmlFor="doc-search" className="sr-only">Search doctors</label>
                <input
                  id="doc-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={60}
                  placeholder="Search by name, specialty or clinic"
                  className="input h-12 pl-11 pr-12"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-ink/5" aria-label="Clear search">
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Filter by specialty">
                <button onClick={() => setParam('specialty', '')} aria-pressed={!specialty} className={cn('chip min-h-[44px] shrink-0 px-3.5', !specialty && 'border-ink bg-ink text-paper hover:border-ink hover:bg-ink-2 hover:text-paper')}>
                  All specialties
                </button>
                {all.isLoading && [0, 1, 2].map((i) => <div key={i} className="skeleton h-11 w-28 shrink-0 rounded-full" />)}
                {specialties.map((s) => {
                  const on = s.toLowerCase() === specialty.toLowerCase()
                  return (
                    <button key={s} onClick={() => setParam('specialty', on ? '' : s)} aria-pressed={on} className={cn('chip min-h-[44px] shrink-0 px-3.5', on && 'border-teal-700 bg-teal-700 text-paper hover:border-teal-700 hover:bg-teal-800 hover:text-paper')}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {directory.isError ? (
              <InlineError error={directory.error} onRetry={directory.refetch} />
            ) : directory.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading doctors">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-72 rounded-3xl" />)}</div>
            ) : doctors.length === 0 ? (
              <Empty
                icon={specialty || q ? SearchX : Stethoscope}
                title={specialty || q ? 'No doctors match yet' : 'Doctors are joining soon'}
                text={specialty || q ? 'Try a different search or clear the specialty filter.' : 'Verified specialists appear here as they join MedoShield.'}
                action={(specialty || q) && <Button variant="outline" onClick={() => { setSearch(''); setParam('specialty', '') }}>Clear filters</Button>}
              />
            ) : (
              <>
                <h2 className={cn('mb-3 font-mono text-[0.8125rem] font-normal text-ink-3 transition-opacity', directory.isFetching && 'opacity-60')} aria-live="polite">
                  {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}{specialty ? ` in ${specialty}` : ''}
                </h2>
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
              <InlineError error={appts.error} onRetry={appts.refetch} />
            ) : appts.isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading appointments">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-3xl" />)}</div>
            ) : appointments.length === 0 ? (
              <Empty icon={CalendarHeart} title="No appointments yet" text="Requested visits show here — messaging opens once a doctor accepts." action={<Button variant="primary" icon={Search} onClick={() => setParam('tab', '')}>Find a doctor</Button>} />
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
