/**
 * File: FixtureExplorer.tsx
 * Purpose: Combined tree + search + detail layout for fixture browsing
 * Story: S72 - Fixture Explorer
 * Index:
 * - FixtureExplorer component (line 18)
 * - CategoryPanel (line 67)
 * - ContentPanel (line 103)
 */

'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { FixtureManifest, FixtureFile as FixtureFileType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryTree } from './CategoryTree'
import { FixtureSearch } from './FixtureSearch'
import {
  PanelLeftOpen,
  PanelLeftClose,
  Search,
  FolderTree,
  ScanEye,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react'

type ViewMode = 'tree' | 'search'

interface FixtureExplorerProps {
  manifest: FixtureManifest | null
  isLoading: boolean
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
}

export const FixtureExplorer = memo(function FixtureExplorer({
  manifest,
  isLoading,
  onScanFixture,
  onViewFixture,
}: FixtureExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')

  const handleSelectFromSearch = useCallback(
    (category: string, file: string) => {
      setSelectedCategory(category)
      onViewFixture(category, file)
    },
    [onViewFixture]
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
          <AlertCircle className="h-12 w-12 text-[var(--muted-foreground)] mb-3" aria-hidden="true" />
          <p className="text-[var(--muted-foreground)] text-sm">
            Failed to load fixture manifest
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalFixtures = manifest.totalFixtures
    ?? Object.values(manifest.categories).reduce((sum, cat) => sum + cat.files.length, 0)
  const totalCategories = Object.keys(manifest.categories).length

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with stats and view toggle */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
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

        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Fixture Explorer</h2>
          <Badge variant="secondary" className="text-xs">
            v{manifest.version}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-xs text-[var(--muted-foreground)]">
          <span>{totalCategories} categories</span>
          <span aria-hidden="true">/</span>
          <span>{totalFixtures.toLocaleString()} fixtures</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* View mode toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
              'motion-safe:transition-colors motion-safe:duration-150',
              viewMode === 'tree'
                ? 'bg-[var(--bg-quaternary)] text-foreground'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--bg-secondary)]'
            )}
            aria-label="Tree view"
            aria-pressed={viewMode === 'tree'}
          >
            <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
            Tree
          </button>
          <button
            type="button"
            onClick={() => setViewMode('search')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
              'motion-safe:transition-colors motion-safe:duration-150',
              viewMode === 'search'
                ? 'bg-[var(--bg-quaternary)] text-foreground'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--bg-secondary)]'
            )}
            aria-label="Search view"
            aria-pressed={viewMode === 'search'}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar: category tree or search */}
        {!sidebarCollapsed && (
          <aside
            className="w-72 shrink-0 border-r border-[var(--border)] flex flex-col min-h-0"
            aria-label="Fixture navigation"
          >
            {viewMode === 'tree' ? (
              <CategoryTree
                categories={manifest.categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                className="flex-1 min-h-0"
              />
            ) : (
              <FixtureSearch
                categories={manifest.categories}
                onSelectFixture={handleSelectFromSearch}
                className="flex-1 min-h-0"
              />
            )}
          </aside>
        )}

        {/* Right content area: file listing for selected category */}
        <main className="flex-1 min-w-0 overflow-auto" aria-label="Fixture details">
          {selectedCategory && manifest.categories[selectedCategory] ? (
            <CategoryFileList
              categoryKey={selectedCategory}
              category={manifest.categories[selectedCategory]}
              onScanFixture={onScanFixture}
              onViewFixture={onViewFixture}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
              <FolderTree className="h-10 w-10 text-[var(--muted-foreground)] mb-3" aria-hidden="true" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Select a category from the {viewMode === 'tree' ? 'tree' : 'search results'} to view fixtures
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {totalFixtures.toLocaleString()} fixtures across {totalCategories} categories
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
})

/** File listing for a selected category */
interface CategoryFileListProps {
  categoryKey: string
  category: { story: string; desc: string; files: FixtureFileType[] }
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
}

const CategoryFileList = memo(function CategoryFileList({
  categoryKey,
  category,
  onScanFixture,
  onViewFixture,
}: CategoryFileListProps) {
  const stats = useMemo(() => {
    const total = category.files.length
    const clean = category.files.filter(f => f.clean).length
    const attack = total - clean
    const critical = category.files.filter(f => f.severity === 'CRITICAL').length
    const warning = category.files.filter(f => f.severity === 'WARNING').length
    return { total, clean, attack, critical, warning }
  }, [category.files])

  return (
    <div className="p-4 space-y-4">
      {/* Category header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold capitalize">{categoryKey}</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {category.desc}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-mono">
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
            onView={onViewFixture}
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
}

const FileRow = memo(function FileRow({
  categoryKey,
  file,
  onScan,
  onView,
}: FileRowProps) {
  const handleScan = useCallback(
    () => onScan(categoryKey, file.file),
    [onScan, categoryKey, file.file]
  )

  const handleView = useCallback(
    () => onView(categoryKey, file.file),
    [onView, categoryKey, file.file]
  )

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border)]',
        'motion-safe:transition-colors motion-safe:duration-150',
        'hover:bg-[var(--bg-secondary)]'
      )}
    >
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
          <span className="text-xs text-[var(--muted-foreground)] truncate block mt-0.5">
            {file.attack}
          </span>
        )}
      </div>

      {/* Product badge */}
      {file.product && (
        <Badge variant="outline" className="text-[10px] shrink-0">
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
          className="text-[10px] shrink-0"
        >
          {file.severity}
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleView}
          className="h-7 w-7 p-0"
          aria-label={`View ${file.file}`}
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
