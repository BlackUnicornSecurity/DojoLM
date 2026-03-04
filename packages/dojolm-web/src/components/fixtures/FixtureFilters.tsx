/**
 * File: FixtureFilters.tsx
 * Purpose: Field-based filter bar for fixture browsing (category, severity, engine, detection status, file type)
 * Story: 3.2 - Fixture Field Filters
 * Index:
 * - FixtureFilterState type (line 18)
 * - FILE_TYPE_EXTENSIONS (line 26)
 * - getFileType() (line 40)
 * - filterFixtures() (line 52)
 * - FixtureFilters component (line 82)
 * - FilterSelect component (line 212)
 */

'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, X } from 'lucide-react'
import type { FixtureManifest, FixtureFile } from '@/lib/types'

/** Filter state — exported for use by FixtureExplorer */
export interface FixtureFilterState {
  category: string
  severity: string
  detectionStatus: string
  fileType: string
}

export const INITIAL_FILTER_STATE: FixtureFilterState = {
  category: 'all',
  severity: 'all',
  detectionStatus: 'all',
  fileType: 'all',
}

/** File type groupings by extension */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm'])
const BINARY_EXTENSIONS = new Set(['.pdf', '.exe', '.bin'])

/** Determine file type from filename */
function getFileType(filename: string): 'text' | 'image' | 'audio' | 'video' | 'binary' {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return 'text'
  const ext = filename.slice(dotIndex).toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (BINARY_EXTENSIONS.has(ext)) return 'binary'
  return 'text'
}

/** Get detection status for a fixture file */
function getDetectionStatus(file: FixtureFile): 'detected' | 'clean' | 'untested' {
  if (file.clean) return 'clean'
  if (file.severity) return 'detected'
  return 'untested'
}

/** Apply filters to the entire manifest and return filtered categories */
export function filterManifest(
  manifest: FixtureManifest,
  filters: FixtureFilterState
): Record<string, { story: string; desc: string; files: FixtureFile[] }> {
  const hasActiveFilters = Object.values(filters).some(v => v !== 'all')
  if (!hasActiveFilters) return manifest.categories

  const result: Record<string, { story: string; desc: string; files: FixtureFile[] }> = {}

  for (const [catKey, category] of Object.entries(manifest.categories)) {
    // Category filter
    if (filters.category !== 'all' && catKey !== filters.category) continue

    const filteredFiles = category.files.filter(file => {
      // Severity filter
      if (filters.severity !== 'all') {
        if (filters.severity === 'none' && file.severity !== null) return false
        if (filters.severity !== 'none' && file.severity !== filters.severity) return false
      }

      // Detection status filter
      if (filters.detectionStatus !== 'all') {
        const status = getDetectionStatus(file)
        if (status !== filters.detectionStatus) return false
      }

      // File type filter
      if (filters.fileType !== 'all') {
        const type = getFileType(file.file)
        if (type !== filters.fileType) return false
      }

      return true
    })

    if (filteredFiles.length > 0) {
      result[catKey] = { ...category, files: filteredFiles }
    }
  }

  return result
}

/** Count total fixtures across filtered categories */
export function countFilteredFixtures(
  categories: Record<string, { files: FixtureFile[] }>
): number {
  return Object.values(categories).reduce((sum, cat) => sum + cat.files.length, 0)
}

interface FixtureFiltersProps {
  manifest: FixtureManifest
  filters: FixtureFilterState
  onFiltersChange: (filters: FixtureFilterState) => void
  filteredCount: number
  totalCount: number
  className?: string
}

export const FixtureFilters = memo(function FixtureFilters({
  manifest,
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
  className,
}: FixtureFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  /** Sorted category names for dropdown */
  const categoryNames = useMemo(
    () => Object.keys(manifest.categories).sort(),
    [manifest.categories]
  )

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(v => v !== 'all'),
    [filters]
  )

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v !== 'all').length,
    [filters]
  )

  const handleFilterChange = useCallback(
    (key: keyof FixtureFilterState, value: string) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  const handleClearAll = useCallback(() => {
    onFiltersChange(INITIAL_FILTER_STATE)
  }, [onFiltersChange])

  return (
    <div className={cn('space-y-2', className)}>
      {/* Filter toggle bar */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(prev => !prev)}
          className={cn(
            'h-8 px-3 text-xs gap-1.5',
            hasActiveFilters && 'text-[var(--dojo-primary)]'
          )}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          aria-expanded={showFilters}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-0.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <>
            <span className="text-xs text-muted-foreground">
              {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} fixtures
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label="Clear all filters"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Active filters">
          {filters.category !== 'all' && (
            <FilterPill
              label={`Category: ${filters.category}`}
              onRemove={() => handleFilterChange('category', 'all')}
            />
          )}
          {filters.severity !== 'all' && (
            <FilterPill
              label={`Severity: ${filters.severity === 'none' ? 'None' : filters.severity}`}
              onRemove={() => handleFilterChange('severity', 'all')}
            />
          )}
          {filters.detectionStatus !== 'all' && (
            <FilterPill
              label={`Status: ${filters.detectionStatus}`}
              onRemove={() => handleFilterChange('detectionStatus', 'all')}
            />
          )}
          {filters.fileType !== 'all' && (
            <FilterPill
              label={`Type: ${filters.fileType}`}
              onRemove={() => handleFilterChange('fileType', 'all')}
            />
          )}
        </div>
      )}

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap p-3 bg-muted/30 rounded-lg border border-[var(--border)]">
          <FilterSelect
            label="Category"
            value={filters.category}
            onChange={(v) => handleFilterChange('category', v)}
            options={[
              { value: 'all', label: 'All categories' },
              ...categoryNames.map(c => ({ value: c, label: c })),
            ]}
          />

          <FilterSelect
            label="Severity"
            value={filters.severity}
            onChange={(v) => handleFilterChange('severity', v)}
            options={[
              { value: 'all', label: 'All severities' },
              { value: 'CRITICAL', label: 'Critical' },
              { value: 'WARNING', label: 'Warning' },
              { value: 'INFO', label: 'Info' },
              { value: 'none', label: 'None (clean)' },
            ]}
          />

          <FilterSelect
            label="Detection Status"
            value={filters.detectionStatus}
            onChange={(v) => handleFilterChange('detectionStatus', v)}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'detected', label: 'Detected' },
              { value: 'clean', label: 'Clean' },
              { value: 'untested', label: 'Untested' },
            ]}
          />

          <FilterSelect
            label="File Type"
            value={filters.fileType}
            onChange={(v) => handleFilterChange('fileType', v)}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'text', label: 'Text' },
              { value: 'image', label: 'Image' },
              { value: 'audio', label: 'Audio' },
              { value: 'video', label: 'Video' },
              { value: 'binary', label: 'Binary' },
            ]}
          />
        </div>
      )}
    </div>
  )
})

/** Individual filter pill with remove button */
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      role="listitem"
      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-[var(--bg-quaternary)] border border-[var(--border)] text-xs"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  )
}

/** Reusable filter dropdown */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[150px] text-xs" aria-label={`Filter by ${label}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
