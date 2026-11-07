import { Area, ComposedChart, CartesianGrid, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate } from '../../lib/utils'
import { AxisCaption, C, CURSOR, GRID, TICK, TipCard, useChartMotion } from './theme'

const SERIES = {
  motor_index: { label: 'Motor index', color: C.pine, fmt: (v) => `${Math.round(v)}/100` },
  tremor_index: { label: 'Tremor strength', color: C.ember, fmt: (v) => `${Math.round(v * 100)}%` },
  gait_symmetry: { label: 'Gait symmetry', color: C.stone, fmt: (v) => `${Math.round(v * 100)}%` },
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const rows = Object.entries(SERIES)
    .filter(([k]) => p[k] != null)
    .map(([k, s]) => ({ label: s.label, color: s.color, value: s.fmt(p[k]) }))
  const risk = p.risk_level && p.risk_level !== 'UNKNOWN' ? `Risk: ${String(p.risk_level).toLowerCase()}` : null
  return <TipCard title={fmtDate(label, 'EEE d MMM, HH:mm')} rows={rows} foot={risk} />
}

/**
 * points: [{date, motor_index (0-100), tremor_index (0-1), gait_symmetry (0-1), risk_level}]
 * show: which secondary series to overlay
 */
export default function MotorTrendChart({ points = [], height = 260, show = ['tremor_index'] }) {
  const anim = useChartMotion(1100)
  const data = points
    .filter((p) => p.date)
    .map((p) => ({
      ...p,
      t: new Date(p.date).getTime(),
      tremor_scaled: p.tremor_index != null ? p.tremor_index * 100 : null,
      sym_scaled: p.gait_symmetry != null ? p.gait_symmetry * 100 : null,
    }))
  const summary = data.length
    ? `Motor index trend, ${data.length} checks from ${fmtDate(data[0].t, 'd MMM')} to ${fmtDate(data[data.length - 1].t, 'd MMM')}. Latest ${Math.round(data[data.length - 1].motor_index ?? 0)} out of 100.`
    : 'No trend data yet.'
  return (
    <figure className="min-w-0">
      <AxisCaption className="mb-2">Score, 0–100{show.length ? ' · tremor and symmetry as %' : ''}</AxisCaption>
      <div style={{ height }} className="-ml-2" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <ReferenceArea y1={0} y2={40} fill={C.rose} fillOpacity={0.035} ifOverflow="hidden" />
            <ReferenceArea y1={40} y2={65} fill={C.butter} fillOpacity={0.04} ifOverflow="hidden" />
            <CartesianGrid {...GRID} />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t) => fmtDate(t, 'd MMM')} tick={TICK} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={32} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={TICK} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<Tip />} cursor={CURSOR} />
            <Area type="monotone" dataKey="motor_index" stroke={C.pine} strokeWidth={2.25} fill={C.pine} fillOpacity={0.05}
              dot={{ r: 3, fill: C.paper, stroke: C.pine, strokeWidth: 1.75 }} activeDot={{ r: 5, fill: C.pine, stroke: C.paper, strokeWidth: 2 }} connectNulls {...anim} />
            {show.includes('tremor_index') && <Line type="monotone" dataKey="tremor_scaled" stroke={C.ember} strokeWidth={1.75} strokeDasharray="5 5" dot={false} connectNulls {...anim} animationBegin={250} />}
            {show.includes('gait_symmetry') && <Line type="monotone" dataKey="sym_scaled" stroke={C.stone} strokeWidth={1.75} dot={false} connectNulls {...anim} animationBegin={350} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function ChartLegend({ show = ['tremor_index'] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-ink-3" aria-label="Chart legend">
      <li className="flex items-center gap-2"><span className="h-0.5 w-5 rounded-full bg-teal-700" /> Motor index (higher is steadier)</li>
      {show.includes('tremor_index') && <li className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-apricot-500" /> Tremor strength</li>}
      {show.includes('gait_symmetry') && <li className="flex items-center gap-2"><span className="h-0.5 w-5 rounded-full bg-lilac-400" /> Gait symmetry</li>}
      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-butter-50 ring-1 ring-inset ring-butter-100" /> Watch band 40–65</li>
    </ul>
  )
}
