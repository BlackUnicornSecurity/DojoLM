/**
 * File: Sidebar.tsx
 * Purpose: Left sidebar navigation — flat BUCC-pattern rewrite.
 * Story: TPI-UI-001-03, KASHIWA-P7-S70, TPI-UIP-08, NODA-3 Story 2.2,
 *        Train 1 PR-2 (263 → ~110 lines, BUCC-flat rewrite)
 *
 * Rewrite notes (2026-04-09):
 * - Flat nav items (no icon containers, no per-item shadows, no hover description row)
 * - Active state: bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary-lg)] (overrides brand tint)
 * - Activity feed → relocated to TopBar drawer
 * - Sensei toggle → relocated to TopBar
 * - Admin → demoted from dedicated bottom button to regular nav item
 * - BUG-006 --sidebar-current runtime sync → deleted per stakeholder decision
 *   (new topbar-based shell uses fixed --sidebar-width for content padding)
 * - md:max-lg:group-hover auto-expand → deleted
 * - Single icon-only collapse button at bottom
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, NAV_GROUPS } from '@/lib/constants'
import type { NavId, NavItem } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'
import { useModuleVisibility } from '@/lib/contexts/ModuleVisibilityContext'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { SidebarHeader } from './SidebarHeader'

// Dashboard is ungrouped (top). Admin is ungrouped (bottom, above collapse toggle).
const dashboardItem = NAV_ITEMS.find(item => item.id === 'dashboard')!
const adminItem = NAV_ITEMS.find(item => item.id === 'admin')
const groupedItems = NAV_ITEMS.filter(item => 'group' in item)

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigation()
  const { isVisible } = useModuleVisibility()
  const [collapsed, setCollapsed] = useState(false)

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    // Optional fields added in Train 2 PR-4b.1 + PR-2.5
    const functionalLabel = 'functionalLabel' in item ? item.functionalLabel : undefined
    const brandColor = 'brandColor' in item ? item.brandColor : undefined
    const hasSubtitle = !!functionalLabel && functionalLabel !== item.label

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id as NavId)}
        data-nav-id={item.id}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors w-full',
          isActive
            ? 'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary-lg)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--foreground)]',
          collapsed && 'justify-center'
        )}
      >
        {/* Brand-tinted icon (inactive only — active state overrides per M7) */}
        <Icon
          className="h-[18px] w-[18px] flex-shrink-0"
          style={!isActive && brandColor ? { color: brandColor } : undefined}
          aria-hidden="true"
        />
        {!collapsed && (
          <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
            {/* Function headline (big) + codename subtitle (small) per finding N1 */}
            <span className="truncate text-[13px] font-medium">
              {functionalLabel ?? item.label}
            </span>
            {hasSubtitle && (
              <span className="truncate text-[10px] text-[var(--text-tertiary)]">
                {item.label}
              </span>
            )}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-[var(--z-sidebar)] hidden h-screen flex-col border-r border-[var(--border-subtle)] bg-[var(--background)] md:flex',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
      aria-label="Primary navigation"
    >
      {/* Co-branded flat header */}
      <SidebarHeader collapsed={collapsed} />

      {/* Main nav — Dashboard ungrouped at top, then groups, then Admin at bottom */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {/* Dashboard (ungrouped, always visible at top) */}
        {renderNavItem(dashboardItem)}

        {/* Grouped sections */}
        {NAV_GROUPS.map((group, gi) => {
          const items = groupedItems.filter(
            item => 'group' in item && item.group === group.id && isVisible(item.id)
          )
          if (items.length === 0) return null
          return (
            <div key={group.id}>
              {/* Group separator + label */}
              <div className="mx-2 my-2 border-t border-[var(--border-subtle)]" aria-hidden="true" />
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
                  {group.label}
                </p>
              )}
              {items.map(renderNavItem)}
            </div>
          )
        })}

        {/* Admin (ungrouped, always visible at bottom of nav list) */}
        {adminItem && isVisible('admin') && (
          <>
            <div
              className="mx-2 my-2 border-t border-[var(--border-subtle)]"
              aria-hidden="true"
            />
            {renderNavItem(adminItem)}
          </>
        )}
      </nav>

      {/* Collapse toggle (icon-only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--foreground)]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </aside>
  )
}
