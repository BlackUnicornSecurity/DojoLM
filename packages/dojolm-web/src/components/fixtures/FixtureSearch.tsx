/**
 * File: FixtureSearch.tsx
 * Purpose: Full-text search across fixture content with severity/brand/type filters
 * Story: S72 - Fixture Explorer
 * SME CRIT-07: All fixture content rendered as safe text only (no raw HTML injection)
 * Index:
 * - BRAND_NAMES (line 22)
 * - CATEGORY_BRAND_MAP (line 30)
 * - FixtureSearch component (line 56)
 * - SearchResultRow component (line 245)
 */

'use client'

import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react'
import { FixtureCategory, FixtureFile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter, CheckCircle2, AlertCircle } from 'lucide-react'

/** Brand names for filter dropdown */
const BRAND_NAMES = ['DojoLM', 'BonkLM', 'Basileak', 'PantheonLM', 'Marfaak', 'BlackUnicorn'] as const

/** Category-to-brand mapping (client-side mirror of branding-helpers.ts) */
const CATEGORY_BRAND_MAP: Record<string, string> = {
  web: 'DojoLM', context: 'DojoLM', encoded: 'DojoLM', code: 'DojoLM',
  boundary: 'DojoLM', multimodal: 'DojoLM', 'prompt-injection': 'DojoLM',
  mcp: 'DojoLM', 'token-attacks': 'DojoLM', modern: 'DojoLM',
  social: 'BonkLM', 'untrusted-sources': 'BonkLM', 'delivery-vectors': 'BonkLM',
  'supply-chain': 'BonkLM',
  malformed: 'Basileak', dos: 'Basileak', 'model-theft': 'Basileak',
  'document-attacks': 'Basileak', 'tool-manipulation': 'Basileak',
  'search-results': 'PantheonLM', vec: 'PantheonLM', or: 'PantheonLM',
  bias: 'PantheonLM', translation: 'PantheonLM',
  'agent-output': 'Marfaak', cognitive: 'Marfaak', output: 'Marfaak',
  agent: 'Marfaak', session: 'Marfaak', 'few-shot': 'Marfaak',
  images: 'BlackUnicorn', audio: 'BlackUnicorn', environmental: 'BlackUnicorn',
}

const BRAND_COLORS: Record<string, string> = {
  DojoLM: '#E63946',
  BonkLM: '#FFD700',
  Basileak: '#8A2BE2',
  PantheonLM: '#39FF14',
  Marfaak: '#FF10F0',
  BlackUnicorn: '#666666',
}

/** Maximum items to render initially for performance */
const INITIAL_RENDER_LIMIT = 100

/** Flattened search result item */
interface SearchResult {
  category: string
  brand: string
  file: FixtureFile
}

interface FixtureSearchProps {
  categories: Record<string, FixtureCategory>
  onSelectFixture: (category: string, file: string) => void
  className?: string
}

export const FixtureSearch = memo(function FixtureSearch({
  categories,
  onSelectFixture,
  className,
}: FixtureSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Debounced search input - 300ms */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query])

  /** Build flattened + filtered results */
  const allItems = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = []
    for (const [categoryKey, category] of Object.entries(categories)) {
      const brand = CATEGORY_BRAND_MAP[categoryKey] || 'BlackUnicorn'
      for (const file of category.files) {
        items.push({ category: categoryKey, brand, file })
      }
    }
    return items
  }, [categories])

  /** Apply search query + filters */
  const filteredResults = useMemo(() => {
    let results = allItems

    // Text search
    if (debouncedQuery.trim()) {
      const lowerQuery = debouncedQuery.toLowerCase()
      results = results.filter(item =>
        item.file.file.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        (item.file.attack && item.file.attack.toLowerCase().includes(lowerQuery)) ||
        item.brand.toLowerCase().includes(lowerQuery)
      )
    }

    // Severity filter
    if (severityFilter !== 'all') {
      results = results.filter(item => item.file.severity === severityFilter)
    }

    // Brand filter
    if (brandFilter !== 'all') {
      results = results.filter(item => item.brand === brandFilter)
    }

    // Type filter (clean vs attack)
    if (typeFilter === 'clean') {
      results = results.filter(item => item.file.clean)
    } else if (typeFilter === 'attack') {
      results = results.filter(item => !item.file.clean)
    }

    return results
  }, [allItems, debouncedQuery, severityFilter, brandFilter, typeFilter])

  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_LIMIT)

  /** Reset render limit when filters change */
  useEffect(() => {
    setRenderLimit(INITIAL_RENDER_LIMIT)
  }, [debouncedQuery, severityFilter, brandFilter, typeFilter])

  const visibleResults = useMemo(
    () => filteredResults.slice(0, renderLimit),
    [filteredResults, renderLimit]
  )

  const handleShowMore = useCallback(() => {
    setRenderLimit(prev => prev + 100)
  }, [])

  const handleClearSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
  }, [])

  const handleClearFilters = useCallback(() => {
    setSeverityFilter('all')
    setBrandFilter('all')
    setTypeFilter('all')
  }, [])

  const hasActiveFilters = severityFilter !== 'all' || brandFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search fixtures..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 pr-8 h-9"
            aria-label="Search fixtures by name, category, or attack type"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(prev => !prev)}
            className={cn(
              'h-7 px-2 text-xs gap-1',
              hasActiveFilters && 'text-[var(--dojo-primary)]'
            )}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
          >
            <Filter className="h-3 w-3" aria-hidden="true" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dojo-primary)]" aria-hidden="true" />
            )}
          </Button>

          <span className="text-xs text-muted-foreground ml-auto">
            {filteredResults.length.toLocaleString()} result{filteredResults.length !== 1 ? 's' : ''}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label="Clear all filters"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap pb-1">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by brand">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {BRAND_NAMES.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="clean">Clean only</SelectItem>
                <SelectItem value="attack">Attack only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results list (virtualized) */}
      <div
        className="flex-1 overflow-auto"
        role="list"
        aria-label={`Search results, ${filteredResults.length} items`}
      >
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {debouncedQuery || hasActiveFilters
                ? 'No fixtures match your search criteria'
                : 'Type to search across all fixtures'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/30">
            {visibleResults.map(item => (
              <SearchResultRow
                key={`${item.category}-${item.file.file}`}
                item={item}
                onSelect={onSelectFixture}
              />
            ))}
            {filteredResults.length > renderLimit && (
              <div className="flex justify-center py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowMore}
                  className="text-xs"
                >
                  Show more ({filteredResults.length - renderLimit} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

/** Single search result row */
interface SearchResultRowProps {
  item: SearchResult
  onSelect: (category: string, file: string) => void
}

const SearchResultRow = memo(function SearchResultRow({
  item,
  onSelect,
}: SearchResultRowProps) {
  const handleClick = useCallback(() => {
    onSelect(item.category, item.file.file)
  }, [onSelect, item.category, item.file.file])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(item.category, item.file.file)
      }
    },
    [onSelect, item.category, item.file.file]
  )

  const brandColor = BRAND_COLORS[item.brand] || '#666666'

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={cn(
        'flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer',
        'motion-safe:transition-colors motion-safe:duration-150',
        'hover:bg-[var(--bg-secondary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${item.file.file} in ${item.category}, ${item.file.clean ? 'clean' : 'attack'}${item.file.severity ? `, severity ${item.file.severity}` : ''}`}
    >
      {/* Brand indicator dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: brandColor }}
        aria-hidden="true"
      />

      {/* File info - text rendering only (CRIT-07 safe) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-mono truncate">
            {item.file.file}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {item.category}
          </span>
          {item.file.attack && (
            <>
              <span className="text-[10px] text-muted-foreground" aria-hidden="true">
                /
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {item.file.attack}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Clean / attack indicator */}
      {item.file.clean ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" aria-hidden="true" />
      )}

      {/* Severity badge */}
      {item.file.severity && (
        <Badge
          variant={
            item.file.severity === 'CRITICAL'
              ? 'critical'
              : item.file.severity === 'WARNING'
              ? 'warning'
              : 'info'
          }
          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
        >
          {item.file.severity}
        </Badge>
      )}
    </div>
  )
})
