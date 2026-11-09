import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpDown, ChevronRight, Copy, Download, Lock, MessageSquare, Search, SearchX, Unlock, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, fmtRelative } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { RiskBadge, RISK_HEX, riskKey } from '../../components/ui/Badge'
import { Avatar, MicroBars, PageHeader } from '../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import DataTable, { BulkButton, downloadCsv } from '../../components/ui/DataTable'
import { useDebouncedValue } from '../../lib/hooks'
import { toast } from 'sonner'
import { MiniBar, Tag, levelOf, motorOf, patientMeta, subscoresOf } from '../../features/doctor/shared'

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
  motor: { label: 'Motor index', fn: (a, b) => (motorOf(a.latest_risk) ?? -1) - (motorOf(b.latest_risk) ?? -1) },
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
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const debouncedQuery = useDebouncedValue(query, 200)
  const filter = FILTERS.some((f) => f.value === params.get('risk')) ? params.get('risk') : 'ALL'
  const setFilter = (v) => setParams((p) => { const n = new URLSearchParams(p); v === 'ALL' ? n.delete('risk') : n.set('risk', v); return n }, { replace: true })
  const [sort, setSort] = useState('risk')
  const [sortDir, setSortDir] = useState('asc')
  // Keep the search in the URL (shareable, survives reload) without a history entry per keystroke.
  useEffect(() => {
    setParams((p) => { const n = new URLSearchParams(p); debouncedQuery ? n.set('q', debouncedQuery) : n.delete('q'); return n }, { replace: true })
  }, [debouncedQuery, setParams])

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
    const needle = debouncedQuery.trim().toLowerCase()
    const sorter = SORTS[sort] || SORTS.risk
    const list = patients
      .filter((p) => filter === 'ALL' || levelOf(p.latest_risk) === filter)
      .filter((p) => !needle || `${p.full_name} ${p.email || ''} ${(p.conditions || []).join(' ')}`.toLowerCase().includes(needle))
      .sort(sorter.fn)
    return sortDir === 'desc' ? list.reverse() : list
  }, [patients, filter, debouncedQuery, sort, sortDir])

  const columns = useMemo(() => [
    {
      id: 'name', header: 'Patient', sortValue: true,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.full_name} size={36} />
          <div className="min-w-0">
            <Link to={`/doctor/patients/${p.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink underline-offset-4 group-hover:underline">{p.full_name}</Link>
            <p className="truncate text-[0.8125rem] text-ink-3">{patientMeta(p) || '—'}</p>
          </div>
        </div>
      ),
    },
    { id: 'conditions', header: 'Conditions', cell: (p) => <Conditions list={p.conditions} /> },
    { id: 'risk', header: 'Latest risk', sortValue: true, cell: (p) => <RiskBadge level={levelOf(p.latest_risk)} pulse short /> },
    { id: 'motor', header: 'Motor index', sortValue: true, cell: (p) => <MiniBar value={motorOf(p.latest_risk)} level={levelOf(p.latest_risk)} /> },
    { id: 'profile', header: 'Profile', cell: (p) => <Profile p={p} level={levelOf(p.latest_risk)} /> },
    { id: 'recent', header: 'Last check', sortValue: true, className: 'whitespace-nowrap text-ink-2', cell: (p) => (p.latest_risk?.created_at ? fmtRelative(p.latest_risk.created_at) : <span className="text-ink-3">Never</span>) },
    { id: 'video', header: 'Video review', cell: (p) => <VideoState unlocked={p.video_unlocked} /> },
    { id: 'messages', header: 'Messages', align: 'right', cell: (p) => <Unread n={p.unread_messages} /> },
  ], [])

  const open = (id) => navigate(`/doctor/patients/${id}`)

  return (
    <div>
      <PageHeader
       
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
            action={<Button variant="outline" onClick={() => { setQuery(''); setParams({}, { replace: true }) }}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table: sortable columns, row selection and bulk actions */}
          <Card pad={false} className="hidden overflow-hidden md:block">
            <DataTable
              columns={columns}
              rows={rows}
              caption={`Patients on your panel, ${rows.length} shown`}
              onRowClick={(p) => open(p.id)}
              sort={{ id: sort, dir: sortDir }}
              onSortChange={(next) => { setSort(next?.id || 'risk'); setSortDir(next?.dir || 'asc') }}
              selectable
              minWidth={1000}
              bulkActions={(selected, clear) => (
                <>
                  <BulkButton icon={Download} onClick={() => { exportPatients(selected); clear() }}>Export CSV</BulkButton>
                  <BulkButton icon={Copy} onClick={() => copyEmails(selected)}>Copy emails</BulkButton>
                </>
              )}
            />
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

function exportPatients(list) {
  downloadCsv(
    `medoshield-patients-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Name', 'Email', 'Conditions', 'Latest risk', 'Motor index', 'Last check', 'Unread messages'],
    list.map((p) => [p.full_name, p.email, (p.conditions || []).join('; '), levelOf(p.latest_risk), motorOf(p.latest_risk) ?? '', p.latest_risk?.created_at || '', p.unread_messages || 0]),
  )
  toast.success(`Exported ${list.length} patient${list.length === 1 ? '' : 's'}`)
}

async function copyEmails(list) {
  const emails = list.map((p) => p.email).filter(Boolean)
  if (!emails.length) { toast.error('None of the selected patients has an email on file'); return }
  try {
    await navigator.clipboard.writeText(emails.join(', '))
    toast.success(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'}`)
  } catch {
    toast.error('Your browser blocked clipboard access')
  }
}
