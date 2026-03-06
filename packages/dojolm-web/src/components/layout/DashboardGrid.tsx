/**
 * File: DashboardGrid.tsx
 * Purpose: Responsive dashboard grid system with layout primitives and WidgetCard
 * Story: TPI-UI-001-12
 * Index:
 * - MetricGrid component (line 14) - 2x2→4-column responsive KPI grid
 * - SplitView component (line 26) - Main content (2/3) + side panel (1/3)
 * - MainPanel component (line 38) - 2-col span inside SplitView
 * - SidePanel component (line 48) - 1-col span inside SplitView
 * - FullWidthRow component (line 58) - Full-width section for charts
 * - WidgetCard component (line 68) - Card with action header (title + action buttons)
 */

'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RefreshCw, Maximize2, Settings } from 'lucide-react'

interface DashboardGridProps {
  children: ReactNode
  className?: string
}

/** 2x2 metric grid - for top-level KPIs */
export function MetricGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)]",
      className
    )}>
      {children}
    </div>
  )
}

/** Split view - main content (2/3) + side panel (1/3) */
export function SplitView({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]",
      className
    )}>
      {children}
    </div>
  )
}

/** Main panel inside SplitView (spans 2 cols on desktop) */
export function MainPanel({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("lg:col-span-2", className)}>
      {children}
    </div>
  )
}

/** Side panel inside SplitView (spans 1 col) */
export function SidePanel({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("lg:col-span-1", className)}>
      {children}
    </div>
  )
}

/** Full-width row for charts or wide content */
export function FullWidthRow({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  )
}

export interface WidgetCardAction {
  icon: 'refresh' | 'expand' | 'settings'
  onClick: () => void
  label: string
}

export interface WidgetCardProps {
  title: string
  actions?: WidgetCardAction[]
  children: ReactNode
  className?: string
}

const actionIcons = {
  refresh: RefreshCw,
  expand: Maximize2,
  settings: Settings,
} as const

/** Card with action header (title + action buttons: refresh, expand, settings) */
export function WidgetCard({ title, actions, children, className }: WidgetCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-[var(--spacing-md)]">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-1">
            {actions.map((action, index) => {
              const IconComponent = actionIcons[action.icon]
              return (
                <button
                  key={`${action.icon}-${index}`}
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={cn(
                    "p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center",
                    "text-muted-foreground",
                    "motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]",
                    "hover:text-[var(--foreground)] hover:bg-[var(--accent)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  )}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-[var(--spacing-md)] pb-[var(--spacing-md)] pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
