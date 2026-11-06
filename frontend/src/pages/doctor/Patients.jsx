import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowUpDown, ChevronRight, HeartPulse, Lock, MessageSquare, Search, SearchX, ShieldAlert, Unlock, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, fmtRelative } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { RiskBadge } from '../../components/ui/Badge'
import { Avatar, PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import { MiniBar, Tag, Th, levelOf, motorOf, patientMeta } from '../../features/doctor/shared'

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'CALIBRATING', label: 'Calibrating' },
  { value: 'UNKNOWN', label: 'No data' },
]
const RANK = { HIGH: 0, MEDIUM: 1, CALIBRATING: 2, LOW: 3, UNKNOWN: 4 }
const SORTS = {
  risk: { label: 'Risk', fn: (a, b) => RANK[levelOf(a.latest_risk)] - RANK[levelOf(b.latest_risk)] },
  recent: { label: 'Last check', fn: (a, b) => new Date(b.latest_risk?.created_at || 0) - new Date(a.latest_risk?.created_at || 0) },
  name: { label: 'Name', fn: (a, b) => (a.full_name || '').localeCompare(b.full_name || '') },
}

export default function Patients() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['doctor', 'patients'], queryFn: api.doctors.patients })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [sort, setSort] = useState('risk')

  const patients = useMemo(() => data?.patients ?? [], [data])
  const counts = useMemo(() => {
    const c = { ALL: patients.length }
    patients.forEach((p) => {
      const l = levelOf(p.latest_risk)
      c[l] = (c[l] || 0) + 1
    })
    return c
  }, [patients])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return patients
      .filter((p) => filter === 'ALL' || levelOf(p.latest_risk) === filter)
      .filter((p) => !needle || `${p.full_name} ${p.email || ''} ${(p.conditions || []).join(' ')}`.toLowerCase().includes(needle))
      .sort(SORTS[sort].fn)
  }, [patients, filter, query, sort])

  const open = (id) => navigate(`/doctor/patients/${id}`)

  return (
    <div>
      <PageHeader
        eyebrow="Your panel"
        title="My"
        accent="patients"
        subtitle="Everyone under your care, triaged by their latest movement check. Select a patient to open their chart."
      />

      {patients.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: 'ALL', label: 'On your panel', icon: Users },
            { key: 'HIGH', label: 'Needs review', icon: ShieldAlert, dot: 'bg-risk-high' },
            { key: 'MEDIUM', label: 'Watch closely', icon: Activity, dot: 'bg-risk-medium' },
            { key: 'LOW', label: 'Steady', icon: HeartPulse, dot: 'bg-risk-low' },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilter(s.key)}
              aria-pressed={filter === s.key}
              className={cn('card card-interactive flex items-center gap-3 p-4 text-left', filter === s.key && 'border-teal-300 ring-1 ring-teal-200')}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cream text-ink-3"><s.icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0">
                <span className="num block text-2xl font-semibold leading-none text-ink">{counts[s.key] || 0}</span>
                <span className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-ink-3">
                  {s.dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />}{s.label}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={FILTERS.filter((f) => f.value === 'ALL' || f.value === filter || counts[f.value]).map((f) => ({ ...f, count: counts[f.value] || 0 }))}
        />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or condition"
              aria-label="Search patients"
              className="input h-10 rounded-full pl-10 text-sm"
            />
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sort patients</span>
            <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input h-10 w-[9.5rem] rounded-full pl-9 text-sm">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <Card><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div></Card>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : patients.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No patients yet"
            text="Patients join your panel when you accept their appointment request. Pending requests are waiting in Appointments."
            action={<Button variant="brand" size="sm" to="/doctor/appointments">Review requests</Button>}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            tone="apricot"
            title="No matches"
            text="Nobody on your panel matches that search and filter."
            action={<Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('ALL') }}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card pad={false} className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="border-b border-line/70 bg-cream/70">
                  <tr>
                    <Th className="pl-6">Patient</Th>
                    <Th>Conditions</Th>
                    <Th>Latest risk</Th>
                    <Th>Motor index</Th>
                    <Th>Last check</Th>
                    <Th>Video review</Th>
                    <Th className="pr-6 text-right">Messages</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  <AnimatePresence initial={false}>
                    {rows.map((p) => {
                      const level = levelOf(p.latest_risk)
                      return (
                        <motion.tr
                          key={p.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => open(p.id)}
                          className="group cursor-pointer transition-colors hover:bg-cream/80"
                        >
                          <td className="py-3.5 pl-6 pr-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={p.full_name} size={38} />
                              <div className="min-w-0">
                                <Link
                                  to={`/doctor/patients/${p.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block truncate font-semibold text-ink group-hover:text-teal-700"
                                >
                                  {p.full_name}
                                </Link>
                                <p className="truncate text-xs text-ink-3">{patientMeta(p) || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5"><Conditions list={p.conditions} /></td>
                          <td className="px-3 py-3.5"><RiskBadge level={level} pulse /></td>
                          <td className="px-3 py-3.5"><MiniBar value={motorOf(p.latest_risk)} level={level} /></td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-ink-2">{p.latest_risk?.created_at ? fmtRelative(p.latest_risk.created_at) : <span className="text-ink-4">Never</span>}</td>
                          <td className="px-3 py-3.5"><VideoState unlocked={p.video_unlocked} /></td>
                          <td className="py-3.5 pl-3 pr-6 text-right"><Unread n={p.unread_messages} /></td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((p) => {
              const level = levelOf(p.latest_risk)
              return (
                <li key={p.id}>
                  <Link to={`/doctor/patients/${p.id}`} className="card card-interactive block p-4 active:scale-[.99]">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.full_name} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.full_name}</p>
                        <p className="truncate text-xs text-ink-3">{patientMeta(p) || '—'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RiskBadge level={level} pulse />
                      <VideoState unlocked={p.video_unlocked} />
                      <Unread n={p.unread_messages} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2.5">
                      <div>
                        <p className="text-[0.65rem] font-medium uppercase tracking-[.12em] text-ink-4">Motor index</p>
                        <MiniBar value={motorOf(p.latest_risk)} level={level} />
                      </div>
                      <p className="text-right text-xs text-ink-3">Last check<br /><span className="font-medium text-ink-2">{p.latest_risk?.created_at ? fmtRelative(p.latest_risk.created_at) : 'Never'}</span></p>
                    </div>
                    {(p.conditions || []).length > 0 && <div className="mt-3"><Conditions list={p.conditions} max={3} /></div>}
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-center text-xs text-ink-4">Showing {rows.length} of {patients.length} patients</p>
        </>
      )}
    </div>
  )
}

function Conditions({ list = [], max = 2 }) {
  if (!list.length) return <span className="text-xs text-ink-4">None recorded</span>
  return (
    <div className="flex max-w-[15rem] flex-wrap gap-1">
      {list.slice(0, max).map((c) => <Tag key={c} tone="teal">{c}</Tag>)}
      {list.length > max && <Tag tone="ink" className="cursor-default" >+{list.length - max}</Tag>}
    </div>
  )
}

function VideoState({ unlocked }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', unlocked ? 'bg-teal-50 text-teal-700' : 'bg-cream text-ink-3 ring-1 ring-inset ring-line')}>
      {unlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {unlocked ? 'Unlocked' : 'Locked'}
    </span>
  )
}

function Unread({ n }) {
  if (!n) return <span className="text-xs text-ink-4">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-apricot-50 px-2.5 py-0.5 text-xs font-semibold text-apricot-600" aria-label={`${n} unread messages`}>
      <MessageSquare className="h-3 w-3" /> {n}
    </span>
  )
}
