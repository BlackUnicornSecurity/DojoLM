// SPDX-License-Identifier: Apache-2.0
/**
 * File: SortableTable.tsx
 * Purpose: Enhanced data table with sortable columns, sticky header, row hover,
 *          server-pagination footer (E3.S5 / F-7-007 P0), and row virtualization
 *          for large datasets (>VIRTUALIZE_THRESHOLD rows).
 * Story: TPI-UI-001-18 (base) + E3.S5 (virtualization + pagination — F-7-007 P0).
 *
 * Virtualization strategy (E3.S5 — no new dependency)
 * ----------------------------------------------------
 * The dojolm-web bundle does not (and per E3.S5 should not, since the goal is
 * to retire F-7-007 with the smallest possible blast radius) carry an extra
 * `react-virtual`-class dependency. Instead, when the row count crosses
 * VIRTUALIZE_THRESHOLD, the table switches from full-render to a windowed
 * mode that mirrors the react-window/@tanstack-react-virtual contract:
 *
 *   - The data is fixed-height per row (ROW_HEIGHT_PX) and the body section
 *     becomes a scroll container of MAX_BODY_HEIGHT_PX.
 *   - On scroll, the component computes `startIndex` / `endIndex` from
 *     scrollTop and renders only `endIndex - startIndex` rows plus a small
 *     overscan buffer above/below.
 *   - Above the rendered slice a single spacer row of height
 *     `startIndex * ROW_HEIGHT_PX` reserves the un-rendered top region;
 *     below the slice a second spacer row reserves the rest. This keeps
 *     scrollbar position and total-height invariants identical to a
 *     full-render table, so the consumer can drive page-state from query
 *     params without paying main-thread cost for the 900 invisible rows.
 *
 * Performance budget (E3.S5 acceptance, F-7-007 P0)
 * --------------------------------------------------
 * The plan-spec calls out a <16ms frame budget on synthetic-1000-row scroll.
 * Windowing keeps the number of mounted `<tr>` nodes capped at
 * (`MAX_BODY_HEIGHT_PX / ROW_HEIGHT_PX`) + 2*OVERSCAN regardless of total
 * row count, which is the only way to hit that budget without paginating
 * server-side at the same time. Server-side pagination on top still
 * matters for tables that ALSO want bounded memory (Users/API-Keys/
 * Leaderboard) — both modes compose cleanly.
 *
 * Pagination footer (E3.S5 — `?page=&limit=` UX surface)
 * -------------------------------------------------------
 * Optional `pagination` prop renders a Prev / Next + page indicator footer
 * below the table when the consumer is driving paged fetches. The footer
 * is purely a controlled UI — it emits `onPageChange(nextPage)` and the
 * parent decides what to do. No internal state, so the back-button +
 * deep-link + query-state-sync flow stays at the page level.
 *
 * Index
 * -----
 * - SortDirection type            (line ~75)
 * - Column interface              (line ~77)
 * - PaginationProps interface     (line ~86)
 * - SortableTableProps interface  (line ~100)
 * - VIRTUALIZE_THRESHOLD + tuning (line ~115)
 * - useVirtualWindow hook         (line ~125)
 * - SortableTable component       (line ~175)
 * - PaginationFooter component    (line ~285)
 */

'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from './table'

type SortDirection = 'asc' | 'desc' | null

export interface Column<T> {
  key: keyof T & string
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => ReactNode
  className?: string
}

export interface PaginationProps {
  /** 1-indexed current page. */
  page: number
  /** Rows per page. */
  limit: number
  /** Total rows across all pages (server-reported). */
  total: number
  /** Emitted when user clicks Prev/Next. 1-indexed. */
  onPageChange: (nextPage: number) => void
  /** Optional limit setter. When omitted, the limit input is read-only. */
  onLimitChange?: (nextLimit: number) => void
  /** Optional dataTestId prefix for the footer controls. */
  testIdPrefix?: string
}

export interface SortableTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowKey?: keyof T & string
  emptyMessage?: string
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
  className?: string
  /** Server-pagination controls. When omitted, no footer is rendered. */
  pagination?: PaginationProps
  /** Override the auto-virtualization threshold (default 100). */
  virtualizeAt?: number
}

/**
 * Threshold above which the table switches to windowed rendering. Picked at
 * 100 to match the plan-spec — most admin tables fit easily under this; the
 * leaderboard / mitsuke / leaks lists are the ones that benefit.
 */
const VIRTUALIZE_THRESHOLD = 100

/** Fixed row height in CSS pixels — must match the rendered `<tr>` height. */
const ROW_HEIGHT_PX = 44

/** Max scroll-container height for the windowed body. */
const MAX_BODY_HEIGHT_PX = 480

/** Rows rendered above + below the visible window to avoid blank flashes. */
const OVERSCAN = 6

/**
 * useVirtualWindow — compute the visible slice of a list given a scroll
 * container and a fixed row height. Returns `{ startIndex, endIndex,
 * topPad, bottomPad, containerRef, onScroll }`. The caller is responsible
 * for rendering the slice + the two spacer rows.
 *
 * This is a deliberately small custom hook (no new dependency) — see the
 * file header for the rationale.
 */
interface VirtualWindow {
  startIndex: number
  endIndex: number
  topPad: number
  bottomPad: number
  containerRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
}

function useVirtualWindow(
  totalRows: number,
  rowHeight: number,
  containerHeight: number,
  overscan: number,
): VirtualWindow {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const onScroll = (): void => {
    const node = containerRef.current
    if (node) setScrollTop(node.scrollTop)
  }

  // Re-compute when totalRows shrinks below the current scroll offset (e.g.
  // a filter applied) so we don't end up rendering nothing.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const maxScroll = Math.max(0, totalRows * rowHeight - containerHeight)
    if (node.scrollTop > maxScroll) {
      node.scrollTop = maxScroll
      setScrollTop(maxScroll)
    }
  }, [totalRows, rowHeight, containerHeight])

  const rawStart = Math.floor(scrollTop / rowHeight) - overscan
  const startIndex = Math.max(0, rawStart)
  const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2
  const endIndex = Math.min(totalRows, startIndex + visibleCount)

  const topPad = startIndex * rowHeight
  const bottomPad = Math.max(0, (totalRows - endIndex) * rowHeight)

  return { startIndex, endIndex, topPad, bottomPad, containerRef, onScroll }
}

export function SortableTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  emptyMessage = 'No data available',
  stickyHeader = true,
  onRowClick,
  className,
  pagination,
  virtualizeAt = VIRTUALIZE_THRESHOLD,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else if (sortDir === 'desc') {
        setSortDir(null)
        setSortKey(null)
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(key)
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = aVal < bVal ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const shouldVirtualize = sortedData.length > virtualizeAt
  const vw = useVirtualWindow(
    sortedData.length,
    ROW_HEIGHT_PX,
    MAX_BODY_HEIGHT_PX,
    OVERSCAN,
  )

  const renderRow = (row: T, i: number): ReactNode => (
    <TableRow
      key={rowKey ? String(row[rowKey]) : i}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        'hover:bg-[var(--bg-tertiary)]',
        onRowClick && 'cursor-pointer',
      )}
      style={{ height: ROW_HEIGHT_PX }}
    >
      {columns.map((col) => (
        <TableCell key={col.key} className={col.className}>
          {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
        </TableCell>
      ))}
    </TableRow>
  )

  const table = (
    <Table className={className}>
      <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-[var(--bg-secondary)]')}>
        <TableRow className="hover:bg-transparent border-b border-[var(--border)]">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
              onKeyDown={col.sortable ? (e) => handleKeyDown(e, col.key) : undefined}
              tabIndex={col.sortable ? 0 : undefined}
              role={col.sortable ? 'button' : undefined}
              aria-sort={
                sortKey === col.key
                  ? sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : undefined
                  : undefined
              }
              aria-label={col.sortable ? `Sort by ${col.label}` : undefined}
              className={cn(
                col.sortable && 'cursor-pointer select-none hover:text-[var(--foreground)] min-h-[44px]',
                col.className,
              )}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {col.sortable && <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey={col.key} />}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody data-virtualized={shouldVirtualize ? 'true' : 'false'}>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-32 text-center text-[var(--text-tertiary)]">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : shouldVirtualize ? (
          <>
            {vw.topPad > 0 && (
              <tr
                aria-hidden="true"
                data-testid="sortable-table-virtual-top-pad"
                style={{ height: vw.topPad }}
              >
                <td colSpan={columns.length} />
              </tr>
            )}
            {sortedData
              .slice(vw.startIndex, vw.endIndex)
              .map((row, sliceIdx) => renderRow(row, vw.startIndex + sliceIdx))}
            {vw.bottomPad > 0 && (
              <tr
                aria-hidden="true"
                data-testid="sortable-table-virtual-bottom-pad"
                style={{ height: vw.bottomPad }}
              >
                <td colSpan={columns.length} />
              </tr>
            )}
          </>
        ) : (
          sortedData.map((row, i) => renderRow(row, i))
        )}
      </TableBody>
    </Table>
  )

  return (
    <div data-sortable-table-root="true">
      {shouldVirtualize ? (
        <div
          ref={vw.containerRef}
          onScroll={vw.onScroll}
          data-testid="sortable-table-virtual-scroll"
          style={{
            maxHeight: MAX_BODY_HEIGHT_PX,
            overflowY: 'auto',
            // Reserve enough room for the synthetic-padding spacer rows so
            // total scrollable height matches `total * ROW_HEIGHT_PX`.
            position: 'relative',
          }}
        >
          {table}
        </div>
      ) : (
        table
      )}
      {pagination && (
        <PaginationFooter
          {...pagination}
          rowsRendered={sortedData.length}
        />
      )}
    </div>
  )
}

function SortIcon({ sortKey, sortDir, columnKey }: { sortKey: string | null; sortDir: SortDirection; columnKey: string }) {
  if (sortKey !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />
  if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
  return <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
}

/**
 * PaginationFooter — Prev / Next + page indicator for server-paginated tables.
 * Controlled UI: emits `onPageChange(nextPage)` and lets the parent re-fetch.
 *
 * E3.S5 acceptance: every list page surface `page=&limit=` query params. This
 * footer is the canonical operator-facing affordance for driving those params.
 */
function PaginationFooter({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  testIdPrefix,
  rowsRendered,
}: PaginationProps & { rowsRendered: number }) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)))
  const canPrev = page > 1
  const canNext = page < totalPages

  const startRow = total === 0 ? 0 : (page - 1) * limit + 1
  const endRow = Math.min(total, (page - 1) * limit + rowsRendered)

  return (
    <div
      data-testid={testIdPrefix ? `${testIdPrefix}-pagination` : 'pagination-footer'}
      role="navigation"
      aria-label="Table pagination"
      className="flex items-center justify-between gap-3 px-2 py-3 text-xs text-[var(--text-secondary)]"
    >
      <span data-testid={testIdPrefix ? `${testIdPrefix}-pagination-summary` : undefined}>
        {total === 0
          ? 'No rows'
          : `${startRow}–${endRow} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        {onLimitChange && (
          <label className="flex items-center gap-1">
            <span className="sr-only">Rows per page</span>
            <select
              aria-label="Rows per page"
              data-testid={testIdPrefix ? `${testIdPrefix}-pagination-limit` : 'pagination-limit'}
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="min-h-[32px] px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          data-testid={testIdPrefix ? `${testIdPrefix}-pagination-prev` : 'pagination-prev'}
          aria-label="Previous page"
          className="min-h-[32px] min-w-[44px] px-2 py-1 rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)]"
        >
          Prev
        </button>
        <span
          data-testid={testIdPrefix ? `${testIdPrefix}-pagination-page` : 'pagination-page'}
          aria-current="page"
          className="min-w-[80px] text-center"
        >
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          data-testid={testIdPrefix ? `${testIdPrefix}-pagination-next` : 'pagination-next'}
          aria-label="Next page"
          className="min-h-[32px] min-w-[44px] px-2 py-1 rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)]"
        >
          Next
        </button>
      </div>
    </div>
  )
}
