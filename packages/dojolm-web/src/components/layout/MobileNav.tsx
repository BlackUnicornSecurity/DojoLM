'use client'

/**
 * File: MobileNav.tsx
 * Purpose: Bottom navigation bar for mobile (<768px) with 6 primary items + More drawer
 * Story: TPI-UIP-13
 * Index:
 * - PRIMARY_NAV_IDS (line 14)
 * - MobileNav (line 19)
 * - MoreDrawer (line 82)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, NAV_GROUPS } from '@/lib/constants'
import type { NavId } from '@/lib/constants'
import { useModuleVisibility } from '@/lib/contexts/ModuleVisibilityContext'
import { MoreHorizontal, X } from 'lucide-react'

/** Primary nav items shown in bottom bar (4 items + More per Story 4.3) */
const PRIMARY_NAV_IDS = new Set(['dashboard', 'scanner', 'llm', 'guard'])
const MOBILE_LABELS: Partial<Record<NavId, string>> = {
  dashboard: 'Home',
  scanner: 'Scan',
  llm: 'LLM',
  guard: 'Guard',
}

const allPrimaryItems = NAV_ITEMS.filter(item => PRIMARY_NAV_IDS.has(item.id))
const allMoreItems = NAV_ITEMS.filter(item => !PRIMARY_NAV_IDS.has(item.id))

export function MobileNav() {
  const { activeTab, setActiveTab } = useNavigation()
  const { isVisible } = useModuleVisibility()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleNavClick = useCallback((id: NavId) => {
    setActiveTab(id)
    setMoreOpen(false)
  }, [setActiveTab])

  const primaryItems = allPrimaryItems.filter(item => isVisible(item.id))
  const moreItems = allMoreItems.filter(item => isVisible(item.id))

  // Check if active tab is in the "more" menu
  const isMoreActive = moreItems.some(item => item.id === activeTab)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 border-t border-[var(--border)] bg-[rgba(10,11,17,0.92)] backdrop-blur-xl flex items-center md:hidden z-[var(--z-mobile-nav)] pb-safe overflow-x-hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around w-full px-1">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1 h-full',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                  'active:scale-95'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent',
                    'motion-safe:transition-[background-color,border-color,color,transform] motion-safe:duration-[var(--transition-fast)]',
                    isActive
                      ? 'bg-[var(--bu-electric-subtle)] border-[var(--bu-electric-muted)] text-[var(--foreground)] shadow-[0_6px_16px_rgba(91,141,239,0.12)]'
                      : 'text-[var(--text-tertiary)]'
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className={cn('text-[11px] mt-0.5 whitespace-nowrap', isActive ? 'text-[var(--foreground)]' : 'text-[var(--text-tertiary)]')}>
                  {MOBILE_LABELS[item.id] ?? item.label}
                </span>
              </button>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-label={moreOpen ? 'Close more menu' : 'More navigation options'}
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1 h-full',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              'active:scale-95'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent',
                'motion-safe:transition-[background-color,border-color,color,transform] motion-safe:duration-[var(--transition-fast)]',
                (moreOpen || isMoreActive)
                  ? 'bg-[var(--bu-electric-subtle)] border-[var(--bu-electric-muted)] text-[var(--foreground)] shadow-[0_6px_16px_rgba(91,141,239,0.12)]'
                  : 'text-[var(--text-tertiary)]'
              )}
            >
              <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className={cn('text-[11px] mt-0.5 whitespace-nowrap', (moreOpen || isMoreActive) ? 'text-[var(--foreground)]' : 'text-[var(--text-tertiary)]')}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      {moreOpen && (
        <MoreDrawer
          items={moreItems}
          activeTab={activeTab}
          onSelect={handleNavClick}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  )
}

function MoreDrawer({
  items,
  activeTab,
  onSelect,
  onClose,
}: {
  items: ReadonlyArray<typeof NAV_ITEMS[number]>
  activeTab: NavId
  onSelect: (id: NavId) => void
  onClose: () => void
}) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape + focus trap for keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Focus trap — cycle between first and last focusable elements
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus first item on open
  useEffect(() => {
    const firstButton = drawerRef.current?.querySelector('button')
    if (firstButton) {
      requestAnimationFrame(() => (firstButton as HTMLElement).focus())
    }
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[calc(var(--z-mobile-nav)-1)] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className={cn(
          'fixed bottom-16 left-0 right-0 border-t border-[var(--border)] bg-[rgba(10,11,17,0.96)] backdrop-blur-xl',
          'rounded-t-3xl z-[var(--z-mobile-nav)] md:hidden pb-safe max-h-[70vh] overflow-y-auto',
          'motion-safe:animate-slide-up'
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-[var(--border)]" aria-hidden="true" />
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-medium">More</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Close more menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="py-2 px-2">
          {NAV_GROUPS.map((group, groupIdx) => {
            const groupItems = items.filter(item => 'group' in item && item.group === group.id)
            if (groupItems.length === 0) return null
            return (
              <div key={group.id}>
                {groupIdx > 0 && <div className="mx-3 my-1 border-t border-[var(--border)]" />}
                <span className="mx-3 mt-2 inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-semibold">
                  {group.label}
                </span>
                {groupItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-3 rounded-lg min-h-[48px]',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                        'active:scale-[0.98]',
                        isActive
                          ? 'bg-[var(--bu-electric-subtle)] text-[var(--bu-electric)]'
                          : 'text-muted-foreground hover:bg-[var(--bg-quaternary)]'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {/* Ungrouped more items (e.g., admin) */}
          {items.filter(item => !('group' in item)).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-3 rounded-lg min-h-[48px]',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                  'active:scale-[0.98]',
                  isActive
                    ? 'bg-[var(--bu-electric-subtle)] text-[var(--bu-electric)]'
                    : 'text-muted-foreground hover:bg-[var(--bg-quaternary)]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
