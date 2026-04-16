/**
 * File: ModuleOnboarding.tsx
 * Purpose: Reusable 3-step onboarding wizard for first-time module visitors
 * Story: 7.1, 7.2, 7.3 — SAGE, Arena, Mitsuke onboarding
 * Index:
 * - OnboardingStep interface (line 16)
 * - ModuleOnboardingProps interface (line 23)
 * - ModuleOnboarding component (line 33)
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { createDismissedStore } from '@/lib/stores'
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface OnboardingStep {
  title: string
  description: string
  icon: LucideIcon
}

export interface ModuleOnboardingProps {
  storageKey: string
  steps: OnboardingStep[]
  accentColor?: string
  className?: string
}

export function ModuleOnboarding({
  storageKey,
  steps,
  accentColor = 'var(--dojo-primary)',
  className,
}: ModuleOnboardingProps) {
  const store = useMemo(() => createDismissedStore(storageKey), [storageKey])
  const [dismissed, setDismissed] = useState(true)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    setDismissed(store.get())
  }, [store])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    store.set(true)
  }, [store])

  const nextStep = useCallback(() => {
    setActiveStep((prev) => {
      if (prev >= steps.length - 1) {
        handleDismiss()
        return prev
      }
      return prev + 1
    })
  }, [handleDismiss, steps.length])

  const prevStep = useCallback(() => {
    setActiveStep((prev) => Math.max(0, prev - 1))
  }, [])

  if (dismissed || steps.length === 0) return null

  const step = steps[activeStep]
  const StepIcon = step.icon
  const isLast = activeStep >= steps.length - 1
  const isFirst = activeStep === 0

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accentColor} 5%, transparent)`,
      }}
      role="region"
      aria-label="Module onboarding"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Dismiss onboarding"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)` }}
        >
          <Sparkles className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            Getting Started
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Step {activeStep + 1} of {steps.length}
          </p>

          {/* Step content */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
            <StepIcon
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              style={{ color: accentColor }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--foreground)]">{step.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Progress and controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full motion-safe:transition-colors',
                    'relative before:absolute before:inset-[-10px] before:content-[""]',
                  )}
                  style={{
                    backgroundColor: idx === activeStep ? accentColor : 'var(--bg-quaternary)',
                  }}
                  aria-label={`Step ${idx + 1}: ${steps[idx].title}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-[var(--foreground)] min-h-[32px]"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex items-center gap-1 text-xs font-medium min-h-[32px]"
                style={{ color: accentColor }}
              >
                {isLast ? 'Get Started' : 'Next'}
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Programmatically reset onboarding for a module (e.g., from Help button)
 */
export function resetOnboarding(storageKey: string): void {
  createDismissedStore(storageKey).remove()
}
