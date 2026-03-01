/**
 * File: EmptyState.tsx
 * Purpose: Informative empty states with icon, title, description, and CTA
 * Story: TPI-UI-001-21
 */

import { cn } from '@/lib/utils'
import { Button } from './button'
import { SearchX, Shield, FlaskConical, Database, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon = SearchX, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-[var(--bg-quaternary)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--text-tertiary)]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

/** Preset empty states for common scenarios */
export const emptyStatePresets = {
  noScans: {
    icon: Shield,
    title: 'No scan results yet',
    description: 'Run your first scan to detect prompt injection vulnerabilities in your content.',
  },
  noTests: {
    icon: FlaskConical,
    title: 'No test results',
    description: 'Select test categories and run the test suite to see results here.',
  },
  noResults: {
    icon: SearchX,
    title: 'No results found',
    description: 'Try adjusting your search query or filters to find what you\'re looking for.',
  },
  noData: {
    icon: Database,
    title: 'No data available',
    description: 'Data will appear here once it becomes available.',
  },
}
