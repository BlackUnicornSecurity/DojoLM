'use client'

/**
 * File: DojoReadiness.tsx
 * Purpose: First-launch onboarding widget — checklist of 4 starter tasks, dismissible
 * Story: TPI-NODA-9.6
 * Index:
 * - READINESS_ITEMS config (line 15)
 * - DojoReadiness component (line 38)
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Radar, BrainCircuit, ShieldHalf, Warehouse, ArrowRight, X } from 'lucide-react'
import type { NavId } from '@/lib/constants'
import type { LucideIcon } from 'lucide-react'

interface ReadinessItem {
  label: string
  description: string
  icon: LucideIcon
  target: NavId
}

const READINESS_ITEMS: ReadinessItem[] = [
  { label: 'Run your first scan', description: 'Detect prompt injection threats in text', icon: Radar, target: 'scanner' },
  { label: 'Configure a model', description: 'Set up an LLM provider for testing', icon: BrainCircuit, target: 'jutsu' },
  { label: 'Enable Hattori Guard', description: 'Activate real-time content protection', icon: ShieldHalf, target: 'guard' },
  { label: 'Explore attack fixtures', description: 'Browse categorized test payloads', icon: Warehouse, target: 'buki' },
]

interface DojoReadinessProps {
  onDismiss: () => void
}

/**
 * DojoReadiness — first-launch onboarding checklist.
 * Rendered by QuickLaunchOrOnboarding wrapper when not yet dismissed.
 */
export function DojoReadiness({ onDismiss }: DojoReadinessProps) {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="Begin Your Training"
      priority="hero"
      actions={
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
          aria-label="Dismiss onboarding"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground mb-4">
          Welcome to the Dojo. Complete these steps to begin your security training.
        </p>
        {READINESS_ITEMS.map((item) => {
          const ItemIcon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.target)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'border border-[var(--border)] bg-[var(--bg-secondary)]',
                'hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'text-left',
              )}
              aria-label={`${item.label} — ${item.description}`}
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center flex-shrink-0">
                <ItemIcon className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </WidgetCard>
  )
}
