'use client'

/**
 * File: WidgetEmptyState.tsx
 * Purpose: Consistent empty state component for dashboard widgets
 * Story: NODA-4 Story 3.4
 * Index:
 * - WidgetEmptyStateProps interface (line 11)
 * - WidgetEmptyState component (line 20)
 */

import type { LucideIcon } from 'lucide-react'

export interface WidgetEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/**
 * WidgetEmptyState — Shared empty state pattern for all dashboard widgets.
 */
export function WidgetEmptyState({ icon: Icon, title, description, action }: WidgetEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
      <p className="text-xs font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs text-[var(--dojo-primary)] hover:underline mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
