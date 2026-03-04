/**
 * File: Sidebar.tsx
 * Purpose: Left sidebar navigation with collapse toggle, section dividers, tooltips, and activity feed
 * Story: TPI-UI-001-03, KASHIWA-P7-S70, TPI-UIP-08
 * Index:
 * - UnreadBadge component (line 20) — isolated state subscriber
 * - Sidebar component (line 38)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'
import { useActivityState } from '@/lib/contexts/ActivityContext'
import { Settings, PanelLeftClose, PanelLeft, ChevronDown } from 'lucide-react'
import { SidebarHeader } from './SidebarHeader'
import { ActivityFeed } from '@/components/ui/ActivityFeed'

// Computed once at module scope — NAV_ITEMS is a constant
// Admin is excluded from nav list — it has a dedicated button in the bottom section
const coreItems = NAV_ITEMS.filter(item => item.section === 'core' && item.id !== 'admin')
const advancedItems = NAV_ITEMS.filter(item => item.section === 'advanced')

/** Isolated component that subscribes to activity state for unread count.
 *  Prevents Sidebar from re-rendering on every activity event. */
function UnreadBadge() {
  const { events } = useActivityState()
  const unreadCount = events.filter(e => !e.read).length
  if (unreadCount === 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[var(--dojo-primary)] text-white rounded-full">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )
}

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigation()
  const [collapsed, setCollapsed] = useState(false)
  const [activityExpanded, setActivityExpanded] = useState(true)

  const renderNavItem = (item: typeof NAV_ITEMS[number]) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl relative w-[calc(100%-16px)]",
          "motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
          isActive
            ? "bg-[rgba(255,255,255,0.08)] text-[var(--foreground)]"
            : "text-muted-foreground hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
        )}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-[var(--bu-electric)]")} aria-hidden="true" />
        <span
          aria-hidden={collapsed ? true : undefined}
          className={cn(
            "font-medium whitespace-nowrap overflow-hidden",
            "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
            collapsed
              ? "opacity-0 w-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-hover:w-auto md:max-lg:group-focus-within:w-auto"
              : "opacity-100"
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <aside className={cn(
      "group hidden md:flex fixed left-0 top-0 h-screen bg-[var(--bg-secondary)] flex-col z-[var(--z-sidebar)] shadow-[1px_0_0_rgba(255,255,255,0.04)]",
      "motion-safe:transition-[width] motion-safe:duration-[var(--transition-normal)] motion-safe:ease-in-out",
      collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
      "md:max-lg:w-[var(--sidebar-collapsed)] md:max-lg:hover:w-[var(--sidebar-width)]"
    )}>
      {/* Header - co-branded */}
      <SidebarHeader collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
        {/* Core section */}
        {coreItems.map(renderNavItem)}

        {/* Section divider — dojo identity */}
        <div className="mx-4 my-3 dojo-divider" role="separator" />
        <div className={cn(
          "px-4 pb-1 text-[10px] uppercase tracking-wider text-[var(--text-quaternary)] font-semibold",
          "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
          collapsed
            ? "opacity-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-within:opacity-100"
            : "opacity-100"
        )}>
          Advanced
        </div>

        {/* Advanced section */}
        {advancedItems.map(renderNavItem)}
      </nav>

      {/* Activity Feed - collapsible section */}
      <div className={cn(
        "border-t border-[rgba(255,255,255,0.04)] overflow-hidden",
        "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
        collapsed
          ? "opacity-0 h-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-hover:h-auto md:max-lg:group-focus-within:opacity-100 md:max-lg:group-focus-within:h-auto"
          : "opacity-100"
      )}>
        <button
          onClick={() => setActivityExpanded(!activityExpanded)}
          className="flex items-center justify-between w-full px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--text-quaternary)] font-semibold hover:text-muted-foreground motion-safe:transition-colors"
          aria-expanded={activityExpanded}
          aria-controls="activity-feed-panel"
        >
          <span className="flex items-center gap-2">
            Activity
            <UnreadBadge />
          </span>
          <ChevronDown
            className={cn(
              "w-3 h-3 motion-safe:transition-transform motion-safe:duration-[var(--transition-fast)]",
              activityExpanded ? "rotate-0" : "-rotate-90"
            )}
            aria-hidden="true"
          />
        </button>
        {activityExpanded && (
          <div
            id="activity-feed-panel"
            className="max-h-48 overflow-y-auto"
          >
            <ActivityFeed maxVisible={5} />
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="p-2 border-t border-[rgba(255,255,255,0.04)]">
        <button
          onClick={() => setActiveTab('admin')}
          aria-label="Admin"
          aria-current={activeTab === 'admin' ? 'page' : undefined}
          title={collapsed ? 'Admin' : undefined}
          className={cn(
            "flex items-center gap-3 px-4 py-3 mx-2 w-[calc(100%-16px)] rounded-xl",
            "motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
            activeTab === 'admin'
              ? "bg-[rgba(255,255,255,0.08)] text-[var(--foreground)]"
              : "text-muted-foreground hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
          )}
        >
          <Settings className={cn("w-5 h-5 flex-shrink-0", activeTab === 'admin' && "text-[var(--bu-electric)]")} aria-hidden="true" />
          <span
            aria-hidden={collapsed ? true : undefined}
            className={cn(
              "font-medium whitespace-nowrap overflow-hidden",
              "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
              collapsed
                ? "opacity-0 w-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-hover:w-auto md:max-lg:group-focus-within:w-auto"
                : "opacity-100"
            )}
          >
            Admin
          </span>
        </button>
        {/* Collapse toggle (YouTube Analytics icon-only sidebar pattern) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-3 px-4 py-3 w-full rounded-md text-[var(--text-quaternary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5 flex-shrink-0" aria-hidden="true" /> : <PanelLeftClose className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
          <span
            aria-hidden={collapsed ? true : undefined}
            className={cn(
              "font-medium text-sm whitespace-nowrap overflow-hidden",
              "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}
