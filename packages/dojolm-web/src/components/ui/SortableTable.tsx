/**
 * File: SortableTable.tsx
 * Purpose: Enhanced data table with sortable columns, sticky header, and row hover
 * Story: TPI-UI-001-18
 * Index:
 * - SortDirection type (line 15)
 * - Column interface (line 17)
 * - SortableTableProps interface (line 24)
 * - SortableTable component (line 33)
 */

'use client'

import { useState, useMemo, type ReactNode } from 'react'
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

export interface SortableTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowKey?: keyof T & string
  emptyMessage?: string
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
  className?: string
}

export function SortableTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  emptyMessage = 'No data available',
  stickyHeader = true,
  onRowClick,
  className,
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

  return (
    <Table className={className}>
      <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-[var(--bg-secondary)]")}>
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
                col.sortable && "cursor-pointer select-none hover:text-[var(--foreground)] min-h-[44px]",
                col.className
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
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-32 text-center text-[var(--text-tertiary)]">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((row, i) => (
            <TableRow
              key={rowKey ? String(row[rowKey]) : i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]",
                "hover:bg-[var(--bg-tertiary)]",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function SortIcon({ sortKey, sortDir, columnKey }: { sortKey: string | null; sortDir: SortDirection; columnKey: string }) {
  if (sortKey !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />
  if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
  return <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
}
