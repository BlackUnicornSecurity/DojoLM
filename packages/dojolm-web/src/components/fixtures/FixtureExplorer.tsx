/**
 * File: FixtureExplorer.tsx
 * Purpose: Combined tree + search + grid + detail layout for fixture browsing with filters
 * Story: S72 - Fixture Explorer, TPI-UIP-10, Story 3.2 - Fixture Field Filters
 * Index:
 * - FixtureExplorer component (line 28)
 * - CategoryGrid (line ~160)
 * - Breadcrumb (line ~190)
 * - CategoryFileList (line ~220)
 * - FileRow (line ~290)
 * - ExplorerSkeleton (line ~360)
 */

'use client'

import { useState, useCallback, useMemo, useRef, memo } from 'react'
import { FixtureManifest, FixtureFile as FixtureFileType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryTree, getBrandForCategory } from './CategoryTree'
import { FixtureSearch } from './FixtureSearch'
import { FixtureCategoryCard } from './FixtureCategoryCard'
import {
  FixtureFilters,
  INITIAL_FILTER_STATE,
  filterManifest,
  countFilteredFixtures,
} from './FixtureFilters'
import type { FixtureFilterState } from './FixtureFilters'
import {
  PanelLeftOpen,
  PanelLeftClose,
  Search,
  FolderTree,
  LayoutGrid,
  ScanEye,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
  ChevronRight,
  GitCompareArrows,
  AudioLines,
  Mic,
} from 'lucide-react'

type ViewMode = 'tree' | 'search' | 'grid'

/** Selected fixture for comparison */
interface CompareSelection {
  category: string
  file: string
}

interface FixtureExplorerProps {
  manifest: FixtureManifest | null
  isLoading: boolean
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  /** Callback when 2 fixtures are selected for comparison */
  onCompare?: (selections: [CompareSelection, CompareSelection]) => void
}

export const FixtureExplorer = memo(function FixtureExplorer({
  manifest,
  isLoading,
  onScanFixture,
  onViewFixture,
  onCompare,
}: FixtureExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  // For grid view: track drill-down category + scroll position restoration
  const [gridDrillCategory, setGridDrillCategory] = useState<string | null>(null)
  const scrollPositionRef = useRef(0)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  // Fixture filters state (Story 3.2)
  const [filters, setFilters] = useState<FixtureFilterState>(INITIAL_FILTER_STATE)
  // Compare mode state (Story 3.3)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelections, setCompareSelections] = useState<CompareSelection[]>([])

  /** Apply filters to manifest — memoized for performance with large fixture sets */
  const filteredCategories = useMemo(() => {
    if (!manifest) return {}
    return filterManifest(manifest, filters)
  }, [manifest, filters])

  const filteredCount = useMemo(
    () => countFilteredFixtures(filteredCategories),
    [filteredCategories]
  )

  const handleSelectFromSearch = useCallback(
    (category: string, file: string) => {
      setSelectedCategory(category)
      onViewFixture(category, file)
    },
    [onViewFixture]
  )

  const handleGridDrill = useCallback((category: string) => {
    // Save scroll position before drilling down
    if (gridContainerRef.current) {
      scrollPositionRef.current = gridContainerRef.current.scrollTop
    }
    setGridDrillCategory(category)
  }, [])

  const handleGridBack = useCallback(() => {
    setGridDrillCategory(null)
    // Restore scroll position after returning to grid
    requestAnimationFrame(() => {
      if (gridContainerRef.current) {
        gridContainerRef.current.scrollTop = scrollPositionRef.current
      }
    })
  }, [])

  /** Toggle compare mode on/off (Story 3.3) */
  const handleToggleCompare = useCallback(() => {
    setCompareMode(prev => {
      if (prev) setCompareSelections([])
      return !prev
    })
  }, [])

  /** Handle fixture selection in compare mode */
  const handleCompareSelect = useCallback(
    (category: string, file: string) => {
      setCompareSelections(prev => {
        const key = `${category}/${file}`
        const exists = prev.some(s => `${s.category}/${s.file}` === key)
        if (exists) {
          return prev.filter(s => `${s.category}/${s.file}` !== key)
        }
        // Cap at 2 selections — replace the oldest when adding a 3rd
        const next = [...prev, { category, file }]
        const final = next.length > 2 ? next.slice(-2) : next
        if (final.length === 2 && onCompare) {
          onCompare(final as [CompareSelection, CompareSelection])
        }
        return final
      })
    },
    [onCompare]
  )

  const compareSelectionKeys = useMemo(
    () => new Set(compareSelections.map(s => `${s.category}/${s.file}`)),
    [compareSelections]
  )

  /** Loading state */
  if (isLoading) {
    return <ExplorerSkeleton />
  }

  /** Error / empty state */
  if (!manifest) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            Failed to load fixture manifest
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalFixtures = manifest.totalFixtures
    ?? Object.values(manifest.categories).reduce((sum, cat) => sum + cat.files.length, 0)
  const totalCategories = Object.keys(manifest.categories).length

  const isGridMode = viewMode === 'grid'

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with stats and view toggle */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        {!isGridMode && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="h-8 w-8 p-0"
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Separator orientation="vertical" className="h-5" />
          </>
        )}

        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Fixture Explorer</h2>
          <Badge variant="secondary" className="text-xs">
            v{manifest.version}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
          <span>{totalCategories} categories</span>
          <span aria-hidden="true">/</span>
          <span>{totalFixtures.toLocaleString()} fixtures</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* View mode toggle — Tree | Search | Grid */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => { setViewMode('tree'); setGridDrillCategory(null) }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              viewMode === 'tree'
                ? 'bg-[var(--dojo-primary)]/15 text-foreground font-semibold border-b-2 border-[var(--dojo-primary)]'
                : 'text-muted-foreground hover:bg-[var(--bg-secondary)]'
            )}
            aria-label="Tree view"
            aria-pressed={viewMode === 'tree'}
          >
            <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
            Tree
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('search'); setGridDrillCategory(null) }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              viewMode === 'search'
                ? 'bg-[var(--dojo-primary)]/15 text-foreground font-semibold border-b-2 border-[var(--dojo-primary)]'
                : 'text-muted-foreground hover:bg-[var(--bg-secondary)]'
            )}
            aria-label="Search view"
            aria-pressed={viewMode === 'search'}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('grid'); setGridDrillCategory(null) }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              viewMode === 'grid'
                ? 'bg-[var(--dojo-primary)]/15 text-foreground font-semibold border-b-2 border-[var(--dojo-primary)]'
                : 'text-muted-foreground hover:bg-[var(--bg-secondary)]'
            )}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Grid
          </button>
        </div>

        {/* Compare toggle (Story 3.3) */}
        <Separator orientation="vertical" className="h-5" />
        <Button
          type="button"
          variant={compareMode ? 'default' : 'ghost'}
          size="sm"
          onClick={handleToggleCompare}
          className={cn('h-8 px-2.5 text-xs gap-1', compareMode && 'bg-[var(--dojo-primary)] text-white')}
          aria-label={compareMode ? 'Exit compare mode' : 'Enter compare mode'}
          aria-pressed={compareMode}
        >
          <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
          Compare
          {compareMode && compareSelections.length > 0 && (
            <Badge variant="secondary" className="text-xs h-4 px-1.5 ml-0.5">
              {compareSelections.length}/2
            </Badge>
          )}
        </Button>
      </div>

      {/* Compare mode instruction banner */}
      {compareMode && (
        <div className="px-4 py-2 bg-[var(--dojo-primary)]/10 border-b border-[var(--dojo-primary)]/20 text-xs text-center">
          {compareSelections.length === 0
            ? 'Select 2 fixtures to compare — click the checkbox on each row'
            : compareSelections.length === 1
            ? `Selected: ${compareSelections[0].file} — select 1 more fixture`
            : 'Comparing 2 fixtures — view comparison below'}
        </div>
      )}

      {/* Fixture Filters (Story 3.2) */}
      <div className="px-4 py-2 border-b border-[var(--border)]">
        <FixtureFilters
          manifest={manifest}
          filters={filters}
          onFiltersChange={setFilters}
          filteredCount={filteredCount}
          totalCount={totalFixtures}
        />
      </div>

      {/* Grid view content */}
      {isGridMode && (
        <div ref={gridContainerRef} className="flex-1 overflow-auto p-4">
          {gridDrillCategory && filteredCategories[gridDrillCategory] ? (
            <>
              {/* Breadcrumb */}
              <Breadcrumb
                path={['Armory', gridDrillCategory]}
                onNavigate={(index) => {
                  if (index === 0) handleGridBack()
                }}
              />
              <CategoryFileList
                categoryKey={gridDrillCategory}
                category={filteredCategories[gridDrillCategory]}
                onScanFixture={onScanFixture}
                onViewFixture={onViewFixture}
                compareMode={compareMode}
                compareSelections={compareSelectionKeys}
                onCompareSelect={handleCompareSelect}
              />
            </>
          ) : (
            <CategoryGrid
              categories={filteredCategories}
              onViewFiles={handleGridDrill}
            />
          )}
        </div>
      )}

      {/* Tree/Search split layout */}
      {!isGridMode && (
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar: category tree or search */}
          {!sidebarCollapsed && (
            <aside
              className="w-72 shrink-0 border-r border-[var(--border)] flex flex-col min-h-0"
              aria-label="Fixture navigation"
            >
              {viewMode === 'tree' ? (
                <CategoryTree
                  categories={filteredCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  className="flex-1 min-h-0"
                />
              ) : (
                <FixtureSearch
                  categories={filteredCategories}
                  onSelectFixture={handleSelectFromSearch}
                  className="flex-1 min-h-0"
                />
              )}
            </aside>
          )}

          {/* Right content area: file listing for selected category */}
          <section className="flex-1 min-w-0 overflow-auto" role="region" aria-label="Fixture details">
            {selectedCategory && filteredCategories[selectedCategory] ? (
              <CategoryFileList
                categoryKey={selectedCategory}
                category={filteredCategories[selectedCategory]}
                onScanFixture={onScanFixture}
                onViewFixture={onViewFixture}
                compareMode={compareMode}
                compareSelections={compareSelectionKeys}
                onCompareSelect={handleCompareSelect}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                <FolderTree className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Select a category from the {viewMode === 'tree' ? 'tree' : 'search results'} to view fixtures
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalFixtures.toLocaleString()} fixtures across {totalCategories} categories
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
})

/** Category card grid for grid view mode */
interface CategoryGridProps {
  categories: Record<string, { story: string; desc: string; files: FixtureFileType[] }>
  onViewFiles: (category: string) => void
}

const CategoryGrid = memo(function CategoryGrid({ categories, onViewFiles }: CategoryGridProps) {
  /** Group categories by brand for visual organization */
  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const name of Object.keys(categories).sort()) {
      const brand = getBrandForCategory(name)
      const key = brand.name
      if (!groups[key]) groups[key] = []
      groups[key].push(name)
    }
    return groups
  }, [categories])

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([brandName, categoryNames]) => {
        const brandColor = getBrandForCategory(categoryNames[0]).color
        return (
        <div key={brandName} className="border-l-[3px] pl-4 rounded-sm" style={{ borderLeftColor: brandColor }}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {brandName} <span className="text-muted-foreground/60">({categoryNames.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryNames.map(name => (
              <FixtureCategoryCard
                key={name}
                name={name}
                category={categories[name]}
                onViewFiles={onViewFiles}
              />
            ))}
          </div>
        </div>
        )
      })}
    </div>
  )
})

/** Breadcrumb navigation for drill-down path */
interface BreadcrumbProps {
  path: string[]
  onNavigate: (index: number) => void
}

function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm">
        {path.map((segment, i) => {
          const isLast = i === path.length - 1
          return (
            <li key={`${segment}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
              {isLast ? (
                <span className="font-medium text-[var(--foreground)] capitalize">{segment}</span>
              ) : (
                <button
                  onClick={() => onNavigate(i)}
                  className="text-[var(--dojo-primary)] hover:underline capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  {segment}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** File listing for a selected category */
interface CategoryFileListProps {
  categoryKey: string
  category: { story: string; desc: string; files: FixtureFileType[] }
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  compareMode?: boolean
  compareSelections?: Set<string>
  onCompareSelect?: (category: string, file: string) => void
}

const CategoryFileList = memo(function CategoryFileList({
  categoryKey,
  category,
  onScanFixture,
  onViewFixture,
  compareMode = false,
  compareSelections,
  onCompareSelect,
}: CategoryFileListProps) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  const stats = useMemo(() => {
    const total = category.files.length
    const clean = category.files.filter(f => f.clean).length
    const attack = total - clean
    const critical = category.files.filter(f => f.severity === 'CRITICAL').length
    const warning = category.files.filter(f => f.severity === 'WARNING').length
    return { total, clean, attack, critical, warning }
  }, [category.files])

  const handleInlineView = useCallback((cat: string, file: string) => {
    setExpandedFile(prev => prev === file ? null : file)
    onViewFixture(cat, file)
  }, [onViewFixture])

  return (
    <div className="p-4 space-y-4">
      {/* Category header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold capitalize">{categoryKey}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {category.desc}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            Story: {category.story}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Badge variant="secondary" className="text-xs">
            {stats.total} files
          </Badge>
          <Badge variant="success" className="text-xs">
            {stats.clean} clean
          </Badge>
          <Badge variant="error" className="text-xs">
            {stats.attack} attack
          </Badge>
          {stats.critical > 0 && (
            <Badge variant="critical" className="text-xs">
              {stats.critical} critical
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* File grid */}
      <div className="grid gap-2">
        {category.files.map(file => (
          <FileRow
            key={file.file}
            categoryKey={categoryKey}
            file={file}
            onScan={onScanFixture}
            onView={handleInlineView}
            isExpanded={expandedFile === file.file}
            compareMode={compareMode}
            isCompareSelected={compareSelections?.has(`${categoryKey}/${file.file}`) ?? false}
            onCompareSelect={onCompareSelect}
          />
        ))}
      </div>
    </div>
  )
})

/** Single file row in the category detail view */
interface FileRowProps {
  categoryKey: string
  file: FixtureFileType
  onScan: (category: string, file: string) => void
  onView: (category: string, file: string) => void
  isExpanded?: boolean
  compareMode?: boolean
  isCompareSelected?: boolean
  onCompareSelect?: (category: string, file: string) => void
}

const FileRow = memo(function FileRow({
  categoryKey,
  file,
  onScan,
  onView,
  isExpanded = false,
  compareMode = false,
  isCompareSelected = false,
  onCompareSelect,
}: FileRowProps) {
  const handleScan = useCallback(
    () => onScan(categoryKey, file.file),
    [onScan, categoryKey, file.file]
  )

  const handleView = useCallback(
    () => onView(categoryKey, file.file),
    [onView, categoryKey, file.file]
  )

  const handleCompareToggle = useCallback(
    () => onCompareSelect?.(categoryKey, file.file),
    [onCompareSelect, categoryKey, file.file]
  )

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border',
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        isCompareSelected
          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/5'
          : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
      )}
    >
      {/* Compare checkbox (Story 3.3) */}
      {compareMode && (
        <input
          type="checkbox"
          checked={isCompareSelected}
          onChange={handleCompareToggle}
          className="h-4 w-4 shrink-0 accent-[var(--dojo-primary)] cursor-pointer"
          aria-label={`Select ${file.file} for comparison`}
        />
      )}

      {/* Clean/Attack icon */}
      {file.clean ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
      )}

      {/* File name and attack info - text only (CRIT-07) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-mono truncate block">{file.file}</span>
        {file.attack && (
          <span className="text-xs text-muted-foreground truncate block mt-0.5">
            {file.attack}
          </span>
        )}
        {/* Story 12.1: Audio dual-layer indicators */}
        {file.audioLayers && (
          <div className="flex gap-2 mt-1" role="group" aria-label="Dual-layer audio attack indicators">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--dojo-primary)]">
              <Mic className="h-3 w-3" aria-hidden="true" />
              Vocal
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--severity-warning)]">
              <AudioLines className="h-3 w-3" aria-hidden="true" />
              Metadata
            </span>
          </div>
        )}
        {file.transcription && (
          <span className="text-xs text-muted-foreground/70 italic truncate block max-w-full mt-0.5" title={file.transcription}>
            &ldquo;{file.transcription}&rdquo;
          </span>
        )}
      </div>

      {/* Product badge */}
      {file.product && (
        <Badge variant="outline" className="text-xs shrink-0">
          {file.product}
        </Badge>
      )}

      {/* Severity */}
      {file.severity && (
        <Badge
          variant={
            file.severity === 'CRITICAL'
              ? 'critical'
              : file.severity === 'WARNING'
              ? 'warning'
              : 'info'
          }
          className="text-xs shrink-0"
        >
          {file.severity}
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 shrink-0">
        <Button
          type="button"
          variant={isExpanded ? 'default' : 'ghost'}
          size="sm"
          onClick={handleView}
          className="h-7 w-7 p-0"
          aria-label={isExpanded ? `Collapse ${file.file}` : `View ${file.file}`}
          aria-expanded={isExpanded}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleScan}
          className="h-7 px-2 gap-1 text-xs"
          aria-label={`Scan ${file.file}`}
        >
          <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
          Scan
        </Button>
      </div>

      {/* Inline expandable detail section */}
      {isExpanded && (
        <div className="col-span-full mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span><strong>File:</strong> {file.file}</span>
            {file.attack && <span><strong>Attack:</strong> {file.attack}</span>}
            <span><strong>Type:</strong> {file.clean ? 'Clean' : 'Attack'}</span>
            {file.severity && <span><strong>Severity:</strong> {file.severity}</span>}
            {file.product && <span><strong>Product:</strong> {file.product}</span>}
          </div>
        </div>
      )}
    </div>
  )
})

/** Loading skeleton for the explorer */
function ExplorerSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 ml-auto" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar skeleton */}
        <div className="w-72 shrink-0 border-r border-[var(--border)] p-3 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-5/6" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
