import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpDown, ChevronRight, Lock, MessageSquare, Search, SearchX, Unlock, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, fmtRelative } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { RiskBadge, RISK_HEX, riskKey } from '../../components/ui/Badge'
import { Avatar, MicroBars, PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import { MiniBar, Tag, Th, levelOf, motorOf, patientMeta, subscoresOf } from '../../features/doctor/shared'

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
const SUMMARY = [
  { key: 'ALL', label: 'On your panel' },
  { key: 'HIGH', label: 'Needs review' },
  { key: 'MEDIUM', label: 'Watch closely' },
  { key: 'LOW', label: 'Steady' },
]

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
        kicker="Your panel"
        title="My"
        accent="patients"
        description="Everyone under your care, triaged by their latest movement check. Select a patient to open their chart."
      />

      {patients.length > 0 && (
        <div className="card mb-6 grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          {SUMMARY.map((s, i) => {
            const active = filter === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilter(s.key)}
                aria-pressed={active}
                className={cn(
                  'relative min-h-[44px] border-line px-5 py-4 text-left transition-colors duration-150 hover:bg-cream/50',
                  ['border-b border-r sm:border-b-0', 'border-b sm:border-b-0 sm:border-r', 'border-r', ''][i],
                  active && 'bg-cream/60',
                )}
              >
                {active && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-teal-700" />}
                <span className="kicker flex items-center gap-1.5">
                  {s.key !== 'ALL' && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_HEX[s.key] }} />}
                  {s.label}
                </span>
                <span className="num mt-1.5 block text-[1.75rem] leading-none text-ink">{counts[s.key] || 0}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          aria-label="Filter by risk"
          value={filter}
          onChange={setFilter}
          size="sm"
          options={FILTERS.filter((f) => f.value === 'ALL' || f.value === filter || counts[f.value]).map((f) => ({ ...f, count: counts[f.value] || 0 }))}
        />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 lg:w-72">
            <Search aria-hidden strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or condition"
              aria-label="Search patients"
              className="input pl-10"
            />
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sort patients</span>
            <ArrowUpDown aria-hidden strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-[9.5rem] pl-10">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <Card><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div></Card>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : patients.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No patients yet"
            text="Patients join your panel when you accept their appointment request."
            action={<Button variant="brand" to="/doctor/appointments">Review requests</Button>}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            tone="ink"
            title="No matches"
            text="Nobody on your panel matches that search and filter."
            action={<Button variant="outline" onClick={() => { setQuery(''); setFilter('ALL') }}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card pad={false} className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-[0.9375rem]">
                <caption className="sr-only">Patients on your panel, {rows.length} shown, sorted by {SORTS[sort].label.toLowerCase()}</caption>
                <thead className="border-b border-line">
                  <tr>
                    <Th className="pl-6">Patient</Th>
                    <Th>Conditions</Th>
                    <Th>Latest risk</Th>
                    <Th>Motor index</Th>
                    <Th>Profile</Th>
                    <Th>Last check</Th>
                    <Th>Video review</Th>
                    <Th className="pr-6 text-right">Messages</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
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
                          transition={{ duration: 0.2 }}
                          onClick={() => open(p.id)}
                          className="group cursor-pointer transition-colors duration-150 hover:bg-cream/50"
                        >
                          <td className="py-3 pl-6 pr-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={p.full_name} size={36} />
                              <div className="min-w-0">
                                <Link
                                  to={`/doctor/patients/${p.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block truncate font-medium text-ink underline-offset-4 group-hover:underline"
                                >
                                  {p.full_name}
                                </Link>
                                <p className="truncate text-[0.8125rem] text-ink-3">{patientMeta(p) || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><Conditions list={p.conditions} /></td>
                          <td className="px-3 py-3"><RiskBadge level={level} pulse short /></td>
                          <td className="px-3 py-3"><MiniBar value={motorOf(p.latest_risk)} level={level} /></td>
                          <td className="px-3 py-3"><Profile p={p} level={level} /></td>
                          <td className="whitespace-nowrap px-3 py-3 text-ink-2">{p.latest_risk?.created_at ? fmtRelative(p.latest_risk.created_at) : <span className="text-ink-3">Never</span>}</td>
                          <td className="px-3 py-3"><VideoState unlocked={p.video_unlocked} /></td>
                          <td className="py-3 pl-3 pr-6 text-right"><Unread n={p.unread_messages} /></td>
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
                  <Link to={`/doctor/patients/${p.id}`} className="card block p-4 transition-colors duration-150 active:bg-cream/50">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.full_name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{p.full_name}</p>
                        <p className="truncate text-[0.8125rem] text-ink-3">{patientMeta(p) || '—'}</p>
                      </div>
                      <RiskBadge level={level} pulse short />
                      <ChevronRight aria-hidden strokeWidth={1.8} className="h-4 w-4 shrink-0 text-ink-4" />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
                      <div>
                        <dt className="kicker">Motor</dt>
                        <dd className="mt-1"><MiniBar value={motorOf(p.latest_risk)} level={level} /></dd>
                      </div>
                      <div>
                        <dt className="kicker">Profile</dt>
                        <dd className="mt-1.5"><Profile p={p} level={level} width={60} /></dd>
                      </div>
                      <div className="text-right">
                        <dt className="kicker">Last check</dt>
                        <dd className="mt-1 text-[0.875rem] text-ink-2">{p.latest_risk?.created_at ? fmtRelative(p.latest_risk.created_at) : 'Never'}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <VideoState unlocked={p.video_unlocked} />
                      {p.unread_messages > 0 && <Unread n={p.unread_messages} />}
                      {(p.conditions || []).length > 0 && <Conditions list={p.conditions} max={2} />}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-center font-mono text-[0.8125rem] text-ink-3" aria-live="polite">Showing {rows.length} of {patients.length} patients</p>
        </>
      )}
    </div>
  )
}

/** Biomarker profile micro-chart from the latest check's sub-scores (tremor → cadence). */
function Profile({ p, level, width = 72 }) {
  const values = subscoresOf(p.latest_risk)
  const k = riskKey(level)
  return (
    <MicroBars
      values={values}
      width={width}
      color={k === 'UNKNOWN' || k === 'CALIBRATING' ? RISK_HEX.CALIBRATING : RISK_HEX[k]}
      label={values.some((v) => v != null) ? `Biomarker sub-scores: ${values.map((v) => (v == null ? '—' : Math.round(v))).join(', ')}` : undefined}
    />
  )
}

function Conditions({ list = [], max = 2 }) {
  if (!list.length) return <span className="text-[0.8125rem] text-ink-3">None recorded</span>
  return (
    <div className="flex max-w-[15rem] flex-wrap gap-1">
      {list.slice(0, max).map((c) => <Tag key={c} tone="ink">{c}</Tag>)}
      {list.length > max && <Tag tone="ink" className="text-ink-3">+{list.length - max}</Tag>}
    </div>
  )
}

function VideoState({ unlocked }) {
  const Icon = unlocked ? Unlock : Lock
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem]', unlocked ? 'text-teal-700' : 'text-ink-3')}>
      <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} />
      {unlocked ? 'Unlocked' : 'Locked'}
    </span>
  )
}

function Unread({ n }) {
  if (!n) return <span className="text-[0.8125rem] text-ink-4">—</span>
  return (
    <span className="badge bg-apricot-50 text-apricot-600 ring-1 ring-inset ring-apricot-100" aria-label={`${n} unread messages`}>
      <MessageSquare aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} /> <span className="num">{n}</span>
    </span>
  )
}
