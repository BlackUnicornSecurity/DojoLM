/**
 * File: SkillCard.tsx
 * Purpose: Card component for displaying an adversarial skill with expand/collapse steps
 * Story: 12.2b — SkillCard UI + Filter/Search
 * Index:
 * - SkillCardProps interface (line 16)
 * - SkillCard component (line 24)
 */

'use client'

import { useState, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SafeCodeBlock } from '@/components/ui/SafeCodeBlock'
import { DIFFICULTY_CONFIG, CATEGORY_CONFIG } from '@/lib/adversarial-skills-types'
import type { AdversarialSkill } from '@/lib/adversarial-skills-types'
import {
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  BookOpen,
  Shield,
} from 'lucide-react'

export interface SkillCardProps {
  skill: AdversarialSkill
  onExecute?: (skillId: string) => void
  className?: string
}

export const SkillCard = memo(function SkillCard({
  skill,
  onExecute,
  className,
}: SkillCardProps) {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = useCallback(() => setExpanded(prev => !prev), [])

  const handleExecute = useCallback(() => {
    onExecute?.(skill.id)
  }, [onExecute, skill.id])

  const diffConfig = DIFFICULTY_CONFIG[skill.difficulty]
  const catConfig = CATEGORY_CONFIG[skill.category]

  return (
    <Card
      className={cn(
        'border-[var(--border)] hover:border-[var(--dojo-primary)]/40',
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-normal)]',
        className,
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: name + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--foreground)] leading-tight">
              {skill.name}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {skill.description}
            </p>
          </div>
        </div>

        {/* Badge row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            {catConfig?.label ?? skill.category}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-xs', diffConfig?.color)}
          >
            {diffConfig?.label ?? skill.difficulty}
          </Badge>
          {skill.owaspMapping.map(owasp => (
            <Badge
              key={owasp}
              variant="outline"
              className="text-xs border-[var(--dojo-primary)]/30 text-[var(--dojo-primary)]"
            >
              <Shield className="h-3 w-3 mr-0.5" aria-hidden="true" />
              {owasp}
            </Badge>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            {skill.steps.length} steps
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            ~{skill.estimatedDurationSec}s
          </span>
        </div>

        {/* Expand / Execute buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="h-7 gap-1 text-xs"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse skill steps' : 'Expand skill steps'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {expanded ? 'Collapse' : 'Steps'}
          </Button>
          {onExecute && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExecute}
              className="h-7 gap-1 text-xs ml-auto"
              aria-label={`Execute ${skill.name}`}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Execute
            </Button>
          )}
        </div>

        {/* Expanded: Step details */}
        {expanded && (
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            {skill.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex gap-3 text-xs"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)] flex items-center justify-center font-semibold"
                  aria-hidden="true"
                >
                  {step.order}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-[var(--foreground)]">{step.label}</p>
                  <p className="text-muted-foreground leading-relaxed">{step.instruction}</p>
                  {step.examplePayload && (
                    <SafeCodeBlock
                      code={step.examplePayload}
                      maxLines={5}
                      className="mt-1"
                    />
                  )}
                  <p className="text-[var(--text-tertiary)] italic">
                    Expected: {step.expectedOutcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
