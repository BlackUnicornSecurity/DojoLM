/**
 * File: CrossModuleActions.tsx
 * Purpose: Reusable "Send to..." dropdown for cross-module ecosystem actions
 * Story: TPI-NODA-8.3
 * Index:
 * - CrossModuleAction type (line 18)
 * - ACTION_DEFINITIONS (line 28)
 * - getActionsForModule() (line 49)
 * - CrossModuleActions component (line 72)
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Swords, Dna, Radio, Shield, Send, Check, Loader2, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EcosystemSourceModule, EcosystemFindingType, EcosystemSeverity } from '@/lib/ecosystem-types'

/** Action target definition */
interface CrossModuleAction {
  id: string
  label: string
  description: string
  icon: LucideIcon
  accent: string
  targetModule: EcosystemSourceModule | 'compliance'
  findingType: EcosystemFindingType
}

// ===========================================================================
// Action definitions per source module
// ===========================================================================

const ACTION_CATALOG: CrossModuleAction[] = [
  { id: 'test-atemi', label: 'Test in Atemi Lab', description: 'Load attack for adversarial testing', icon: Swords, accent: 'var(--dojo-primary)', targetModule: 'atemi', findingType: 'attack_variant' },
  { id: 'add-sage', label: 'Add to SAGE Seeds', description: 'Use as seed for evolutionary generation', icon: Dna, accent: 'var(--bu-electric)', targetModule: 'sage', findingType: 'mutation' },
  { id: 'classify-dna', label: 'Classify in Amaterasu DNA', description: 'Create AttackDNA classification node', icon: Dna, accent: 'var(--bu-electric)', targetModule: 'attackdna', findingType: 'attack_variant' },
  { id: 'alert-mitsuke', label: 'Create Mitsuke Alert', description: 'Generate threat intelligence alert', icon: Radio, accent: 'var(--severity-high)', targetModule: 'mitsuke', findingType: 'threat_intel' },
  { id: 'check-bushido', label: 'Check in Bushido Book', description: 'Navigate to related compliance control', icon: Shield, accent: 'var(--success)', targetModule: 'compliance', findingType: 'vulnerability' },
]

/** Get relevant actions for a source module (avoids self-referencing actions) */
function getActionsForModule(sourceModule: EcosystemSourceModule): CrossModuleAction[] {
  const excludeMap: Record<string, string[]> = {
    scanner: ['check-bushido'],     // Scanner → Atemi, SAGE, DNA, Mitsuke
    atemi: ['test-atemi'],          // Atemi → SAGE, DNA, Mitsuke, Bushido
    sage: ['add-sage'],             // SAGE → Atemi, DNA, Mitsuke, Bushido
    arena: [],                      // Arena → all
    mitsuke: ['alert-mitsuke'],     // Mitsuke → Atemi, SAGE, DNA, Bushido
    attackdna: ['classify-dna'],    // DNA → Atemi, SAGE, Mitsuke, Bushido
  }
  const excluded = excludeMap[sourceModule] || []
  return ACTION_CATALOG.filter((a) => !excluded.includes(a.id))
}

// ===========================================================================
// Component Props
// ===========================================================================

interface CrossModuleActionsProps {
  /** Module this finding originates from */
  sourceModule: EcosystemSourceModule
  /** Title of the finding */
  title: string
  /** Description of the finding */
  description: string
  /** Severity level */
  severity: EcosystemSeverity
  /** Optional evidence text */
  evidence?: string
  /** Optional OWASP mapping */
  owaspMapping?: string
  /** Optional TPI story */
  tpiStory?: string
  /** Optional related model */
  relatedModel?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Callback when an action completes */
  onActionComplete?: (actionId: string, success: boolean) => void
  /** Display variant */
  variant?: 'inline' | 'dropdown'
  /** Additional CSS classes */
  className?: string
}

// ===========================================================================
// Component
// ===========================================================================

/**
 * CrossModuleActions — Reusable "Send to..." dropdown/inline buttons
 * for creating ecosystem findings and triggering cross-module data flow.
 */
export function CrossModuleActions({
  sourceModule,
  title,
  description,
  severity,
  evidence,
  owaspMapping,
  tpiStory,
  relatedModel,
  metadata = {},
  onActionComplete,
  variant = 'dropdown',
  className,
}: CrossModuleActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const actions = getActionsForModule(sourceModule)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleAction = useCallback(async (action: CrossModuleAction) => {
    if (pendingAction) return
    setPendingAction(action.id)

    try {
      const res = await fetch('/api/ecosystem/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceModule,
          findingType: action.findingType,
          severity,
          title: `[${action.label}] ${title}`.slice(0, 500),
          description: description.slice(0, 5000),
          evidence: evidence?.slice(0, 2000),
          owaspMapping,
          tpiStory,
          relatedModel,
          metadata: {
            ...metadata,
            crossModuleAction: action.id,
            targetModule: action.targetModule,
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to create finding')

      setCompletedActions((prev) => new Set(prev).add(action.id))
      onActionComplete?.(action.id, true)
    } catch {
      onActionComplete?.(action.id, false)
    } finally {
      setPendingAction(null)
    }
  }, [pendingAction, sourceModule, severity, title, description, evidence, owaspMapping, tpiStory, relatedModel, metadata, onActionComplete])

  // Inline variant: show all action buttons vertically
  if (variant === 'inline') {
    return (
      <div className={cn('space-y-1.5', className)}>
        {actions.map((action) => {
          const ActionIcon = action.icon
          const isPending = pendingAction === action.id
          const isCompleted = completedActions.has(action.id)

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isPending || isCompleted}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left text-xs min-h-[40px]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'hover:bg-[var(--bg-tertiary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label={`${action.label}: ${action.description}`}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-spin" style={{ color: action.accent }} aria-hidden="true" />
              ) : isCompleted ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--success)]" aria-hidden="true" />
              ) : (
                <ActionIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: action.accent }} aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--foreground)]">{action.label}</p>
                <p className="text-muted-foreground">{action.description}</p>
              </div>
              {isCompleted && (
                <span className="text-[10px] text-[var(--success)]">Sent</span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Dropdown variant: compact trigger button with flyout
  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
          'border border-[var(--border)] bg-[var(--bg-secondary)]',
          'hover:bg-[var(--bg-tertiary)]',
          'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'min-h-[32px]',
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Cross-module actions"
      >
        <Send className="h-3 w-3" aria-hidden="true" />
        <span>Send to...</span>
        <ChevronDown className={cn('h-3 w-3 motion-safe:transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50 w-64',
            'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-150',
          )}
          role="menu"
          aria-label="Cross-module action options"
        >
          <div className="p-1">
            {actions.map((action) => {
              const ActionIcon = action.icon
              const isPending = pendingAction === action.id
              const isCompleted = completedActions.has(action.id)

              return (
                <button
                  key={action.id}
                  role="menuitem"
                  onClick={async () => {
                    await handleAction(action)
                    setIsOpen(false)
                  }}
                  disabled={isPending || isCompleted}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left text-xs',
                    'hover:bg-[var(--bg-tertiary)]',
                    'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    'min-h-[40px]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  aria-label={`${action.label}: ${action.description}`}
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-spin" style={{ color: action.accent }} aria-hidden="true" />
                  ) : isCompleted ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--success)]" aria-hidden="true" />
                  ) : (
                    <ActionIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: action.accent }} aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">{action.label}</p>
                    <p className="text-muted-foreground">{action.description}</p>
                  </div>
                  {isCompleted && (
                    <span className="text-[10px] text-[var(--success)]">Sent</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
