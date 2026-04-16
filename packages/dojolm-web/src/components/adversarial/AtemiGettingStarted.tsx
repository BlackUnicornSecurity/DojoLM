/**
 * File: AtemiGettingStarted.tsx
 * Purpose: Collapsible "Getting Started" banner for first-time Atemi Lab users
 * Story: TPI-NODA-6.1 - Atemi Lab User Guidance
 * Index:
 * - STORAGE_KEY constant (line 16)
 * - STEPS data (line 18)
 * - AtemiGettingStarted component (line 38)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { atemiGettingStartedDismissedStore } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, CheckCircle, Circle, X, Swords, Target, Zap } from 'lucide-react'


const STEPS = [
  {
    id: 'configure',
    label: 'Configure Target LLM',
    description: 'Select the model you want to test from the config panel. Set API endpoint, timeout, and concurrency.',
    icon: Target,
  },
  {
    id: 'select-mode',
    label: 'Select Attack Mode',
    description: 'Choose an attack intensity level: Passive (monitoring only), Basic (low-risk probes), Advanced (active exploits), or Aggressive (full suite).',
    icon: Swords,
  },
  {
    id: 'run',
    label: 'Run Attacks',
    description: 'Launch enabled attack tools against your target. Review results in the Attack Log below for detected vulnerabilities.',
    icon: Zap,
  },
] as const

type StepId = typeof STEPS[number]['id']

export interface AtemiGettingStartedProps {
  /** Steps that have been completed externally */
  completedSteps?: StepId[]
  className?: string
}

export function AtemiGettingStarted({ completedSteps = [], className }: AtemiGettingStartedProps) {
  const [dismissed, setDismissed] = useState(true) // Start hidden until we check storage
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setDismissed(atemiGettingStartedDismissedStore.get())
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    atemiGettingStartedDismissedStore.set(true)
  }, [])

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  if (dismissed) return null

  const completedCount = completedSteps.length

  return (
    <Card className={cn('border-[var(--bu-electric)]/20 bg-[var(--bu-electric-subtle)]', className)}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 text-left flex-1 min-h-[44px]"
            aria-expanded={expanded}
            aria-controls="atemi-getting-started-content"
          >
            <Badge variant="active" className="text-xs">
              Getting Started
            </Badge>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {completedCount}/{STEPS.length} steps completed
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Dismiss getting started guide"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Steps */}
        {expanded && (
          <div
            id="atemi-getting-started-content"
            className="grid sm:grid-cols-3 gap-3 mt-4"
            role="list"
            aria-label="Getting started steps"
          >
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon
              const isComplete = completedSteps.includes(step.id)
              return (
                <div
                  key={step.id}
                  role="listitem"
                  className={cn(
                    'flex gap-3 p-3 rounded-lg border',
                    isComplete
                      ? 'border-[var(--success)]/20 bg-[var(--success)]/5'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)]'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5 text-[var(--success)]" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <StepIcon className="h-3.5 w-3.5 text-[var(--bu-electric)]" aria-hidden="true" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Step {idx + 1}: {step.label}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Don't show again */}
        {expanded && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Got it, don&apos;t show again →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
