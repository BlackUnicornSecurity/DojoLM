/**
 * File: PageToolbar.tsx
 * Purpose: Search bar, filter pills, breadcrumbs toolbar
 * Story: TPI-UI-001-15
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface FilterPill {
  id: string
  label: string
  active: boolean
}

interface Breadcrumb {
  label: string
  onClick?: () => void
}

interface PageToolbarProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  filters?: FilterPill[]
  onFilterToggle?: (id: string) => void
  onSearch?: (query: string) => void
  showSearch?: boolean
  searchPlaceholder?: string
  className?: string
}

export function PageToolbar({
  title,
  subtitle,
  breadcrumbs,
  filters = [],
  onFilterToggle,
  onSearch,
  showSearch,
  searchPlaceholder = 'Search...',
  className,
}: PageToolbarProps) {
  const [query, setQuery] = useState('')
  const [isMac, setIsMac] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchEnabled = showSearch ?? Boolean(onSearch)

  // Detect platform for keyboard shortcut hint
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent))
  }, [])

  // Train 2 PR-4c.3: Cmd+K now owned by the global CommandPalette in TopBar.
  // Per-page search focus is no longer hotkey-bound. Users reach the palette
  // via Cmd+K (global), then the per-page search via the toolbar UI itself.

  // Breadcrumb truncation for mobile: show first, ellipsis, last when > 2 items
  const visibleBreadcrumbs = breadcrumbs && breadcrumbs.length > 2
    ? [breadcrumbs[0]!, { label: '\u2026' }, breadcrumbs[breadcrumbs.length - 1]!]
    : breadcrumbs

  return (
    <div className={cn("space-y-[var(--spacing-md)]", className)}>
      {/* Breadcrumbs */}
      {visibleBreadcrumbs && visibleBreadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          {visibleBreadcrumbs.map((crumb, i) => {
            const isLast = i === visibleBreadcrumbs.length - 1
            return (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    aria-current={isLast ? 'page' : undefined}
                    className="hover:text-[var(--foreground)] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)] min-h-[44px] flex items-center max-w-[160px] truncate"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className="text-muted-foreground max-w-[160px] truncate"
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      )}

      {/* Title area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {(searchEnabled || filters.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-[var(--spacing-sm)]">
          {/* Search input with glassmorphic style */}
          {searchEnabled && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
              <input
                ref={searchRef}
                id="toolbar-search"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  onSearch?.(e.target.value)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className={cn(
                  "glass",
                  "w-full pl-11 pr-14 py-2 rounded-full min-h-[44px]",
                  "border border-[var(--border-subtle)]",
                  "text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)] focus:border-transparent",
                  "motion-safe:transition-all motion-safe:duration-[var(--transition-fast)]"
                )}
              />
              <kbd
                aria-label={isMac ? 'Keyboard shortcut: Command K' : 'Keyboard shortcut: Control K'}
                className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-[var(--text-tertiary)] bg-[var(--bg-quaternary)] rounded border border-[var(--border)]"
              >
                {isMac ? <span className="text-xs">⌘</span> : <span className="text-xs">Ctrl+</span>}K
              </kbd>
            </div>
          )}

          {/* Filter pills */}
          {filters.length > 0 && (
            <div className="flex gap-[var(--spacing-xs)] overflow-x-auto pb-1" role="group" aria-label="Filters">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => onFilterToggle?.(filter.id)}
                  aria-pressed={filter.active}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[44px]",
                    "border motion-safe:transition-all motion-safe:duration-[var(--transition-fast)]",
                    filter.active
                      ? "bg-[var(--overlay-active)] border-[var(--border-active)] text-[var(--foreground)]"
                      : "bg-transparent text-muted-foreground border-[var(--border)] hover:border-[var(--border-hover)] hover:text-foreground"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
