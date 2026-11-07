import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate } from '../../../lib/utils'
import { AxisCaption, C, CURSOR, GRID, TICK, TipCard, useChartMotion } from '../../../components/charts/theme'

function ChartTip({ active, payload, unit, label: name }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return <TipCard title={fmtDate(p.payload.date, 'EEE, d MMM')} rows={[{ label: name, color: p.color || p.stroke || p.fill, value: `${p.value}${unit}` }]} />
}

function avg(rows, k) {
  const v = rows.map((r) => r[k]).filter((x) => x != null)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}

function Panel({ title, value, unit, hint, axis, children, summary }) {
  return (
    <figure className="card flex min-w-0 flex-col p-5">
      <figcaption>
        <p className="kicker">{title}</p>
        <p className="mt-1.5 flex items-baseline gap-1 leading-none"><span className="num text-[1.75rem] text-ink">{value ?? '—'}</span>{value != null && <span className="font-mono text-[0.8125rem] text-ink-3">{unit}</span>}</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-3">{hint}</p>
      </figcaption>
      <AxisCaption className="mt-4">{axis}</AxisCaption>
      <div className="mt-1 h-36 min-w-0" role="img" aria-label={summary}>{children}</div>
    </figure>
  )
}

const tick = (d) => fmtDate(d, 'd MMM')

export default function Charts({ records }) {
  const anim = useChartMotion()
  const rows = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-21)
  const common = { data: rows, margin: { top: 6, right: 6, left: -16, bottom: 0 } }
  const grid = <CartesianGrid {...GRID} />
  const x = <XAxis dataKey="date" tickFormatter={tick} tick={TICK} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={24} />
  const sleep = avg(rows, 'sleep_hours')
  const stress = avg(rows, 'stress_level')
  const walk = avg(rows, 'walking_distance')

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="Sleep · average" value={sleep} unit="h" hint="7–9 h is a healthy target" axis="Hours per night" summary={`Sleep over the last ${rows.length} logs, average ${sleep ?? 'unknown'} hours.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...common}>
            {grid}{x}
            <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[0, 'dataMax + 1']} allowDecimals={false} width={40} />
            <Tooltip content={<ChartTip unit=" h" label="Sleep" />} cursor={{ fill: C.cream, fillOpacity: 0.6 }} />
            <Bar dataKey="sleep_hours" fill={C.pine} radius={[3, 3, 0, 0]} maxBarSize={14} {...anim} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Stress · average" value={stress} unit="/10" hint="Lower is calmer" axis="Self-rated, 1–10" summary={`Stress over the last ${rows.length} logs, average ${stress ?? 'unknown'} out of 10.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...common}>
            {grid}{x}
            <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 10]} width={40} />
            <Tooltip content={<ChartTip unit="/10" label="Stress" />} cursor={CURSOR} />
            <Line type="monotone" dataKey="stress_level" stroke={C.ember} strokeWidth={2} dot={{ r: 2.5, fill: C.paper, stroke: C.ember, strokeWidth: 1.5 }} activeDot={{ r: 4 }} connectNulls {...anim} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Walking · average" value={walk} unit="km" hint="Every short walk counts" axis="Kilometres per day" summary={`Walking over the last ${rows.length} logs, average ${walk ?? 'unknown'} kilometres.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...common}>
            {grid}{x}
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
            <Tooltip content={<ChartTip unit=" km" label="Walking" />} cursor={CURSOR} />
            <Area type="monotone" dataKey="walking_distance" stroke={C.pine} strokeWidth={2} fill={C.pine} fillOpacity={0.06} connectNulls {...anim} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
