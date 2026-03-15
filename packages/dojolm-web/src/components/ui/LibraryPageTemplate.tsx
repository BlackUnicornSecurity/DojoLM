'use client'

/**
 * File: LibraryPageTemplate.tsx
 * Purpose: Reusable library page template with search, filter, sort, pagination, and detail panel
 * Story: HAKONE H5.2
 * Index:
 * - LibraryColumn type (line 16)
 * - LibraryPageTemplateProps (line 24)
 * - LibraryPageTemplate component (line 46)
 */

import { useState, useMemo, useCallback, useId, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search, Grid3X3, List, ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export interface LibraryColumn<T> {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  sortFn?: (a: T, b: T) => number
}

export interface LibraryFilterField {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface LibraryPageTemplateProps<T> {
  title: string
  items: T[]
  columns: LibraryColumn<T>[]
  filterFields?: LibraryFilterField[]
  renderDetail?: (item: T) => React.ReactNode
  onAction?: (item: T, action: string) => void
  itemKey: (item: T) => string
  searchFn: (item: T, query: string) => boolean
  pageSize?: number
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

const DEFAULT_PAGE_SIZE = 12

export function LibraryPageTemplate<T>({
  title,
  items,
  columns,
  filterFields = [],
  renderDetail,
  itemKey,
  searchFn,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
}: LibraryPageTemplateProps<T>) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(0)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const searchId = useId()

  // Escape key handler for detail dialog
  useEffect(() => {
    if (!selectedItem) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedItem])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }, [])

  const handleSort = useCallback((colKey: string) => {
    if (colKey === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colKey)
      setSortDir('asc')
    }
    setPage(0)
  }, [sortCol])

  const filtered = useMemo(() => {
    let result = items

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(item => searchFn(item, q))
    }

    // Filters
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== 'all') {
        result = result.filter(item => {
          const record = item as Record<string, unknown>
          if (!Object.hasOwn(record, key)) return false
          return String(record[key]) === value
        })
      }
    }

    // Sort
    if (sortCol) {
      const col = columns.find(c => c.key === sortCol)
      if (col?.sortFn) {
        const dir = sortDir === 'asc' ? 1 : -1
        result = [...result].sort((a, b) => dir * col.sortFn!(a, b))
      }
    }

    return result
  }, [items, search, filters, sortCol, sortDir, columns, searchFn])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  )

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30 border border-[var(--border)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={`Search ${title.toLowerCase()}...`}
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm min-h-[40px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
            aria-label={`Search ${title}`}
          />
        </div>

        {filterFields.map(field => (
          <select
            key={field.key}
            value={filters[field.key] ?? 'all'}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm min-h-[40px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
            aria-label={`Filter by ${field.label}`}
          >
            <option value="all">All {field.label}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-[var(--border)] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center',
              viewMode === 'grid' ? 'bg-[var(--bg-tertiary)] text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <Grid3X3 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center',
              viewMode === 'list' ? 'bg-[var(--bg-tertiary)] text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Sort headers for list view */}
      {viewMode === 'list' && columns.some(c => c.sortFn) && (
        <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
          <span>Sort by:</span>
          {columns.filter(c => c.sortFn).map(col => (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={cn(
                'px-2 py-1 rounded hover:bg-[var(--bg-tertiary)]',
                sortCol === col.key && 'text-foreground font-medium',
              )}
              aria-label={`Sort by ${col.label} ${sortCol === col.key ? (sortDir === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
            >
              {col.label}
              {sortCol === col.key && (sortDir === 'asc' ? ' \u2191' : ' \u2193')}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Content */}
      {pageItems.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageItems.map(item => (
              <div
                key={itemKey(item)}
                className={cn(
                  'rounded-lg border border-[var(--border)] bg-card p-4 space-y-2',
                  renderDetail && 'cursor-pointer hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
                )}
                onClick={renderDetail ? () => setSelectedItem(item) : undefined}
                role={renderDetail ? 'button' : undefined}
                tabIndex={renderDetail ? 0 : undefined}
                onKeyDown={renderDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedItem(item) } } : undefined}
              >
                {columns.map(col => (
                  <div key={col.key}>{col.render(item)}</div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {pageItems.map(item => (
              <div
                key={itemKey(item)}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg border border-[var(--border)] bg-card',
                  renderDetail && 'cursor-pointer hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
                )}
                onClick={renderDetail ? () => setSelectedItem(item) : undefined}
                role={renderDetail ? 'button' : undefined}
                tabIndex={renderDetail ? 0 : undefined}
                onKeyDown={renderDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedItem(item) } } : undefined}
              >
                {columns.map(col => (
                  <div key={col.key} className="flex-1 min-w-0">{col.render(item)}</div>
                ))}
              </div>
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selectedItem && renderDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className={cn(
              'relative w-full max-w-2xl max-h-[85vh] mx-0 sm:mx-4 overflow-hidden',
              'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-xl sm:rounded-xl shadow-lg',
              'flex flex-col',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200',
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} detail`}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold">Detail</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close detail"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderDetail(selectedItem)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
