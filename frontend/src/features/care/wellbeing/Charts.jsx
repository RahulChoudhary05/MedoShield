import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Footprints, Gauge, Moon } from 'lucide-react'
import { cn, fmtDate } from '../../../lib/utils'

const AXIS = { fontSize: 11, fill: '#B9AE9F' }

function ChartTip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lift">
      <p className="text-ink-4">{fmtDate(p.payload.date, 'EEE, d MMM')}</p>
      <p className="num mt-0.5 text-sm font-semibold text-ink">{p.value}{unit}</p>
    </div>
  )
}

function avg(rows, k) {
  const v = rows.map((r) => r[k]).filter((x) => x != null)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}

function Panel({ icon: Icon, title, value, unit, tone, hint, children }) {
  const tones = { teal: 'icon-teal shadow-glow', apricot: 'icon-teal shadow-soft', sky: 'icon-teal' }
  return (
    <div className="card card-pad card-glow flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-3">{title}</p>
          <p className="mt-1 text-[1.75rem] font-semibold leading-none text-ink"><span className="num">{value ?? '—'}</span>{value != null && <span className="ml-1 text-sm font-medium text-ink-4">{unit}</span>}</p>
          <p className="mt-1 text-xs text-ink-4">{hint}</p>
        </div>
        <span className={cn('icon-tile h-10 w-10 rounded-xl', tones[tone])}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-4 h-36 min-w-0">{children}</div>
    </div>
  )
}

const tick = (d) => fmtDate(d, 'd MMM')

export default function Charts({ records }) {
  const rows = [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-21)
  const common = { data: rows, margin: { top: 6, right: 4, left: -22, bottom: 0 } }
  const grid = <CartesianGrid vertical={false} stroke="#F0E9DD" strokeDasharray="3 4" />
  const x = <XAxis dataKey="date" tickFormatter={tick} tick={AXIS} axisLine={false} tickLine={false} minTickGap={18} />

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel icon={Moon} title="Sleep" value={avg(rows, 'sleep_hours')} unit="h avg" tone="teal" hint="7–9 h is a healthy target">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...common}>
            <defs>
              <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2F5D50" />
                <stop offset="1" stopColor="#2F5D50" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            {grid}{x}
            <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 'dataMax + 1']} allowDecimals={false} />
            <Tooltip content={<ChartTip unit=" h" />} cursor={{ fill: 'rgba(47,93,80,.06)' }} />
            <Bar dataKey="sleep_hours" fill="url(#sleepFill)" radius={[6, 6, 2, 2]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel icon={Gauge} title="Stress" value={avg(rows, 'stress_level')} unit="/10 avg" tone="teal" hint="Lower is calmer">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...common}>
            {grid}{x}
            <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 10]} />
            <Tooltip content={<ChartTip unit="/10" />} cursor={{ stroke: '#B9AE9F' }} />
            <Line type="monotone" dataKey="stress_level" stroke="#C8704E" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel icon={Footprints} title="Walking" value={avg(rows, 'walking_distance')} unit="km avg" tone="teal" hint="Every short walk counts">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...common}>
            <defs>
              <linearGradient id="walkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8FB3A2" stopOpacity={0.45} />
                <stop offset="1" stopColor="#8FB3A2" stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}{x}
            <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip unit=" km" />} cursor={{ stroke: '#B9AE9F' }} />
            <Area type="monotone" dataKey="walking_distance" stroke="#2F5D50" strokeWidth={2.5} fill="url(#walkFill)" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
