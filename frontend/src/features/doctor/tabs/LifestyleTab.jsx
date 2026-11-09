import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BedDouble, Brain, Footprints, HeartPulse } from 'lucide-react'
import { api } from '../../../lib/api'
import { fmtDate, num } from '../../../lib/utils'
import { Card } from '../../../components/ui/Card'
import { CHART } from '../../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { AXIS, DateTip, GRID, Head, TableScroll, Th } from '../shared'

function MiniChart({ data, dataKey, color, unit, axisUnit, label, kind = 'bar', domain }) {
  const points = data.filter((d) => d[dataKey] != null)
  if (points.length < 2) return <p className="grid h-44 place-items-center rounded-xl bg-cream/70 text-center text-[0.9375rem] text-ink-3">Not enough entries yet</p>
  const avg = points.reduce((s, d) => s + Number(d[dataKey]), 0) / points.length
  return (
    <figure className="-ml-2 h-44" aria-label={`${label} over the last ${points.length} logged days, average ${num(avg, 1)}${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={points} margin={{ top: 18, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={28} {...AXIS} />
            <YAxis width={40} domain={domain} {...AXIS} axisLine={false} label={{ value: axisUnit, position: 'top', offset: 8, dx: 8, fill: CHART.stone, fontSize: 13 }} />
            <Tooltip content={<DateTip unit={unit} label={label} />} cursor={{ fill: 'rgba(11,21,38,.04)' }} />
            <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={16} animationDuration={800} />
          </BarChart>
        ) : (
          <AreaChart data={points} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={28} {...AXIS} />
            <YAxis width={40} domain={domain} {...AXIS} axisLine={false} label={{ value: axisUnit, position: 'top', offset: 8, dx: 8, fill: CHART.stone, fontSize: 13 }} />
            <Tooltip content={<DateTip unit={unit} label={label} />} cursor={{ stroke: CHART.stone, strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.75} fill={color} fillOpacity={0.08} dot={false} activeDot={{ r: 4, fill: color, stroke: '#FFFFFF', strokeWidth: 2 }} animationDuration={800} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </figure>
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

  if (q.isLoading) return <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60 rounded-3xl" />)}</div>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (!records.length) return <Card><EmptyState icon={HeartPulse} tone="teal" headingLevel={2} title="No wellbeing logs yet" text="Sleep, stress, walking and heart-rate entries the patient logs will be charted here." /></Card>

  const charts = [
    { key: 'sleep_hours', label: 'Sleep', unit: ' h', axisUnit: 'hours', color: CHART.pine2, icon: BedDouble, kind: 'bar' },
    { key: 'stress_level', label: 'Stress', unit: '/10', axisUnit: 'of 10', color: CHART.ember, icon: Brain, kind: 'area', domain: [0, 10] },
    { key: 'walking_distance', label: 'Walking', unit: ' km', axisUnit: 'km', color: CHART.pine, icon: Footprints, kind: 'bar' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {charts.map((c) => {
          const a = avg(asc, c.key)
          return (
            <Card key={c.key}>
              <Head icon={c.icon} title={c.label} subtitle={a == null ? 'No entries' : `Avg ${num(a, 1)}${c.unit} · last ${asc.length} days`} className="mb-3" />
              <MiniChart data={asc} dataKey={c.key} color={c.color} unit={c.unit} axisUnit={c.axisUnit} label={c.label} kind={c.kind} domain={c.domain} />
            </Card>
          )
        })}
      </div>

      <Card>
        <Head title="Daily log" subtitle={`${records.length} entries, newest first`} />
        <TableScroll>
          <table className="w-full min-w-[680px] text-[0.9375rem]">
            <caption className="sr-only">Daily wellbeing log</caption>
            <thead className="border-b border-line">
              <tr><Th className="pl-0">Date</Th><Th>Sleep (h)</Th><Th>Stress (/10)</Th><Th>Walking (km)</Th><Th>Heart rate (bpm)</Th><Th>Weight (kg)</Th><Th className="pr-0">Notes</Th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {records.map((r) => (
                <tr key={r.id || r.date} className="transition-colors duration-150 hover:bg-cream/50">
                  <th scope="row" className="whitespace-nowrap py-2.5 pl-0 pr-3 text-left font-medium text-ink">{fmtDate(r.date, 'EEE, d MMM')}</th>
                  <td className="num px-3 py-2.5 text-ink-2">{r.sleep_hours != null ? num(r.sleep_hours, 1) : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.stress_level != null ? r.stress_level : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.walking_distance != null ? num(r.walking_distance, 1) : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.heart_rate != null ? r.heart_rate : '—'}</td>
                  <td className="num px-3 py-2.5 text-ink-2">{r.weight_kg != null ? num(r.weight_kg, 1) : '—'}</td>
                  <td className="max-w-[16rem] truncate py-2.5 pl-3 pr-0 text-[0.875rem] text-ink-3" title={r.notes || ''}>{r.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  )
}
