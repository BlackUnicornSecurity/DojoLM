/**
 * File: Sidebar.tsx
 * Purpose: Left sidebar navigation with collapse toggle, section dividers, and tooltips
 * Story: TPI-UI-001-03, KASHIWA-P7-S70
 * Index:
 * - Sidebar component (line 15)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'
import { Settings, PanelLeftClose, PanelLeft } from 'lucide-react'
import { SidebarHeader } from './SidebarHeader'

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigation()
  const [collapsed, setCollapsed] = useState(false)

  const coreItems = NAV_ITEMS.filter(item => item.section === 'core')
  const advancedItems = NAV_ITEMS.filter(item => item.section === 'advanced')

  const renderNavItem = (item: typeof NAV_ITEMS[number]) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 mx-2 rounded-r-md relative w-[calc(100%-16px)]",
          "motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]",
          isActive
            ? "bg-[var(--dojo-subtle)] text-[var(--foreground)] border-l-[3px] border-l-[var(--dojo-primary)]"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] border-l-[3px] border-l-transparent"
        )}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-[var(--dojo-primary)]")} aria-hidden="true" />
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
      "group hidden md:flex fixed left-0 top-0 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col z-[var(--z-sidebar)]",
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

        {/* Section divider */}
        <div className="mx-4 my-3 border-t border-[var(--border)]" role="separator" />
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

      {/* Bottom section */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          aria-label="Settings"
          title={collapsed ? 'Settings' : undefined}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] transition-colors"
        >
          <Settings className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
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
            Settings
          </span>
        </button>
        {/* Collapse toggle (YouTube Analytics icon-only sidebar pattern) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-3 px-4 py-3 w-full rounded-md text-[var(--text-quaternary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] transition-colors"
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
