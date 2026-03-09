/**
 * File: Sidebar.tsx
 * Purpose: Left sidebar navigation with collapse toggle, tooltips, and activity feed
 * Story: TPI-UI-001-03, KASHIWA-P7-S70, TPI-UIP-08, NODA-3 Story 2.2
 * Index:
 * - UnreadBadge component (line 20) — isolated state subscriber
 * - Sidebar component (line 38)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, NAV_GROUPS } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'
import { useActivityState } from '@/lib/contexts/ActivityContext'
import { PanelLeftClose, PanelLeft, ChevronDown } from 'lucide-react'
import { SidebarHeader } from './SidebarHeader'
import { ActivityFeed } from '@/components/ui/ActivityFeed'

// Dashboard is ungrouped (top), admin excluded (has dedicated button at bottom)
const dashboardItem = NAV_ITEMS.find(item => item.id === 'dashboard')!
const adminItem = NAV_ITEMS.find(item => item.id === 'admin')
const groupedItems = NAV_ITEMS.filter(item => 'group' in item)

/** Isolated component that subscribes to activity state for unread count.
 *  Prevents Sidebar from re-rendering on every activity event. */
function UnreadBadge() {
  const { events } = useActivityState()
  const unreadCount = events.filter(e => !e.read).length
  if (unreadCount === 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-[var(--dojo-primary)] text-white rounded-full">
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
          "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg relative w-[calc(100%-16px)]",
          "motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
          isActive
            ? "nav-item-active"
            : "text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--overlay-subtle)]"
        )}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "nav-item-active-icon")} aria-hidden="true" />
        <span
          aria-hidden="true"
          className={cn(
            "font-medium whitespace-nowrap overflow-hidden",
            "motion-safe:transition-[opacity,width] motion-safe:ease-in-out",
            collapsed
              ? "opacity-0 w-0 motion-safe:duration-100 md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-hover:w-auto md:max-lg:group-focus-within:w-auto"
              : "opacity-100 motion-safe:duration-[var(--transition-normal)] motion-safe:delay-75"
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  if (!adminItem) return null
  const AdminIcon = adminItem.icon

  return (
    <aside className={cn(
      "group hidden md:flex fixed left-0 top-0 h-screen bg-[var(--background)] border-r border-[var(--border-subtle)] flex-col z-[var(--z-sidebar)]",
      "motion-safe:transition-[width] motion-safe:duration-[var(--transition-normal)] motion-safe:ease-in-out",
      collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
      "md:max-lg:w-[var(--sidebar-collapsed)] md:max-lg:hover:w-[var(--sidebar-width)]"
    )}>
      {/* Header - co-branded */}
      <SidebarHeader collapsed={collapsed} />

      {/* Navigation — grouped by function (Story 4.1) */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
        {/* Dashboard — always visible at top, ungrouped */}
        {renderNavItem(dashboardItem)}

        {/* Grouped sections */}
        {NAV_GROUPS.map((group) => {
          const items = groupedItems.filter(item => 'group' in item && item.group === group.id)
          if (items.length === 0) return null
          return (
            <div key={group.id} className="mt-4 first:mt-2">
              <div className="w-6 h-px bg-[var(--border-subtle)] mx-6 mb-1" aria-hidden="true" />
              <span
                aria-hidden={collapsed ? true : undefined}
                className={cn(
                  "block px-6 py-1 text-xs uppercase tracking-wider text-[var(--text-tertiary)] font-semibold overflow-hidden",
                  "motion-safe:transition-[opacity,max-height] motion-safe:ease-in-out",
                  collapsed
                    ? "opacity-0 max-h-0 motion-safe:duration-100 md:max-lg:group-hover:opacity-100 md:max-lg:group-hover:max-h-8 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-focus-within:max-h-8"
                    : "opacity-100 max-h-8 motion-safe:duration-[var(--transition-normal)] motion-safe:delay-75"
                )}
              >
                {group.label}
              </span>
              {items.map(renderNavItem)}
            </div>
          )
        })}
      </nav>

      {/* Activity Feed - collapsible section */}
      <div className={cn(
        "border-t border-[var(--overlay-subtle)] overflow-hidden",
        "motion-safe:transition-[opacity,max-height] motion-safe:duration-[var(--transition-normal)]",
        collapsed
          ? "opacity-0 max-h-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-hover:max-h-96 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-focus-within:max-h-96"
          : "opacity-100 max-h-96"
      )}>
        <button
          onClick={() => setActivityExpanded(!activityExpanded)}
          className="flex items-center justify-between w-full px-4 py-2 text-xs uppercase tracking-wider text-[var(--text-tertiary)] font-semibold hover:text-muted-foreground motion-safe:transition-colors"
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
        <div
          id="activity-feed-panel"
          className={cn(
            "overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-[var(--transition-normal)] motion-safe:ease-in-out",
            activityExpanded ? "max-h-48 opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
          )}
        >
          <ActivityFeed maxVisible={5} />
        </div>
      </div>

      {/* Bottom section — Admin + Collapse */}
      <div className="p-2 border-t border-[var(--overlay-subtle)]">
        <button
          onClick={() => setActiveTab('admin')}
          aria-label="Admin"
          aria-current={activeTab === 'admin' ? 'page' : undefined}
          title={collapsed ? 'Admin' : undefined}
          className={cn(
            "flex items-center gap-3 px-4 py-3 mx-2 w-[calc(100%-16px)] rounded-lg",
            "motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
            activeTab === 'admin'
              ? "nav-item-active"
              : "text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--overlay-subtle)]"
          )}
        >
          <AdminIcon className={cn("w-5 h-5 flex-shrink-0", activeTab === 'admin' && "nav-item-active-icon")} aria-hidden="true" />
          <span
            aria-hidden="true"
            className={cn(
              "font-medium whitespace-nowrap overflow-hidden",
              "motion-safe:transition-[opacity,width] motion-safe:ease-in-out",
              collapsed
                ? "opacity-0 w-0 motion-safe:duration-100 md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-within:opacity-100 md:max-lg:group-hover:w-auto md:max-lg:group-focus-within:w-auto"
                : "opacity-100 motion-safe:duration-[var(--transition-normal)] motion-safe:delay-75"
            )}
          >
            Admin
          </span>
        </button>
        {/* Collapse toggle (YouTube Analytics icon-only sidebar pattern) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center gap-3 px-4 py-3 w-full rounded-lg text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5 flex-shrink-0" aria-hidden="true" /> : <PanelLeftClose className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
          <span
            aria-hidden="true"
            className={cn(
              "font-medium text-sm whitespace-nowrap overflow-hidden",
              "motion-safe:transition-[opacity,width] motion-safe:ease-in-out",
              collapsed ? "opacity-0 w-0 motion-safe:duration-100" : "opacity-100 motion-safe:duration-[var(--transition-normal)] motion-safe:delay-75"
            )}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}
