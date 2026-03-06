'use client'

/**
 * File: FindingsList.tsx
 * Purpose: Display scan results with findings list
 * Story: TPI-UIP-05 (ScanResultCard Enhancement)
 * Phase 6: Performance optimizations with React.memo
 * Index:
 * - FindingsList component (line 22)
 * - FindingCard component (line 100)
 * - ResultSummary / VerdictHeader (line 155)
 * - PerformanceInfo component (line 228)
 */

import { Finding, ScanResult } from '@/lib/types'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { Separator } from '@/components/ui/separator'
import { cn, truncate } from '@/lib/utils'
import { ShieldAlert, CheckCircle2, Clock } from 'lucide-react'
import { memo, useMemo } from 'react'
import { CrossModuleActions } from '@/components/ui/CrossModuleActions'
import { EmptyState, emptyStatePresets } from '@/components/ui/EmptyState'
import { EncodingChainVisualizer } from './EncodingChainVisualizer'

/** Max chars to show for a finding match before truncation */
const MAX_MATCH_LENGTH = 200

interface FindingsListProps {
  result: ScanResult | null
  className?: string
}

export const FindingsList = memo(function FindingsList({ result, className }: FindingsListProps) {
  if (!result) {
    return (
      <GlowCard glow="none" className={cn('', className)}>
        <CardContent>
          <EmptyState
            {...emptyStatePresets.noScans}
            hint="Enter text above or load a fixture to begin."
          />
        </CardContent>
      </GlowCard>
    )
  }

  const isBlock = result.verdict === 'BLOCK'

  return (
    <GlowCard glow={isBlock ? 'accent' : 'none'} className={cn('', className)}>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verdict announcement for screen readers */}
        <div aria-live="polite" role="status">
          <VerdictHeader result={result} />
        </div>

        <ResultSummary result={result} />

        <Separator />

        {result.findings.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <EmptyState icon={CheckCircle2} title="Clean" description="No findings detected. Text appears safe." />
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {result.findings.map((finding, index) => (
              <FindingCard key={`${finding.category}-${finding.severity}-${index}`} finding={finding} />
            ))}
          </div>
        )}

        <Separator />

        <PerformanceInfo result={result} />
      </CardContent>
    </GlowCard>
  )
})

interface FindingCardProps {
  finding: Finding
}

const severityDotColors: Record<string, string> = {
  CRITICAL: 'var(--danger)',
  WARNING: 'var(--warning)',
  INFO: 'var(--severity-low)',
}

const FindingCard = memo(function FindingCard({ finding }: FindingCardProps) {
  const dotColor = severityDotColors[finding.severity] ?? 'var(--border)'

  return (
    <div
      className="p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {finding.category}
          </span>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {finding.description}
      </p>

      {finding.match && (
        <pre className="text-xs font-mono p-2 bg-background rounded border overflow-x-auto">
          <code>
            <span className="text-[var(--warning)]">
              {truncate(finding.match, MAX_MATCH_LENGTH)}
            </span>
          </code>
        </pre>
      )}

      {/* Encoding chain visualization for multi-layer findings (Story 5.4) */}
      {finding.pattern_name === 'multi-layer-encoding' && (
        <EncodingChainVisualizer finding={finding} />
      )}

      <div className="flex items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Engine: {finding.engine}</span>
          {finding.pattern_name && <span>• {finding.pattern_name}</span>}
          {finding.source !== 'current' && (
            <span className="text-[var(--severity-low)]">• {finding.source}</span>
          )}
        </div>
        <CrossModuleActions
          sourceModule="scanner"
          title={finding.category}
          description={finding.description}
          severity={finding.severity === 'CRITICAL' ? 'CRITICAL' : finding.severity === 'WARNING' ? 'WARNING' : 'INFO'}
          evidence={finding.match}
          variant="dropdown"
        />
      </div>
    </div>
  )
})

interface VerdictHeaderProps {
  result: ScanResult
}

/**
 * Rich verdict header with threat reveal transition.
 * BLOCK: Red icon + pulsing dot + "Threat Detected"
 * ALLOW: Green icon + "Safe"
 */
const VerdictHeader = memo(function VerdictHeader({ result }: VerdictHeaderProps) {
  const isBlock = result.verdict === 'BLOCK'

  if (isBlock) {
    return (
      <div className="flex items-center gap-3 motion-safe:animate-fade-in">
        {/* Pulsing threat indicator */}
        <span
          className="relative flex h-3 w-3"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--danger)] opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--danger)]" />
        </span>

        <ShieldAlert className="h-8 w-8 text-[var(--danger)] animate-dojo-pulse" aria-hidden="true" />

        <div className="motion-safe:animate-fade-in">
          <span className="text-lg font-bold text-[var(--danger)]">
            Threat Detected
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 motion-safe:animate-fade-in">
      <CheckCircle2 className="h-8 w-8 text-[var(--success)]" aria-hidden="true" />
      <span className="text-lg font-bold text-[var(--success)]">
        Safe
      </span>
    </div>
  )
})

interface ResultSummaryProps {
  result: ScanResult
}

const ResultSummary = memo(function ResultSummary({ result }: ResultSummaryProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      <div className="flex-1 min-w-[80px] rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
        <div className={cn(
          'text-metric-md',
          result.verdict === 'BLOCK' ? 'text-[var(--danger)]' : 'text-[var(--success)]'
        )}>
          {result.verdict}
        </div>
        <div className="text-label mt-1">Verdict</div>
      </div>

      <div className="flex-1 min-w-[80px] rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
        <div className="text-metric-md text-[var(--danger)]">
          {result.counts.critical}
        </div>
        <div className="text-label mt-1">Critical</div>
      </div>

      <div className="flex-1 min-w-[80px] rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
        <div className="text-metric-md text-[var(--warning)]">
          {result.counts.warning}
        </div>
        <div className="text-label mt-1">Warning</div>
      </div>

      <div className="flex-1 min-w-[80px] rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
        <div className="text-metric-md text-[var(--severity-low)]">
          {result.counts.info}
        </div>
        <div className="text-label mt-1">Info</div>
      </div>

      <div className="flex-1 min-w-[80px] rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
        <div className="text-metric-md">
          {result.findings.length}
        </div>
        <div className="text-label mt-1">Total</div>
      </div>
    </div>
  )
})

interface PerformanceInfoProps {
  result: ScanResult
}

const PerformanceInfo = memo(function PerformanceInfo({ result }: PerformanceInfoProps) {
  // Capture timestamp once when result changes (stable under memo)
  const scanTime = useMemo(() => new Date().toLocaleTimeString(), [result])

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Scanned {result.textLength} chars</span>
      <span>•</span>
      <span>Normalized to {result.normalizedLength} chars</span>
      <span>•</span>
      <span>{result.elapsed.toFixed(1)}ms elapsed</span>
      <span>•</span>
      <span>{scanTime}</span>
    </div>
  )
})
