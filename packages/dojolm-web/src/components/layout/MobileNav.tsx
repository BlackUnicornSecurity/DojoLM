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
import { NAV_ITEMS } from '@/lib/constants'
import { MoreHorizontal, X } from 'lucide-react'

/** Primary nav items shown in bottom bar (6 items per UX requirement) */
const PRIMARY_NAV_IDS = new Set(['dashboard', 'scanner', 'testing', 'llm', 'guard', 'adversarial'])

const primaryItems = NAV_ITEMS.filter(item => PRIMARY_NAV_IDS.has(item.id))
const moreItems = NAV_ITEMS.filter(item => !PRIMARY_NAV_IDS.has(item.id))

export function MobileNav() {
  const { activeTab, setActiveTab } = useNavigation()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleNavClick = useCallback((id: string) => {
    setActiveTab(id as typeof activeTab)
    setMoreOpen(false)
  }, [setActiveTab])

  // Check if active tab is in the "more" menu
  const isMoreActive = moreItems.some(item => item.id === activeTab)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center md:hidden z-[var(--z-mobile-nav)] pb-safe"
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
                  'flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-1 h-full',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                  'active:scale-95',
                  isActive ? 'text-[var(--bu-electric)]' : 'text-[var(--text-tertiary)]'
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[9px] mt-0.5 whitespace-nowrap">{item.label}</span>
              </button>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-label={moreOpen ? 'Close more menu' : 'More navigation options'}
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-1 h-full',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              'active:scale-95',
              (moreOpen || isMoreActive) ? 'text-[var(--bu-electric)]' : 'text-[var(--text-tertiary)]'
            )}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span className="text-[9px] mt-0.5 whitespace-nowrap">More</span>
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
  activeTab: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
          'fixed bottom-16 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border)]',
          'rounded-t-2xl z-[var(--z-mobile-nav)] md:hidden pb-safe',
          'motion-safe:animate-slide-up'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-medium">More</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]"
            aria-label="Close more menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="py-2 px-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-3 rounded-lg min-h-[44px]',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
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
