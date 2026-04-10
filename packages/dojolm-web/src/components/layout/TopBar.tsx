/**
 * File: TopBar.tsx
 * Purpose: Global chrome top bar — hosts Notifications, Sensei toggle,
 *          and Activity drawer trigger. New file for Train 1 PR-2.
 * Story: Train 1 PR-2 (relocate Activity/Sensei/Notifications from sidebar)
 *
 * NOT a replacement for PageToolbar.tsx — PageToolbar remains for per-page
 * title/breadcrumbs/search. TopBar is the persistent global chrome.
 *
 * Pattern: inspired by BUCC-mem0 `top-bar.tsx` but scoped to DojoLM's
 * tab-based SPA navigation (no URL routing, no page title display).
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Activity, Bot, Search } from 'lucide-react'
import { NotificationsPanel } from './NotificationsPanel'
import { useActivityState } from '@/lib/contexts/ActivityContext'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { CommandPalette } from './CommandPalette'

/**
 * Isolated component that subscribes to activity state for unread count.
 * Prevents TopBar from re-rendering on every activity event.
 */
function ActivityButton({ onToggle }: { readonly onToggle: () => void }) {
  const { events } = useActivityState()
  const unreadCount = events.filter(e => !e.read).length
  return (
    <button
      onClick={onToggle}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--foreground)]"
      aria-label={`Activity feed${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      title="Activity feed"
      type="button"
    >
      <Activity className="h-[18px] w-[18px]" aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--dojo-primary)] px-1 text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

export function TopBar() {
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false)
  // Train 2 PR-4c.3 — Command Palette (Cmd+K)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // SSR-safe platform detection (avoids hydration mismatch from navigator.userAgent)
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent))
  }, [])

  const toggleActivityDrawer = useCallback(() => {
    setActivityDrawerOpen(prev => !prev)
  }, [])

  const closeActivityDrawer = useCallback(() => {
    setActivityDrawerOpen(false)
  }, [])

  const handleSenseiToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent('sensei-toggle'))
  }, [])

  // Global Cmd+K / Ctrl+K hotkey for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed right-0 top-0 z-[var(--z-sidebar)] hidden h-14 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--background)]/80 px-4 backdrop-blur-md md:flex',
          'transition-[left] duration-200 ease-in-out',
          'left-[var(--sidebar-width)]'
        )}
        aria-label="Top bar"
      >
        {/* Spacer — per-page title/breadcrumbs remain rendered by PageToolbar.tsx */}
        <div className="flex-1" />

        {/* Command Palette trigger (Train 2 PR-4c.3) */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--foreground)]"
          aria-label="Open command palette"
          title="Search modules (Cmd+K)"
          type="button"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">Search...</span>
          <kbd className="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-1 py-0.5 text-[10px] font-medium lg:inline-block">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {/* Activity drawer trigger (replaces sidebar Activity section) */}
        <ActivityButton onToggle={toggleActivityDrawer} />

        {/* Sensei toggle (relocated from sidebar bottom) */}
        <button
          onClick={handleSenseiToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--foreground)]"
          aria-label="Open Sensei AI assistant"
          title="Sensei"
          type="button"
        >
          <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        {/* Notifications (relocated from SidebarHeader) */}
        <NotificationsPanel />
      </header>

      {/* Activity drawer — slide-in from right */}
      {activityDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-dropdown)] bg-black/40 backdrop-blur-sm md:bg-black/20"
            onClick={closeActivityDrawer}
            aria-hidden="true"
          />
          <aside
            className="fixed right-0 top-0 z-[calc(var(--z-dropdown)+1)] flex h-screen w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--background)] shadow-2xl"
            aria-label="Activity feed drawer"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Activity</h2>
              <button
                onClick={closeActivityDrawer}
                className="rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--foreground)]"
                aria-label="Close activity feed"
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ActivityFeed maxVisible={20} />
            </div>
          </aside>
        </>
      )}

      {/* Command Palette — global Cmd+K navigation (PR-4c.3) */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
