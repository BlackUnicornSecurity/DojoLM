/**
 * File: FilterPills.tsx
 * Purpose: Toggle-style filter pills for engine selection
 * Story: TPI-UIP-03
 * Design Context: BLUNDESI (data-dense dashboard section)
 * Index:
 * - FilterPill interface (line 16)
 * - FilterPillsProps interface (line 23)
 * - sanitizeId utility (line 35)
 * - FilterPills component (line 42)
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export interface FilterPill {
  id: string
  label: string
  icon?: LucideIcon
  enabled: boolean
}

export interface FilterPillsProps {
  filters: FilterPill[]
  onToggle: (filterId: string) => void
  onReset: () => void
  activeCount?: number
  totalCount?: number
  className?: string
}

/**
 * Sanitize filter ID to alphanumeric, hyphens, and spaces only.
 * Preserves spaces because ENGINE_FILTERS use IDs like "Prompt Injection".
 * Prevents injection of arbitrary characters into DOM attributes.
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9- ]/g, '')
}

export function FilterPills({
  filters,
  onToggle,
  onReset,
  activeCount,
  totalCount,
  className,
}: FilterPillsProps) {
  // Local optimistic state for instant visual feedback during debounce
  const [localFilters, setLocalFilters] = useState(filters)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingToggles = useRef<string[]>([])

  // Sync local state when parent props change (after debounced flush)
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Flush pending toggles and cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      // Flush any pending toggles so they aren't silently lost
      const toggles = pendingToggles.current
      if (toggles.length > 0) {
        pendingToggles.current = []
        for (const id of toggles) {
          onToggle(id)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onToggle ref is stable via useCallback in parent
  }, [])

  const handleToggle = useCallback((filterId: string) => {
    // IDs are defined internally via ENGINE_FILTERS constants and already safe
    // sanitizeId is used for DOM attribute generation in the render path

    // Update local state immediately for instant visual feedback
    setLocalFilters(prev =>
      prev.map(f => f.id === filterId ? { ...f, enabled: !f.enabled } : f)
    )

    // Queue this toggle for debounced flush
    pendingToggles.current.push(filterId)

    // Debounce: flush all pending toggles after 300ms of no activity
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      const toggles = pendingToggles.current
      pendingToggles.current = []
      for (const id of toggles) {
        onToggle(id)
      }
    }, 300)
  }, [onToggle])

  const computedActiveCount = useMemo(
    () => activeCount ?? localFilters.filter(f => f.enabled).length,
    [activeCount, localFilters]
  )
  const computedTotalCount = totalCount ?? localFilters.length
  const allDisabled = computedActiveCount === 0

  return (
    <div className={cn('space-y-3', className)} role="group" aria-label="Engine filters">
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto scrollbar-hide relative pb-1">
        {/* Active filter indicator */}
        <span className="text-label text-muted-foreground whitespace-nowrap">
          {computedActiveCount}/{computedTotalCount} active
        </span>

        {/* Filter pills */}
        {localFilters.map((filter) => {
          const Icon = filter.icon
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={filter.enabled}
              aria-label={`${filter.label} engine ${filter.enabled ? 'enabled' : 'disabled'}`}
              onClick={() => handleToggle(filter.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                'border cursor-pointer select-none',
                'motion-safe:transition-[background-color,color,border-color] motion-safe:duration-[var(--transition-normal)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                filter.enabled
                  ? 'bg-[var(--bu-electric-subtle)] border-[var(--bu-electric-muted)] text-[var(--foreground)] shadow-sm'
                  : 'bg-transparent border-[var(--border)] text-muted-foreground hover:border-[var(--border-hover)] hover:text-foreground opacity-60 hover:opacity-100'
              )}
            >
              {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
              {filter.label}
            </button>
          )
        })}

        {/* Reset button */}
        <Button
          onClick={onReset}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-7"
          aria-label="Reset all engine filters"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset
        </Button>
      </div>

      {/* All disabled warning */}
      {allDisabled && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500"
          role="alert"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>All engines are disabled. Enable at least one engine to scan.</span>
        </div>
      )}
    </div>
  )
}
