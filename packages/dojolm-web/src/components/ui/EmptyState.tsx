/**
 * File: EmptyState.tsx
 * Purpose: Informative empty states with icon, title, description, illustration, hint, and CTA
 * Story: TPI-UI-001-21, TPI-NODA-9.6
 * Index:
 * - EmptyStateProps (line 11)
 * - EmptyState component (line 22)
 * - emptyStatePresets (line 52)
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { SearchX, Shield, FlaskConical, Activity, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  /** Optional SVG illustration rendered above the icon */
  illustration?: ReactNode
  /** Optional secondary hint text below description */
  hint?: string
  className?: string
}

export function EmptyState({ icon: Icon = SearchX, title, description, action, illustration, hint, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      "motion-safe:animate-fade-in",
      className,
    )}>
      {illustration && (
        <div className="mb-4 motion-safe:animate-fade-in" style={{ animationDelay: '50ms' }}>
          {illustration}
        </div>
      )}
      <div className="w-16 h-16 rounded-full bg-[var(--bg-quaternary)] flex items-center justify-center mb-4 motion-safe:animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Icon className="w-8 h-8 text-[var(--text-tertiary)]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 motion-safe:animate-fade-in" style={{ animationDelay: '150ms' }}>{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-2 motion-safe:animate-fade-in" style={{ animationDelay: '200ms' }}>{description}</p>
      {hint && (
        <p className="text-xs text-muted-foreground/70 max-w-sm mb-4 motion-safe:animate-fade-in" style={{ animationDelay: '250ms' }}>{hint}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="motion-safe:animate-fade-in" style={{ animationDelay: '300ms' }}>{action.label}</Button>
      )}
    </div>
  )
}

/** Preset empty states for common scenarios — dojo-flavored copy */
export const emptyStatePresets = {
  noScans: {
    icon: Shield,
    title: 'The dojo is quiet',
    description: 'Begin your first scan to detect prompt injection threats. Enter text or select a fixture to start training.',
  },
  noTests: {
    icon: FlaskConical,
    title: 'No test sessions recorded',
    description: 'Select test categories and models to begin your assessment. Each test strengthens your defenses.',
  },
  noResults: {
    icon: SearchX,
    title: 'No matches found',
    description: 'Adjust your search or filters to reveal hidden patterns.',
  },
  noData: {
    icon: Activity,
    title: 'No sessions yet',
    description: 'Activity will appear here once you start scanning or testing.',
  },
}
