'use client'

/**
 * File: SeverityBadge.tsx
 * Purpose: Standalone severity indicator badge using design tokens
 * Story: TPI-UIP-05
 * Index:
 * - SeverityBadgeProps interface (line 14)
 * - severityConfig map (line 22)
 * - SeverityBadge component (line 40)
 */

import { type Severity } from '@/lib/types'
import { ShieldAlert, AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SeverityBadgeProps {
  severity: Severity
  showIcon?: boolean
  className?: string
}

const severityConfig: Record<SeverityBadgeProps['severity'], {
  icon: LucideIcon
  label: string
  classes: string
}> = {
  CRITICAL: {
    icon: ShieldAlert,
    label: 'Critical',
    classes: 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20',
  },
  WARNING: {
    icon: AlertTriangle,
    label: 'Warning',
    classes: 'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
  },
  INFO: {
    icon: Info,
    label: 'Info',
    classes: 'text-[var(--severity-low)] bg-[var(--severity-low)]/10 border-[var(--severity-low)]/20',
  },
}

export function SeverityBadge({ severity, showIcon = true, className }: SeverityBadgeProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.classes,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </span>
  )
}
