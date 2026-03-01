/**
 * File: StatusDot.tsx
 * Purpose: Visual status indicators with pulse animation for system health
 * Story: TPI-UI-001-16
 */

import { cn } from '@/lib/utils'

type StatusType = 'online' | 'offline' | 'idle' | 'loading'

const statusConfig = {
  online: {
    color: 'bg-[var(--success)]',
    pulse: true,
    label: 'Online',
  },
  offline: {
    color: 'bg-[var(--danger)]',
    pulse: false,
    label: 'Offline',
  },
  idle: {
    color: 'bg-[var(--warning)]',
    pulse: false,
    label: 'Idle',
  },
  loading: {
    color: 'bg-[var(--ring)]',
    pulse: true,
    label: 'Loading',
  },
}

interface StatusDotProps {
  status: StatusType
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusDot({
  status,
  label,
  showLabel = false,
  size = 'md',
  className,
}: StatusDotProps) {
  const config = statusConfig[status]
  const sizeClasses = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }
  const displayLabel = label || config.label

  return (
    <span className={cn("inline-flex items-center gap-2", className)} role="status" aria-label={displayLabel}>
      <span className="relative flex">
        <span className={cn(
          "rounded-full",
          sizeClasses[size],
          config.color
        )} />
        {config.pulse && (
          <span className={cn(
            "absolute inset-0 rounded-full motion-safe:animate-ping opacity-75",
            config.color
          )} />
        )}
      </span>
      {showLabel && (
        <span className="text-xs text-[var(--muted-foreground)]">
          {displayLabel}
        </span>
      )}
    </span>
  )
}
