import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, ChevronDown, ClipboardList, Download, FileHeart, ScanLine, UserCheck, Video } from 'lucide-react'
import Button from '../../components/ui/Button'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { cn, fmtDate } from '../../lib/utils'
import { LevelPill, PointList, normLevel } from './shared'
import { StatusPill } from './reports'
import { usePdfDownload } from './video'

export const TYPES = {
  movement_check: { label: 'Movement checks', one: 'Movement check', short: 'Checks', icon: ScanLine },
  video_review: { label: 'Video reviews', one: 'AI video review', short: 'Videos', icon: Video },
  lab_report: { label: 'Lab reports', one: 'Lab report', short: 'Reports', icon: FileHeart },
  clinician_summary: { label: 'Clinician summaries', one: 'Clinician summary', short: 'Summaries', icon: ClipboardList },
  appointment: { label: 'Appointments', one: 'Appointment', short: 'Visits', icon: CalendarHeart },
}
export const typeOf = (t) => TYPES[t] || TYPES.movement_check

function Scores({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map(([label, v]) => (
        <div key={label} className="min-w-0">
          <dt className="kicker truncate">{label}</dt>
          <dd className="num mt-1 text-[1.25rem] text-ink">{v == null ? '—' : Math.round(v)}</dd>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream" aria-hidden><div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.max(0, Math.min(100, v || 0))}%` }} /></div>
        </div>
      ))}
    </dl>
  )
}

function Block({ label, children }) {
  return (
    <div>
      <p className="kicker mb-2">{label}</p>
      {children}
    </div>
  )
}

function Detail({ item }) {
  const d = item.detail || {}
  if (item.type === 'video_review') {
    return (
      <div className="space-y-5">
        <Scores items={[['Gait quality', d.gait_quality_score], ['Balance', d.balance_score], ['Stride consistency', d.stride_consistency], ['Fluidity', d.movement_fluidity]]} />
        {d.key_findings?.length > 0 && <Block label="Key findings"><PointList items={d.key_findings} /></Block>}
        {d.recommendations?.length > 0 && <Block label="Suggestions"><PointList items={d.recommendations} numbered /></Block>}
      </div>
    )
  }
  if (item.type === 'lab_report') {
    const flagged = (d.findings || []).filter((f) => f.status !== 'normal')
    return (
      <div className="space-y-5">
        {d.main_risk && <p className="text-[0.9375rem] text-ink-2"><span className="font-medium text-ink">Main thing to know: </span>{d.main_risk}</p>}
        {flagged.length > 0 && (
          <Block label="Outside the usual range">
            <ul className="divide-y divide-line">
              {flagged.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-[0.9375rem] text-ink-2">{f.test_name} <span className="num text-ink">{f.value}</span></span>
                  <StatusPill status={f.status} />
                </li>
              ))}
            </ul>
          </Block>
        )}
        {d.how_to_fix?.length > 0 && <Block label="What can help"><PointList items={d.how_to_fix} numbered /></Block>}
        {d.recommended_specialist && <p className="text-[0.9375rem] text-ink-3">Suggested specialist: <span className="font-medium text-ink">{d.recommended_specialist}</span></p>}
      </div>
    )
  }
  if (item.type === 'clinician_summary') {
    return (
      <div className="space-y-5">
        {d.key_findings?.length > 0 && <Block label="Key findings"><PointList items={d.key_findings} /></Block>}
        {d.recommendations?.length > 0 && <Block label="Recommendations"><PointList items={d.recommendations} numbered /></Block>}
      </div>
    )
  }
  return null
}

function tidyCheckSummary(s = '') {
  const rest = String(s).replace(/^Risk [^·]*·\s*/, '')
  return rest ? rest[0].toUpperCase() + rest.slice(1) : ''
}

function hasDetail(item) {
  const d = item.detail
  if (!d || typeof d !== 'object') return false
  return Object.values(d).some((v) => (Array.isArray(v) ? v.length : v != null && v !== ''))
}

export function TimelineItem({ item, index }) {
  const [open, setOpen] = useState(false)
  const { busy, download } = usePdfDownload()
  const t = typeOf(item.type)
  const expandable = hasDetail(item)
  const panelId = `tl-${item.type}-${item.id}`
  const summary = item.type === 'movement_check' ? tidyCheckSummary(item.summary) : item.summary
  const level = item.type === 'movement_check' ? <RiskBadge level={normLevel(item.level)} short />
    : item.type === 'lab_report' && item.level ? <LevelPill level={item.level} /> : null

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative"
    >
      <span aria-hidden className="absolute -left-[1.6rem] top-5 grid h-2.5 w-2.5 place-items-center rounded-full border-2 border-canvas bg-teal-700 sm:-left-[1.85rem]" />
      <div className={cn('card transition-shadow duration-200', open && 'shadow-lift')}>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-3">
                <t.icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden /> {t.one} · {fmtDate(item.created_at, 'HH:mm')}
              </p>
              <p className="mt-1 font-medium text-ink">{item.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {level}
              {item.type === 'video_review' && (item.reviewed ? <Badge tone="teal"><UserCheck className="h-3 w-3" strokeWidth={1.8} aria-hidden /> Reviewed</Badge> : <Badge tone="ink">Awaiting review</Badge>)}
            </div>
          </div>
          {summary && <p className={cn('mt-2 text-[0.9375rem] leading-relaxed text-ink-2', !open && 'line-clamp-2')}>{summary}</p>}
          {(expandable || (item.type === 'video_review' && item.has_pdf)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {expandable && (
                <Button variant="ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="-ml-3">
                  {open ? 'Hide details' : 'Show details'}
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} strokeWidth={1.8} aria-hidden />
                </Button>
              )}
              {item.type === 'video_review' && item.has_pdf && (
                <Button variant="outline" icon={Download} loading={busy === item.id} onClick={() => download(item.id)}>Download PDF</Button>
              )}
            </div>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div id={panelId} key="d" className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
              <div className="border-t border-line p-4 sm:p-5"><Detail item={item} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}
