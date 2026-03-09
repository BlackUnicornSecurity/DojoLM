'use client'

/**
 * File: ModuleHeader.tsx
 * Purpose: Reusable module header with consistent icon badge, title, subtitle, and actions
 * Story: NODA-4 Story 2.4
 * Index:
 * - ModuleHeaderProps interface (line 12)
 * - ModuleHeader component (line 22)
 */

import type { LucideIcon } from 'lucide-react'

export interface ModuleHeaderProps {
  title: string
  subtitle: string
  icon: LucideIcon
  actions?: React.ReactNode
}

/**
 * ModuleHeader — Standardized header for all NODA modules.
 * 40x40 icon badge with dojo-primary, consistent title/subtitle typography.
 */
export function ModuleHeader({ title, subtitle, icon: Icon, actions }: ModuleHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--dojo-primary)]/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
