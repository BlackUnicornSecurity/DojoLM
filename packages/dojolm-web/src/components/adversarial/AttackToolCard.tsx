/**
 * File: AttackToolCard.tsx
 * Purpose: Card component for a single MCP/Tool attack scenario
 * Story: S73 - Adversarial Lab Dashboard
 * Index:
 * - AttackToolCardProps interface (line 17)
 * - severityConfig (line 27)
 * - AttackToolCard component (line 40)
 */

'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Wrench } from 'lucide-react'

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
  className,
}: AttackToolCardProps) {
  const sevCfg = severityConfig[severity]
  const typCfg = typeConfig[type]
  const TypeIcon = typCfg.icon

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
              className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]"
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

        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {description}
        </p>

        {!enabled && (
          <p className="text-[10px] text-[var(--text-tertiary)] italic">
            Disabled in current mode
          </p>
        )}
      </CardContent>
    </Card>
  )
}
