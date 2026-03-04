/**
 * File: AttackToolCard.tsx
 * Purpose: Card component for a single MCP/Tool attack scenario with Learn More
 * Story: S73, TPI-NODA-6.1 - Atemi Lab Dashboard + User Guidance
 * Index:
 * - AttackToolCardProps interface (line 17)
 * - severityConfig (line 33)
 * - AttackToolCard component (line 46)
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Wrench, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

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

/**
 * AttackToolCard
 *
 * Displays a single attack tool/scenario with:
 * - Tool name and category badge (MCP or Tool)
 * - Severity indicator badge
 * - Brief description text
 * - Enabled/disabled visual state
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

  const toggleLearnMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowLearnMore((prev) => !prev)
  }, [])

  return (
    <Card
      className={cn(
        'motion-safe:transition-[opacity,border-color] motion-safe:duration-[var(--transition-normal)]',
        enabled
          ? 'border-[var(--border)] opacity-100'
          : 'border-[var(--border)]/50 opacity-60',
        className,
      )}
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
            <Badge variant={sevCfg.variant} className="text-[10px] px-1.5 py-0">
              {sevCfg.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline" className={cn('text-[10px]', typCfg.badgeCn)}>
          {typCfg.label}
        </Badge>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>

        {!enabled && (
          <p className="text-[10px] text-[var(--text-tertiary)] italic">
            Disabled in current mode
          </p>
        )}

        {/* Learn More expandable section */}
        {learnMore && (
          <div>
            <button
              onClick={toggleLearnMore}
              className="flex items-center gap-1 text-[10px] font-medium text-[var(--bu-electric)] hover:text-[var(--bu-electric)]/80 min-h-[44px]"
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
                className="mt-2 p-2.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] space-y-2"
              >
                <div>
                  <p className="text-[10px] font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
                    Technique
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {learnMore.technique}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
                    Expected Behavior
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {learnMore.expectedBehavior}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--foreground)] uppercase tracking-wider mb-0.5">
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
