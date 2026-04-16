/**
 * File: AmaterasuGuide.tsx
 * Purpose: First-visit interactive tutorial for Amaterasu DNA module (5 sections)
 * Story: TPI-NODA-6.4, NODA-3 Story 8.1 — Comprehensive User Guidance
 * Index:
 * - STORAGE_KEY (line 16)
 * - TUTORIAL_STEPS (line 18)
 * - TAB_HELP content (line 55)
 * - AmaterasuGuide component (line 70)
 * - TabHelpButton component (line 155)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { amaterasuGuideDismissedStore } from '@/lib/stores'
import {
  GitBranch,
  Layers,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Dna,
  Microscope,
  HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface TutorialStep {
  title: string
  description: string
  icon: LucideIcon
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'What is Attack DNA?',
    description: 'Attack DNA maps how adversarial prompts relate, evolve, and cluster. Each attack has a "DNA fingerprint" — its structure, encoding layers, and mutation lineage. Understanding DNA helps you see patterns that individual tests miss.',
    icon: Dna,
  },
  {
    title: 'Explore Family Trees',
    description: 'Visualize parent-child mutation relationships. Each node is an attack prompt; edges show how mutations created variants. Click any node to see its full history, content, and cross-module actions.',
    icon: GitBranch,
  },
  {
    title: 'Analyze Clusters',
    description: 'Attacks are grouped by semantic similarity using embedding vectors. Clusters reveal common evasion patterns spanning different families — helping identify structural weaknesses in model defenses.',
    icon: Layers,
  },
  {
    title: 'Track Mutations Over Time',
    description: 'The timeline shows chronological evolution of attacks. Spot mutation bursts, drift patterns, and convergence events where independent attack families developed similar techniques.',
    icon: Clock,
  },
  {
    title: 'Black Box Analysis',
    description: 'Run ablation studies on attacks to discover which components are critical for success. Decompose attacks, systematically remove parts, and generate heatmaps showing what makes an attack work — or fail.',
    icon: Microscope,
  },
]

// --- Tab-specific contextual help ---

export interface TabHelpContent {
  title: string
  description: string
  tips: string[]
}

export const TAB_HELP: Record<string, TabHelpContent> = {
  'family-tree': {
    title: 'Family Tree View',
    description: 'This view shows parent-child relationships between attack prompts. Each branch represents a mutation chain.',
    tips: [
      'Click any node to see full details, mutation history, and content',
      'Edges show mutation type (substitution, insertion, deletion, encoding, structural, semantic)',
      'Use the family selector dropdown to switch between attack families',
      'Severity dots show risk level: red = critical, orange = high, yellow = medium',
    ],
  },
  clusters: {
    title: 'Embedding Clusters',
    description: 'Attacks grouped by semantic similarity using vector embeddings. Similar attacks cluster together regardless of their mutation family.',
    tips: [
      'High similarity (90%+) clusters share common evasion structures',
      'Expand a cluster to see individual member attacks',
      'Category badges show the primary attack type within each cluster',
      'Look for cross-family clusters — they reveal shared structural weaknesses',
    ],
  },
  timeline: {
    title: 'Mutation Timeline',
    description: 'Chronological view of attack mutations. Tracks how the attack landscape evolved over time.',
    tips: [
      'Look for mutation bursts — rapid increases in new variants',
      'Color-coded by mutation type: blue = substitution, green = insertion, red = deletion',
      'Similarity percentages show how much changed between parent and child',
      'Date grouping helps identify when new attack campaigns started',
    ],
  },
  analysis: {
    title: 'Black Box Analysis',
    description: 'Ablation-based analysis that determines which parts of an attack are critical for success against a target model.',
    tips: [
      'Select an attack and model, then run the 7-step analysis flow',
      'The heatmap shows token-level contribution to attack success',
      'Component impact chart reveals which structural elements matter most',
      'Defense recommendations are generated from critical component analysis',
    ],
  },
}

export interface AmaterasuGuideProps {
  className?: string
}

export function AmaterasuGuide({ className }: AmaterasuGuideProps) {
  const [dismissed, setDismissed] = useState(true)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    setDismissed(amaterasuGuideDismissedStore.get())
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    amaterasuGuideDismissedStore.set(true)
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

  const prevStep = useCallback(() => {
    setActiveStep((prev) => Math.max(0, prev - 1))
  }, [])

  if (dismissed) return null

  const step = TUTORIAL_STEPS[activeStep]
  const StepIcon = step.icon
  const isLast = activeStep >= TUTORIAL_STEPS.length - 1
  const isFirst = activeStep === 0

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
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-w-[32px] min-h-[32px] flex items-center justify-center"
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
            Step {activeStep + 1} of {TUTORIAL_STEPS.length} — Analyze attack lineage, mutation families, and embedding clusters.
          </p>

          {/* Step content */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
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
                    'relative before:absolute before:inset-[-10px] before:content-[""]',
                    idx === activeStep ? 'bg-[var(--bu-electric)]' : 'bg-[var(--bg-quaternary)]',
                  )}
                  aria-label={`Step ${idx + 1}: ${TUTORIAL_STEPS[idx].title}`}
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
                className="flex items-center gap-1 text-xs font-medium text-[var(--bu-electric)] hover:text-[var(--bu-electric-hover)] min-h-[32px]"
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
 * Programmatically reset the Amaterasu guide (e.g. from Help button)
 */
export function resetAmaterasuGuide(): void {
  amaterasuGuideDismissedStore.remove()
}

// --- Tab-specific "What am I looking at?" button ---

export interface TabHelpButtonProps {
  tabId: string
  className?: string
}

export function TabHelpButton({ tabId, className }: TabHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const help = TAB_HELP[tabId]

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  if (!help) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground',
          'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
          'min-h-[32px] motion-safe:transition-colors',
          className,
        )}
        aria-label={`What am I looking at? — ${help.title}`}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">What am I looking at?</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={`${help.title} help`}
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">{help.title}</h4>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Close help"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{help.description}</p>
            <ul className="space-y-1.5">
              {help.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-[var(--bu-electric)] mt-0.5 flex-shrink-0" aria-hidden="true">&#8226;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
