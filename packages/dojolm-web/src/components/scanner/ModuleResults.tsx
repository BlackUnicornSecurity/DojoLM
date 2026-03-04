/**
 * File: ModuleResults.tsx
 * Purpose: Groups findings by engine module with collapsible sections and per-module stats
 * Story: S71 - Scanner Results Module-Aware Display
 * Index:
 * - MODULE_PHASE_MAP (line 18)
 * - getModulePhaseLabel helper (line 50)
 * - ModuleResults component (line 60)
 * - ModuleSection component (line 115)
 * - ModuleFindingRow component (line 190)
 * - SeverityCountBadges component (line 232)
 */

'use client'

import { memo, useMemo, useState, useCallback } from 'react'
import { Finding } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ModuleBadge } from './ModuleBadge'
import {
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react'

/** Map of module engine names to their origin phase */
const MODULE_PHASE_MAP: Record<string, { phase: string; label: string }> = {
  'mcp-parser':              { phase: 'P1', label: 'P1 Core' },
  'document-pdf':            { phase: 'P1', label: 'P1 Core' },
  'document-office':         { phase: 'P1', label: 'P1 Core' },
  'ssrf-detector':           { phase: 'P1', label: 'P1 Core' },
  'encoding-engine':         { phase: 'P1', label: 'P1 Core' },
  'email-webfetch':          { phase: 'P1', label: 'P1 Core' },
  'enhanced-pi':             { phase: 'P1', label: 'P1 Core' },
  'token-analyzer':          { phase: 'P1', label: 'P1 Core' },
  'rag-analyzer':            { phase: 'P1', label: 'P1 Core' },
  'vectordb-interface':      { phase: 'P1', label: 'P1 Core' },
  'xxe-protopollution':      { phase: 'P1', label: 'P1 Core' },
  'dos-detector':            { phase: 'P2.6', label: 'P2.6 Category' },
  'supply-chain-detector':   { phase: 'P2.6', label: 'P2.6 Category' },
  'bias-detector':           { phase: 'P2.6', label: 'P2.6 Category' },
  'env-detector':            { phase: 'P2.6', label: 'P2.6 Category' },
  'overreliance-detector':   { phase: 'P2.6', label: 'P2.6 Category' },
  'model-theft-detector':    { phase: 'P2.6', label: 'P2.6 Category' },
  'pii-detector':            { phase: 'P3', label: 'P3 Compliance' },
  'data-provenance':         { phase: 'P3', label: 'P3 Compliance' },
  'deepfake-detector':       { phase: 'P3', label: 'P3 Compliance' },
  'session-bypass':          { phase: 'P3', label: 'P3 Compliance' },
  'core-patterns':           { phase: 'P1', label: 'P1 Core' },
}

function getModulePhaseLabel(engine: string): string {
  return MODULE_PHASE_MAP[engine]?.label ?? 'Unknown'
}

function getModulePhase(engine: string): string {
  return MODULE_PHASE_MAP[engine]?.phase ?? 'U'
}

interface ModuleGroup {
  engine: string
  findings: Finding[]
  counts: { critical: number; warning: number; info: number }
  phaseLabel: string
  phase: string
}

interface ModuleResultsProps {
  findings: Finding[]
  className?: string
}

export const ModuleResults = memo(function ModuleResults({
  findings,
  className,
}: ModuleResultsProps) {
  const moduleGroups: ModuleGroup[] = useMemo(() => {
    const grouped = new Map<string, Finding[]>()

    for (const finding of findings) {
      const engine = finding.engine || 'unknown'
      const existing = grouped.get(engine)
      if (existing) {
        existing.push(finding)
      } else {
        grouped.set(engine, [finding])
      }
    }

    const groups: ModuleGroup[] = []
    for (const [engine, engineFindings] of grouped) {
      const counts = { critical: 0, warning: 0, info: 0 }
      for (const f of engineFindings) {
        if (f.severity === 'CRITICAL') counts.critical++
        else if (f.severity === 'WARNING') counts.warning++
        else counts.info++
      }
      groups.push({
        engine,
        findings: engineFindings,
        counts,
        phaseLabel: getModulePhaseLabel(engine),
        phase: getModulePhase(engine),
      })
    }

    // Sort: P1 first, then P2.6, then P3, then unknown. Within phase, by finding count desc.
    const phaseOrder: Record<string, number> = { P1: 0, 'P2.6': 1, P3: 2, U: 3 }
    groups.sort((a, b) => {
      const phaseA = phaseOrder[a.phase] ?? 3
      const phaseB = phaseOrder[b.phase] ?? 3
      if (phaseA !== phaseB) return phaseA - phaseB
      return b.findings.length - a.findings.length
    })

    return groups
  }, [findings])

  if (findings.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)} role="region" aria-label="Findings grouped by module">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Results by Module
      </h3>
      <div className="space-y-1">
        {moduleGroups.map((group) => (
          <ModuleSection key={group.engine} group={group} />
        ))}
      </div>
    </div>
  )
})

interface ModuleSectionProps {
  group: ModuleGroup
}

const ModuleSection = memo(function ModuleSection({ group }: ModuleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    group.counts.critical > 0
  )

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsExpanded((prev) => !prev)
      }
    },
    []
  )

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        type="button"
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 text-left',
          'bg-[var(--bg-quaternary)] hover:bg-[var(--bg-quaternary)]/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset',
          'motion-safe:transition-colors motion-safe:duration-150',
          'motion-reduce:transition-none'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-label={`${group.engine} module, ${group.findings.length} finding${group.findings.length !== 1 ? 's' : ''}. ${isExpanded ? 'Collapse' : 'Expand'} section.`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <ModuleBadge moduleName={group.engine} />
          <Badge variant="info" className="text-[10px] px-1.5 py-0">
            {group.phaseLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <SeverityCountBadges counts={group.counts} />
          <Badge variant="outline" className="text-xs tabular-nums">
            {group.findings.length}
          </Badge>
        </div>
      </button>

      {isExpanded && (
        <div
          className="divide-y divide-[var(--border)]"
          role="list"
          aria-label={`Findings from ${group.engine}`}
        >
          {group.findings.map((finding, index) => (
            <ModuleFindingRow
              key={`${finding.category}-${finding.severity}-${finding.pattern_name ?? finding.match?.slice(0, 32) ?? index}`}
              finding={finding}
            />
          ))}
        </div>
      )}
    </div>
  )
})

interface ModuleFindingRowProps {
  finding: Finding
}

const SEVERITY_ICON_MAP = {
  CRITICAL: ShieldAlert,
  WARNING: AlertTriangle,
  INFO: Info,
} as const

const SEVERITY_BORDER_MAP = {
  CRITICAL: 'border-l-red-500',
  WARNING: 'border-l-orange-500',
  INFO: 'border-l-blue-500',
} as const

const SEVERITY_TEXT_MAP = {
  CRITICAL: 'text-red-500',
  WARNING: 'text-orange-500',
  INFO: 'text-blue-500',
} as const

const ModuleFindingRow = memo(function ModuleFindingRow({
  finding,
}: ModuleFindingRowProps) {
  const SeverityIcon = SEVERITY_ICON_MAP[finding.severity] ?? Info

  return (
    <div
      className={cn(
        'px-4 py-3 border-l-4 bg-muted/30',
        SEVERITY_BORDER_MAP[finding.severity] ?? 'border-l-gray-500'
      )}
      role="listitem"
      aria-label={`${finding.severity} finding: ${finding.category}`}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <SeverityIcon
            className={cn('h-3.5 w-3.5 shrink-0', SEVERITY_TEXT_MAP[finding.severity])}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wider truncate">
            {finding.category}
          </span>
        </div>
        <Badge
          variant={
            finding.severity === 'CRITICAL'
              ? 'critical'
              : finding.severity === 'WARNING'
                ? 'warning'
                : 'info'
          }
          className="text-[10px] shrink-0"
        >
          {finding.severity}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-1.5">
        {finding.description}
      </p>

      {finding.match && (
        <pre className="text-xs font-mono p-2 bg-background rounded border border-[var(--border)] overflow-x-auto">
          <code className="text-orange-500">{finding.match}</code>
        </pre>
      )}

      {finding.pattern_name && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          Pattern: {finding.pattern_name}
        </div>
      )}
    </div>
  )
})

interface SeverityCountBadgesProps {
  counts: { critical: number; warning: number; info: number }
}

const SeverityCountBadges = memo(function SeverityCountBadges({
  counts,
}: SeverityCountBadgesProps) {
  return (
    <div className="flex items-center gap-1">
      {counts.critical > 0 && (
        <Badge variant="critical" className="text-[10px] px-1.5 py-0 tabular-nums">
          {counts.critical}C
        </Badge>
      )}
      {counts.warning > 0 && (
        <Badge variant="warning" className="text-[10px] px-1.5 py-0 tabular-nums">
          {counts.warning}W
        </Badge>
      )}
      {counts.info > 0 && (
        <Badge variant="info" className="text-[10px] px-1.5 py-0 tabular-nums">
          {counts.info}I
        </Badge>
      )}
    </div>
  )
})
