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
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-6 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <Icon className="w-5 h-5 text-muted-foreground/70" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button type="button" variant="ghost" size="sm" onClick={action.onClick} className="mt-3 text-xs">
          {action.label}
        </Button>
      )}
    </div>
  )
}
