import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BedDouble, Brain, Footprints, HeartPulse } from 'lucide-react'
import { api } from '../../../lib/api'
import { fmtDate, num } from '../../../lib/utils'
import { Card, CardHeader } from '../../../components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { TableScroll, Th } from '../shared'

const AXIS = { tick: { fill: '#A39B8E', fontSize: 11 }, axisLine: false, tickLine: false }

function Tip({ active, payload, unit, label: name }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-xl border border-line bg-paper/95 px-3 py-2 text-xs shadow-lift backdrop-blur">
      <p className="font-medium text-ink">{fmtDate(p.payload.date, 'EEE d MMM')}</p>
      <p className="mt-0.5 text-ink-3">{name}: <span className="num font-semibold text-ink">{num(p.value, 1)}{unit}</span></p>
    </div>
  )
}

function MiniChart({ data, dataKey, color, unit, label, kind = 'bar', domain }) {
  const points = data.filter((d) => d[dataKey] != null)
  if (points.length < 2) return <p className="grid h-40 place-items-center rounded-2xl bg-cream text-center text-sm text-ink-4">Not enough entries yet</p>
  return (
    <div className="h-40 -ml-3">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={points} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={22} {...AXIS} />
            <YAxis width={30} domain={domain} {...AXIS} />
            <Tooltip content={<Tip unit={unit} label={label} />} cursor={{ fill: 'rgba(47,93,80,.05)' }} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={900} />
          </BarChart>
        ) : (
          <AreaChart data={points} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={22} {...AXIS} />
            <YAxis width={30} domain={domain} {...AXIS} />
            <Tooltip content={<Tip unit={unit} label={label} />} cursor={{ stroke: '#D9CFBF', strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#fill-${dataKey})`} dot={{ r: 3, fill: '#fff', stroke: color, strokeWidth: 2 }} activeDot={{ r: 5 }} animationDuration={900} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

const avg = (rows, k) => {
  const v = rows.map((r) => r[k]).filter((x) => x != null)
  return v.length ? v.reduce((s, x) => s + Number(x), 0) / v.length : null
}

export default function LifestyleTab({ patientId }) {
  const q = useQuery({ queryKey: ['doctor', 'fitness', patientId], queryFn: () => api.fitness.records(patientId) })
  const records = useMemo(() => q.data?.records ?? [], [q.data])
  const asc = useMemo(() => [...records].slice(0, 30).reverse(), [records])

  if (q.isLoading) return <div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60 rounded-3xl" />)}</div>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!records.length) return <Card><EmptyState icon={HeartPulse} tone="teal" title="No wellbeing logs yet" text="Sleep, stress, walking and heart-rate entries the patient logs will be charted here." /></Card>

  const charts = [
    { key: 'sleep_hours', label: 'Sleep', unit: ' h', color: '#8FB3A2', icon: BedDouble, tone: 'teal', kind: 'bar' },
    { key: 'stress_level', label: 'Stress', unit: '/10', color: '#C8704E', icon: Brain, tone: 'apricot', kind: 'area', domain: [0, 10] },
    { key: 'walking_distance', label: 'Walking', unit: ' km', color: '#2F5D50', icon: Footprints, tone: 'teal', kind: 'bar' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        {charts.map((c) => {
          const a = avg(asc, c.key)
          return (
            <Card key={c.key}>
              <CardHeader icon={c.icon} tone={c.tone} title={c.label} subtitle={a == null ? 'No entries' : `Avg ${num(a, 1)}${c.unit} · last ${asc.length} days`} />
              <MiniChart data={asc} dataKey={c.key} color={c.color} unit={c.unit} label={c.label} kind={c.kind} domain={c.domain} />
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader icon={HeartPulse} tone="teal" title="Daily log" subtitle={`${records.length} entries, newest first`} />
        <TableScroll>
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-line/70">
              <tr><Th className="pl-0">Date</Th><Th>Sleep</Th><Th>Stress</Th><Th>Walking</Th><Th>Heart rate</Th><Th>Weight</Th><Th className="pr-0">Notes</Th></tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {records.map((r) => (
                <tr key={r.id || r.date} className="transition-colors hover:bg-cream/70">
                  <td className="whitespace-nowrap py-2.5 pl-0 pr-3 font-medium text-ink">{fmtDate(r.date, 'EEE, d MMM')}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.sleep_hours != null ? `${num(r.sleep_hours, 1)} h` : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.stress_level != null ? `${r.stress_level}/10` : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.walking_distance != null ? `${num(r.walking_distance, 1)} km` : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.heart_rate != null ? `${r.heart_rate} bpm` : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.weight_kg != null ? `${num(r.weight_kg, 1)} kg` : '—'}</td>
                  <td className="max-w-[16rem] truncate py-2.5 pl-3 pr-0 text-xs text-ink-3" title={r.notes || ''}>{r.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  )
}
