/**
 * File: AmaterasuGuide.tsx
 * Purpose: First-visit interactive tutorial for Amaterasu DNA module
 * Story: TPI-NODA-6.4 - Amaterasu DNA User Guidance
 * Index:
 * - STORAGE_KEY (line 14)
 * - TUTORIAL_STEPS (line 16)
 * - AmaterasuGuideProps interface (line 45)
 * - AmaterasuGuide component (line 50)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Dna,
  GitBranch,
  Layers,
  Clock,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STORAGE_KEY = 'amaterasu-guide-dismissed'

interface TutorialStep {
  title: string
  description: string
  icon: LucideIcon
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Explore Family Trees',
    description: 'Visualize attack lineage and parent-child mutation relationships. Click nodes to see full mutation history and content.',
    icon: GitBranch,
  },
  {
    title: 'Analyze Clusters',
    description: 'View embedding-based clusters to identify structurally similar attacks. Clusters reveal common evasion patterns across different attack families.',
    icon: Layers,
  },
  {
    title: 'Track Mutations Over Time',
    description: 'The timeline view shows how attacks evolved chronologically. Identify mutation bursts, drift patterns, and convergence events.',
    icon: Clock,
  },
]

export interface AmaterasuGuideProps {
  className?: string
}

export function AmaterasuGuide({ className }: AmaterasuGuideProps) {
  const [dismissed, setDismissed] = useState(true) // hidden by default until hydrated
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    setDismissed(stored === 'true')
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [])

  const nextStep = useCallback(() => {
    setActiveStep((prev) => {
      if (prev >= TUTORIAL_STEPS.length - 1) {
        handleDismiss()
        return prev
      }
      return prev + 1
    })
  }, [handleDismiss])

  if (dismissed) return null

  const step = TUTORIAL_STEPS[activeStep]
  const StepIcon = step.icon

  return (
    <div
      className={cn(
        'relative rounded-lg border border-[var(--bu-electric)]/30 bg-[var(--bu-electric)]/5 p-4',
        className,
      )}
      role="region"
      aria-label="Getting started with Amaterasu DNA"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Dismiss tutorial"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="w-10 h-10 rounded-lg bg-[var(--bu-electric)]/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-[var(--bu-electric)]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            Welcome to Amaterasu DNA
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Analyze attack lineage, mutation families, and embedding clusters.
          </p>

          {/* Step content */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)]">
            <StepIcon className="h-4 w-4 text-[var(--bu-electric)] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--foreground)]">{step.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
            </div>
          </div>

          {/* Progress and controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full motion-safe:transition-colors',
                    idx === activeStep ? 'bg-[var(--bu-electric)]' : 'bg-[var(--bg-quaternary)]',
                  )}
                  aria-label={`Step ${idx + 1}: ${TUTORIAL_STEPS[idx].title}`}
                />
              ))}
            </div>
            <button
              onClick={nextStep}
              className="flex items-center gap-1 text-xs font-medium text-[var(--bu-electric)] hover:text-[var(--bu-electric-hover)] min-h-[32px]"
            >
              {activeStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Get Started'}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
