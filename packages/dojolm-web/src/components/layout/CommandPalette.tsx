/**
 * File: CommandPalette.tsx
 * Purpose: Global Cmd+K command palette for navigating DojoLM modules.
 * Story: Train 2 PR-4c.3
 *
 * Built on `cmdk` (pacocoursey) — accessible dialog with keyboard nav,
 * focus traps, and fuzzy search. Per adversarial finding M5: uses an
 * existing primitive instead of building from scratch.
 *
 * Fuzzy-searches over NAV_ITEMS by label, functionalLabel, description,
 * and codename. Selecting an item calls setActiveTab(item.id) and closes.
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Command } from 'cmdk'
import { NAV_ITEMS, NAV_GROUPS } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavGroup = typeof NAV_GROUPS[number]['id']

/** Visible (non-hidden) NAV_ITEMS for the palette. */
const PALETTE_ITEMS = NAV_ITEMS.filter(
  item => !('hidden' in item && item.hidden === true)
)

/** Group items by their nav group, plus ungrouped (dashboard, admin). */
const GROUPED_ITEMS = (() => {
  const groups: Record<string, typeof PALETTE_ITEMS> = {}
  const ungrouped: typeof PALETTE_ITEMS = []

  for (const item of PALETTE_ITEMS) {
    const group = 'group' in item ? (item.group as string) : undefined
    if (group) {
      groups[group] ??= []
      groups[group].push(item)
    } else {
      ungrouped.push(item)
    }
  }
  return { groups, ungrouped }
})()

export interface CommandPaletteProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { setActiveTab } = useNavigation()
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the search input when the palette opens.
  useEffect(() => {
    if (open) {
      setSearch('')
      // Small delay to ensure the dialog is mounted and visible.
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const handleSelect = useCallback(
    (navId: string) => {
      setActiveTab(navId)
      onOpenChange(false)
    },
    [setActiveTab, onOpenChange],
  )

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Palette dialog */}
      <div
        className="fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-start justify-center pt-[min(20vh,120px)]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <Command
          className={cn(
            'w-full max-w-lg rounded-xl border border-[var(--border-subtle)]',
            'bg-[var(--background)] shadow-2xl',
            'motion-safe:animate-fade-in',
          )}
          shouldFilter={true}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onOpenChange(false)
            }
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search modules..."
              className={cn(
                'h-12 w-full bg-transparent text-sm text-[var(--foreground)]',
                'placeholder:text-[var(--text-tertiary)]',
                'outline-none',
              )}
            />
            <kbd className="hidden shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <Command.List className="max-h-[min(50vh,400px)] overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--text-tertiary)]">
              No modules found.
            </Command.Empty>

            {/* Ungrouped items (Dashboard, Admin) */}
            {GROUPED_ITEMS.ungrouped.length > 0 && (
              <Command.Group>
                {GROUPED_ITEMS.ungrouped.map(item => (
                  <PaletteItem
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </Command.Group>
            )}

            {/* Grouped items by NavGroup */}
            {NAV_GROUPS.map(group => {
              const items = GROUPED_ITEMS.groups[group.id]
              if (!items?.length) return null
              return (
                <Command.Group
                  key={group.id}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
                >
                  {items.map(item => (
                    <PaletteItem
                      key={item.id}
                      item={item}
                      onSelect={handleSelect}
                    />
                  ))}
                </Command.Group>
              )
            })}
          </Command.List>

          {/* Footer with keyboard hints */}
          <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
              select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-1 py-0.5 text-[9px]">esc</kbd>
              close
            </span>
          </div>
        </Command>
      </div>
    </>
  )
}

/** Individual nav item in the palette. */
function PaletteItem({
  item,
  onSelect,
}: {
  readonly item: typeof PALETTE_ITEMS[number]
  readonly onSelect: (id: string) => void
}) {
  const Icon = item.icon
  const label = item.label
  const sublabel = 'functionalLabel' in item ? item.functionalLabel : undefined

  return (
    <Command.Item
      value={`${item.id} ${label} ${sublabel ?? ''} ${item.description}`}
      onSelect={() => onSelect(item.id)}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
        'text-[var(--foreground)] transition-colors',
        'aria-selected:bg-[var(--dojo-primary)]/10 aria-selected:text-[var(--dojo-primary)]',
        'hover:bg-[var(--bg-tertiary)]',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] aria-selected:text-[var(--dojo-primary)]" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{label}</div>
        {sublabel && sublabel !== label && (
          <div className="truncate text-xs text-[var(--text-tertiary)]">{sublabel}</div>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-[var(--text-tertiary)] opacity-60">
        {item.description.slice(0, 40)}
        {item.description.length > 40 ? '...' : ''}
      </span>
    </Command.Item>
  )
}
