import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarHeart, ChevronDown, ClipboardList, Download, FileHeart, ScanLine, UserCheck, Video } from 'lucide-react'
import Button from '../../components/ui/Button'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { ScoreBar } from '../../components/ui/Data'
import { cn, fmtDate } from '../../lib/utils'
import { LevelPill, PointList, normLevel } from './shared'
import { StatusPill } from './reports'
import { usePdfDownload } from './video'

export const TYPES = {
  movement_check: { label: 'Movement checks', one: 'Movement check', short: 'Checks', icon: ScanLine, dot: 'bg-teal-500', soft: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  video_review: { label: 'Video reviews', one: 'AI video review', short: 'Videos', icon: Video, dot: 'bg-teal-500', soft: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  lab_report: { label: 'Lab reports', one: 'Lab report', short: 'Reports', icon: FileHeart, dot: 'bg-teal-500', soft: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  clinician_summary: { label: 'Clinician summaries', one: 'Clinician summary', short: 'Summaries', icon: ClipboardList, dot: 'bg-teal-500', soft: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
  appointment: { label: 'Appointments', one: 'Appointment', short: 'Visits', icon: CalendarHeart, dot: 'bg-teal-500', soft: 'icon-tile bg-cream text-teal-700 shadow-none ring-1 ring-inset ring-line/70' },
}
export const typeOf = (t) => TYPES[t] || TYPES.movement_check

function Detail({ item }) {
  const d = item.detail || {}
  if (item.type === 'video_review') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreBar label="Gait quality" value={d.gait_quality_score} />
          <ScoreBar label="Balance" value={d.balance_score} />
          <ScoreBar label="Stride consistency" value={d.stride_consistency} />
          <ScoreBar label="Movement fluidity" value={d.movement_fluidity} />
        </div>
        {d.key_findings?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Key findings</p><PointList items={d.key_findings} tone="teal" /></div>}
        {d.recommendations?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Suggestions</p><PointList items={d.recommendations} numbered tone="teal" /></div>}
      </div>
    )
  }
  if (item.type === 'lab_report') {
    const flagged = (d.findings || []).filter((f) => f.status !== 'normal')
    return (
      <div className="space-y-4">
        {d.main_risk && <p className="text-sm text-ink-2"><span className="font-medium text-ink">Main thing to know: </span>{d.main_risk}</p>}
        {flagged.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Outside the usual range</p>
            <ul className="space-y-1.5">
              {flagged.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-ink-2">{f.test_name} <span className="num font-semibold text-ink">{f.value}</span></span>
                  <StatusPill status={f.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.how_to_fix?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">What can help</p><PointList items={d.how_to_fix} numbered /></div>}
        {d.recommended_specialist && <p className="text-sm text-ink-3">Suggested specialist: <span className="font-medium text-ink">{d.recommended_specialist}</span></p>}
      </div>
    )
  }
  if (item.type === 'clinician_summary') {
    return (
      <div className="space-y-4">
        {d.key_findings?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Key findings</p><PointList items={d.key_findings} tone="teal" /></div>}
        {d.recommendations?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-ink-4">Recommendations</p><PointList items={d.recommendations} numbered tone="teal" /></div>}
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
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04 }}
      className="relative pl-12 sm:pl-14"
    >
      <span className={cn('absolute left-0 top-3 grid h-9 w-9 place-items-center rounded-xl ring-4 ring-canvas sm:left-0.5', t.soft)}>
        <t.icon className="h-[18px] w-[18px]" />
      </span>
      <div className={cn('card transition-shadow hover:shadow-lift', open && 'shadow-lift')}>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-4">{fmtDate(item.created_at, 'HH:mm')} · {t.one}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {level}
              {item.type === 'video_review' && (item.reviewed ? <Badge tone="teal"><UserCheck className="h-3 w-3" /> Reviewed</Badge> : <Badge tone="ink">Awaiting review</Badge>)}
            </div>
          </div>
          {summary && <p className={cn('mt-2 text-sm leading-relaxed text-ink-2', !open && 'line-clamp-2')}>{summary}</p>}
          {(expandable || (item.type === 'video_review' && item.has_pdf)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {expandable && (
                <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="-ml-2">
                  {open ? 'Hide details' : 'Show details'}
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} />
                </Button>
              )}
              {item.type === 'video_review' && item.has_pdf && (
                <Button variant="outline" size="sm" icon={Download} loading={busy === item.id} onClick={() => download(item.id)}>PDF</Button>
              )}
            </div>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div id={panelId} key="d" className="overflow-hidden rounded-b-3xl" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}>
              <div className="border-t border-line/70 bg-cream/60 p-4 sm:p-5"><Detail item={item} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}
