import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Skeleton } from './Feedback'

/**
 * Reusable table with column definitions, sortable headers, row selection and a bulk-action bar.
 *
 * columns: [{ id, header, cell: (row) => node, sortValue?: ((row) => string|number) | true,
 *             className?, headerClassName?, align?: 'left'|'right' }]
 * bulkActions: (selectedRows, clearSelection) => node   — shown in a bar while rows are selected
 *
 * Sorting is controlled internally unless `sort` + `onSortChange` are passed.
 */
export default function DataTable({
  columns, rows, getRowId = (r) => r.id, caption, onRowClick, selectable = false, bulkActions,
  loading = false, empty = null, minWidth = 760, sort: sortProp, onSortChange, className,
}) {
  const [sortState, setSortState] = useState(null)
  const sort = sortProp !== undefined ? sortProp : sortState
  const setSort = onSortChange || setSortState
  const [selected, setSelected] = useState(() => new Set())

  // Drop selections that are no longer visible (filters changed, rows removed).
  const ids = useMemo(() => rows.map(getRowId), [rows, getRowId])
  useEffect(() => {
    setSelected((s) => {
      const next = new Set([...s].filter((id) => ids.includes(id)))
      return next.size === s.size ? s : next
    })
  }, [ids])

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.id === sort.id)
    // `sortValue: true` marks a column sortable while the parent sorts the rows itself.
    if (typeof col?.sortValue !== 'function') return rows
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const va = col.sortValue(a), vb = col.sortValue(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir
    })
  }, [rows, sort, columns])

  const allChecked = rows.length > 0 && selected.size === rows.length
  const someChecked = selected.size > 0 && !allChecked
  const headerBox = useRef(null)
  useEffect(() => { if (headerBox.current) headerBox.current.indeterminate = someChecked }, [someChecked])

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(ids))
  const clear = () => setSelected(new Set())
  const selectedRows = rows.filter((r) => selected.has(getRowId(r)))

  const cycleSort = (col) => {
    if (!col.sortValue) return
    if (!sort || sort.id !== col.id) setSort({ id: col.id, dir: 'asc' })
    else if (sort.dir === 'asc') setSort({ id: col.id, dir: 'desc' })
    else setSort(null)
  }

  return (
    <div className={cn('relative', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.9375rem]" style={{ minWidth }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-line">
            <tr>
              {selectable && (
                <th scope="col" className="w-12 py-3 pl-6 pr-0">
                  <input ref={headerBox} type="checkbox" checked={allChecked} onChange={toggleAll} aria-label={allChecked ? 'Clear selection' : 'Select all rows'} className="h-4 w-4 cursor-pointer rounded" />
                </th>
              )}
              {columns.map((col, i) => {
                const active = sort?.id === col.id
                const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : col.sortValue ? 'none' : undefined}
                    className={cn('whitespace-nowrap px-3 py-3 text-left text-[0.8125rem] font-medium text-ink-3', i === 0 && !selectable && 'pl-6', i === columns.length - 1 && 'pr-6', col.align === 'right' && 'text-right', col.headerClassName)}
                  >
                    {col.sortValue ? (
                      <button type="button" onClick={() => cycleSort(col)} className={cn('-mx-1.5 inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 transition-colors hover:text-ink', active && 'text-ink')}>
                        {col.header}
                        <Icon aria-hidden className={cn('h-3.5 w-3.5', active ? 'text-teal-700' : 'text-ink-4')} strokeWidth={1.8} />
                      </button>
                    ) : col.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading
              ? Array.from({ length: 5 }).map((_, r) => (
                <tr key={r}>
                  {selectable && <td className="py-4 pl-6"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((c, i) => <td key={c.id} className={cn('px-3 py-4', i === 0 && !selectable && 'pl-6')}><Skeleton className={cn('h-4', i === 0 ? 'w-40' : 'w-20')} /></td>)}
                </tr>
              ))
              : sorted.map((row) => {
                const id = getRowId(row)
                const isSel = selected.has(id)
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    aria-selected={selectable ? isSel : undefined}
                    className={cn('group transition-colors duration-150', onRowClick && 'cursor-pointer', isSel ? 'bg-teal-50/60' : 'hover:bg-cream/50')}
                  >
                    {selectable && (
                      <td className="py-3 pl-6 pr-0" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggle(id)} aria-label={`Select ${row.full_name || row.name || 'row'}`} className="h-4 w-4 cursor-pointer rounded" />
                      </td>
                    )}
                    {columns.map((col, i) => (
                      <td key={col.id} className={cn('px-3 py-3', i === 0 && !selectable && 'pl-6', i === columns.length - 1 && 'pr-6', col.align === 'right' && 'text-right', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && empty}
      </div>

      <AnimatePresence>
        {selectable && selected.size > 0 && (
          <motion.div
            role="region"
            aria-label="Bulk actions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="sticky bottom-4 z-10 mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink px-4 py-2.5 text-paper shadow-float"
          >
            <p className="text-[0.9375rem]" aria-live="polite"><span className="num">{selected.size}</span> selected</p>
            <div className="ml-auto flex flex-wrap items-center gap-2">{bulkActions?.(selectedRows, clear)}</div>
            <button type="button" onClick={clear} className="grid h-9 w-9 place-items-center rounded-lg text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper" aria-label="Clear selection">
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Small light-on-dark button for use inside the bulk-action bar. */
export function BulkButton({ icon: Icon, children, ...rest }) {
  return (
    <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-paper/20 px-3 text-[0.875rem] font-medium text-paper transition-colors hover:bg-paper/10" {...rest}>
      {Icon && <Icon aria-hidden className="h-4 w-4" strokeWidth={1.8} />}
      {children}
    </button>
  )
}

/** Download rows as a CSV file (bulk export). Values are quoted; formulas are neutralised. */
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
