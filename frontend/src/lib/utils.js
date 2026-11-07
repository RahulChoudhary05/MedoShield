import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns'

export const cn = (...a) => twMerge(clsx(a))

export const toDate = (v) => (v instanceof Date ? v : typeof v === 'string' ? parseISO(v) : v ? new Date(v) : null)

export function fmtDate(v, pattern = 'd MMM yyyy') {
  const d = toDate(v)
  return d && !isNaN(d) ? format(d, pattern) : '—'
}

export function fmtRelative(v) {
  const d = toDate(v)
  if (!d || isNaN(d)) return '—'
  const diff = Date.now() - d.getTime()
  if (diff < 45_000 && diff > -45_000) return 'just now'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

export function fmtDay(v) {
  const d = toDate(v)
  if (!d || isNaN(d)) return ''
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, d MMM')
}

export const pct = (v, digits = 0) => (v == null || isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`)
export const num = (v, digits = 0) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(digits))
export const initials = (name = '') => name.replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'M'

export function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const RISK = {
  LOW: { label: 'Low risk', short: 'Low', tone: 'teal', color: '#3F6D56', bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-200' },
  MEDIUM: { label: 'Watch closely', short: 'Medium', tone: 'butter', color: '#B8963A', bg: 'bg-butter-50', text: 'text-[#6E5716]', ring: 'ring-butter-200' },
  HIGH: { label: 'Needs review', short: 'High', tone: 'rose', color: '#AF4A39', bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
  CALIBRATING: { label: 'Calibrating', short: 'Learning', tone: 'lilac', color: '#7A7064', bg: 'bg-lilac-50', text: 'text-lilac-600', ring: 'ring-lilac-200' },
  UNKNOWN: { label: 'No data yet', short: '—', tone: 'ink', color: '#8F887D', bg: 'bg-cream', text: 'text-ink-3', ring: 'ring-line' },
}
export const riskOf = (level) => RISK[level === 'BASELINE_LEARNING' ? 'CALIBRATING' : level] || RISK.UNKNOWN

export const LAB_RISK = {
  Low: RISK.LOW, Normal: RISK.LOW, Medium: RISK.MEDIUM, High: RISK.HIGH, Critical: RISK.HIGH,
}

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const d = err?.response?.data
  if (!d) return err?.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : fallback
  if (typeof d.detail === 'string') return d.detail
  if (d.detail?.message) return d.detail.message
  if (Array.isArray(d.detail)) return d.detail[0]?.msg || fallback
  return fallback
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
