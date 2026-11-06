import { Area, AreaChart, CartesianGrid, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate } from '../../lib/utils'

const SERIES = {
  motor_index: { label: 'Motor index', color: '#3A6652', fmt: (v) => Math.round(v) },
  tremor_index: { label: 'Tremor', color: '#C06D48', fmt: (v) => `${Math.round(v * 100)}%`, scale: 100 },
  gait_symmetry: { label: 'Symmetry', color: '#9DBDA9', fmt: (v) => `${Math.round(v * 100)}%`, scale: 100 },
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-2xl border border-line bg-paper/95 px-3.5 py-2.5 text-xs shadow-lift backdrop-blur">
      <p className="mb-1.5 font-medium text-ink">{fmtDate(label, 'EEE d MMM, HH:mm')}</p>
      {Object.entries(SERIES).map(([k, s]) =>
        p[k] != null ? (
          <p key={k} className="flex items-center justify-between gap-6 text-ink-3">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
            <span className="num font-medium text-ink">{s.fmt(p[k])}</span>
          </p>
        ) : null,
      )}
      {p.risk_level && p.risk_level !== 'UNKNOWN' && <p className="mt-1.5 border-t border-line pt-1.5 text-ink-3">Risk: <span className="font-medium text-ink">{p.risk_level.toLowerCase()}</span></p>}
    </div>
  )
}

/**
 * points: [{date, motor_index (0-100), tremor_index (0-1), gait_symmetry (0-1), risk_level}]
 * show: which secondary series to overlay
 */
export default function MotorTrendChart({ points = [], height = 260, show = ['tremor_index'] }) {
  const data = points
    .filter((p) => p.date)
    .map((p) => ({ ...p, t: new Date(p.date).getTime(), tremor_scaled: p.tremor_index != null ? p.tremor_index * 100 : null, sym_scaled: p.gait_symmetry != null ? p.gait_symmetry * 100 : null }))
  return (
    <div style={{ height }} className="-ml-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mi-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3A6652" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3A6652" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ReferenceArea y1={0} y2={40} fill="#B8513F" fillOpacity={0.04} />
          <ReferenceArea y1={40} y2={65} fill="#C9A845" fillOpacity={0.04} />
          <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t) => fmtDate(t, 'd MMM')} tick={{ fill: '#A39B8E', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fill: '#A39B8E', fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
          <Tooltip content={<Tip />} cursor={{ stroke: '#D9CFBF', strokeDasharray: '4 4' }} labelFormatter={(t) => t} />
          <Area type="monotone" dataKey="motor_index" stroke="#3A6652" strokeWidth={2.5} fill="url(#mi-fill)" dot={{ r: 3, fill: '#fff', stroke: '#3A6652', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls animationDuration={1200} />
          {show.includes('tremor_index') && <Line type="monotone" dataKey="tremor_scaled" stroke="#C06D48" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />}
          {show.includes('gait_symmetry') && <Line type="monotone" dataKey="sym_scaled" stroke="#9DBDA9" strokeWidth={2} dot={false} connectNulls />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ show = ['tremor_index'] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-3">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Motor index (higher is better)</span>
      {show.includes('tremor_index') && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-apricot-500" /> Tremor strength</span>}
      {show.includes('gait_symmetry') && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-teal-300" /> Symmetry</span>}
    </div>
  )
}
