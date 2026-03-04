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
  searchPlaceholder = 'Search...',
  className,
}: PageToolbarProps) {
  const [query, setQuery] = useState('')
  const [isMac, setIsMac] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  // Detect platform for keyboard shortcut hint
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent))
  }, [])

  // Cmd/Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
              <span key={i} className="flex items-center gap-1">
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
          <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Search + Filters row */}
      <div className="flex flex-col sm:flex-row gap-[var(--spacing-sm)]">
        {/* Search input with glassmorphic style */}
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
              "border border-[rgba(255,255,255,0.06)]",
              "text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)] focus:border-transparent",
              "motion-safe:transition-all motion-safe:duration-[var(--transition-fast)]"
            )}
          />
          <kbd
            aria-label={isMac ? 'Keyboard shortcut: Command K' : 'Keyboard shortcut: Control K'}
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[var(--text-quaternary)] bg-[var(--bg-quaternary)] rounded border border-[var(--border)]"
          >
            {isMac ? <span className="text-xs">⌘</span> : <span className="text-xs">Ctrl+</span>}K
          </kbd>
        </div>

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
                    ? "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-[var(--foreground)]"
                    : "bg-transparent text-muted-foreground border-[var(--border)] hover:border-[rgba(255,255,255,0.15)] hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
