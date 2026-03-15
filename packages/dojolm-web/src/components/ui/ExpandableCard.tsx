'use client'

/**
 * File: ExpandableCard.tsx
 * Purpose: Reusable expandable/collapsible card with smooth animation
 * Story: HAKONE H5.1
 * Index:
 * - ExpandableCardProps (line 14)
 * - ExpandableCard component (line 27)
 */

import { useState, useCallback, useRef, useId } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface ExpandableCardProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  defaultExpanded?: boolean
  onToggle?: (expanded: boolean) => void
  children: React.ReactNode
  className?: string
  headerClassName?: string
}

export function ExpandableCard({
  title,
  subtitle,
  badge,
  defaultExpanded = false,
  onToggle,
  children,
  className,
  headerClassName,
}: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const headerId = useId()

  const handleToggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev
      onToggle?.(next)
      return next
    })
  }, [onToggle])

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-card overflow-hidden',
        className,
      )}
    >
      {/* Header — always visible */}
      <button
        id={headerId}
        type="button"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 p-3 text-left',
          'hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          'min-h-[44px]',
          headerClassName,
        )}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium truncate block">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground truncate block">{subtitle}</span>
            )}
          </div>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground',
            'motion-safe:transition-transform motion-safe:duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Expandable body */}
      <div
        id={panelId}
        ref={contentRef}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200',
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="p-3 pt-0 border-t border-[var(--border)]">
          {children}
        </div>
      </div>
    </div>
  )
}
