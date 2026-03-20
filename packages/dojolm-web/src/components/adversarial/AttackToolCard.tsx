/**
 * File: AttackToolCard.tsx
 * Purpose: Card component for a single MCP/Tool attack scenario with Learn More + Execute
 * Story: S73, TPI-NODA-6.1 / H13.4 - Atemi Lab Dashboard + Execute with Progress
 * Index:
 * - ExecutionResult interface (line 19)
 * - AttackToolCardProps interface (line 27)
 * - severityConfig (line 45)
 * - logExecutionAudit mock (line 62)
 * - AttackToolCard component (line 73)
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Wrench, ChevronDown, ChevronUp, BookOpen, Play, Loader2, CheckCircle } from 'lucide-react'

/** Result returned after mock execution */
export interface ExecutionResult {
  severity: 'low' | 'medium' | 'high' | 'critical'
  summary: string
}

export interface LearnMoreContent {
  technique: string
  expectedBehavior: string
  defensiveImplications: string
}

export interface AttackToolCardProps {
  /** Display name of the attack tool */
  name: string
  /** Category: MCP protocol-level or Tool integration-level */
  type: 'mcp' | 'tool'
  /** Brief description of the attack scenario */
  description: string
  /** Severity rating */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Whether this tool is currently enabled */
  enabled: boolean
  /** Learn More content for technique explanation */
  learnMore?: LearnMoreContent
  /** Optional additional CSS classes */
  className?: string
}

const severityConfig = {
  low: { label: 'Low', variant: 'low' as const },
  medium: { label: 'Medium', variant: 'medium' as const },
  high: { label: 'High', variant: 'high' as const },
  critical: { label: 'Critical', variant: 'critical' as const },
} as const

const typeConfig = {
  mcp: {
    label: 'MCP',
    icon: Shield,
    badgeCn: 'border-[var(--dojo-primary)]/30 bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]',
  },
  tool: {
    label: 'Tool',
    icon: Wrench,
    badgeCn: 'border-[var(--severity-low)]/30 bg-[var(--severity-low)]/10 text-[var(--severity-low)]',
  },
} as const

const MOCK_SUMMARIES: Record<string, string> = {
  low: 'Target model showed minimal susceptibility. Defense layers held.',
  medium: 'Partial bypass detected. Some guardrails were circumvented.',
  high: 'Significant vulnerability found. Model produced unsafe output.',
  critical: 'Full bypass achieved. All defense layers failed.',
}

/** Mock audit log function for execution attempts */
function logExecutionAudit(toolName: string, action: 'request' | 'confirm' | 'cancel' | 'complete', result?: ExecutionResult) {
  // In production, this would call an API endpoint
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] AttackTool: ${toolName} | Action: ${action}${result ? ` | Severity: ${result.severity}` : ''}`)
}

/**
 * AttackToolCard
 *
 * Displays a single attack tool/scenario with:
 * - Tool name and category badge (MCP or Tool)
 * - Severity indicator badge
 * - Brief description text
 * - Enabled/disabled visual state
 * - Execute button with consent dialog and progress indicator (H13.4)
 */
export function AttackToolCard({
  name,
  type,
  description,
  severity,
  enabled,
  learnMore,
  className,
}: AttackToolCardProps) {
  const sevCfg = severityConfig[severity]
  const typCfg = typeConfig[type]
  const TypeIcon = typCfg.icon
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const toggleLearnMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowLearnMore((prev) => !prev)
  }, [])

  const handleExecuteRequest = useCallback(() => {
    logExecutionAudit(name, 'request')
    setShowConsent(true)
  }, [name])

  const handleConsentCancel = useCallback(() => {
    logExecutionAudit(name, 'cancel')
    setShowConsent(false)
  }, [name])

  const handleConsentConfirm = useCallback(() => {
    logExecutionAudit(name, 'confirm')
    setShowConsent(false)
    setIsExecuting(true)
    setExecutionResult(null)

    timerRef.current = setTimeout(() => {
      const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical']
      const resultSeverity = severities[Math.floor(Math.random() * severities.length)]
      const result: ExecutionResult = {
        severity: resultSeverity,
        summary: MOCK_SUMMARIES[resultSeverity],
      }
      setIsExecuting(false)
      setExecutionResult(result)
      logExecutionAudit(name, 'complete', result)
    }, 1500)
  }, [name])

  return (
    <Card
      className={cn(
        'motion-safe:transition-[opacity,border-color] motion-safe:duration-[var(--transition-normal)]',
        enabled
          ? 'border-[var(--border)] opacity-100'
          : 'border-[var(--border)]/50 opacity-60',
        className,
      )}
      role="group"
      aria-label={`${name} - ${typCfg.label} attack - severity ${sevCfg.label} - ${enabled ? 'enabled' : 'disabled'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight flex items-center gap-2">
            <TypeIcon
              className="h-4 w-4 flex-shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{name}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={sevCfg.variant} className="text-xs px-1.5 py-0">
              {sevCfg.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline" className={cn('text-xs', typCfg.badgeCn)}>
          {typCfg.label}
        </Badge>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Disabled hint removed — handled by banner above card grid */}

        {/* Execute button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecuteRequest}
            disabled={!enabled || isExecuting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)] border border-[var(--dojo-primary)]/20',
              'hover:bg-[var(--dojo-primary)]/20 min-h-[44px]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'motion-safe:transition-colors',
            )}
            aria-label={`Execute ${name} attack`}
          >
            {isExecuting ? (
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>
        </div>

        {/* Consent dialog */}
        {showConsent && (
          <div
            role="group"
            aria-label={`Confirm execution of ${name}`}
            className="p-3 rounded-lg border border-[var(--severity-high)]/30 bg-[var(--severity-high)]/5 space-y-2"
          >
            <p className="text-xs font-semibold text-[var(--foreground)]">
              Confirm Execution
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This will execute the <strong>{name}</strong> attack scenario against the configured target. Proceed?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConsentConfirm}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
                  'bg-[var(--severity-high)]/10 text-[var(--severity-high)] border border-[var(--severity-high)]/30',
                  'hover:bg-[var(--severity-high)]/20 motion-safe:transition-colors',
                )}
              >
                Confirm
              </button>
              <button
                onClick={handleConsentCancel}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
                  'bg-[var(--bg-tertiary)] text-muted-foreground border border-[var(--border)]',
                  'hover:bg-[var(--bg-secondary)] motion-safe:transition-colors',
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Execution result */}
        {executionResult && !isExecuting && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--dojo-primary)]" aria-hidden="true" />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Badge variant={severityConfig[executionResult.severity].variant} className="text-xs px-1.5 py-0">
                  {severityConfig[executionResult.severity].label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">Result</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {executionResult.summary}
              </p>
            </div>
          </div>
        )}

        {/* Learn More expandable section */}
        {learnMore && (
          <div>
            <button
              onClick={toggleLearnMore}
              className="flex items-center gap-1 text-xs font-medium text-[var(--bu-electric)] hover:text-[var(--bu-electric)]/80 min-h-[44px]"
              aria-expanded={showLearnMore}
              aria-controls={`learn-more-${name.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              Learn More
              {showLearnMore ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
            {showLearnMore && (
              <div
                id={`learn-more-${name.replace(/\s+/g, '-').toLowerCase()}`}
                className="mt-2 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] space-y-2"
              >
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
                    Technique
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {learnMore.technique}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
                    Expected Behavior
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {learnMore.expectedBehavior}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
                    Defensive Implications
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {learnMore.defensiveImplications}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
