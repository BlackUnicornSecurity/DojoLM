/**
 * File: FindingsList.tsx
 * Purpose: Display scan results with findings list
 * Phase 6: Performance optimizations with React.memo
 * Index:
 * - FindingsList component (line 17)
 * - FindingCard component (line 70)
 * - ResultSummary component (line 115)
 */

'use client'

import { Finding, ScanResult } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn, escHtml } from '@/lib/utils'
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { memo, useMemo } from 'react'

const SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

interface FindingsListProps {
  result: ScanResult | null
  className?: string
}

export const FindingsList = memo(function FindingsList({ result, className }: FindingsListProps) {
  if (!result) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Enter text and click Scan to analyze
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResultSummary result={result} />

        <Separator />

        {result.findings.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <p className="text-muted-foreground">
                No findings detected. Text appears safe.
              </p>
            </div>
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
    </Card>
  )
})

interface FindingCardProps {
  finding: Finding
}

const FindingCard = memo(function FindingCard({ finding }: FindingCardProps) {
  const severityClass = useMemo(() => ({
    [SEVERITY.CRITICAL]: 'critical',
    [SEVERITY.WARNING]: 'warning',
    [SEVERITY.INFO]: 'info',
  }[finding.severity]), [finding.severity])

  const severityColor = useMemo(() => ({
    [SEVERITY.CRITICAL]: 'text-red-500 bg-red-500/10 border-red-500/20',
    [SEVERITY.WARNING]: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    [SEVERITY.INFO]: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  }[finding.severity]), [finding.severity])

  const SeverityIcon = useMemo(() => ({
    [SEVERITY.CRITICAL]: ShieldAlert,
    [SEVERITY.WARNING]: AlertTriangle,
    [SEVERITY.INFO]: Info,
  }[finding.severity]), [finding.severity])

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-l-4 bg-muted/50',
        severityClass === 'critical' && 'border-l-red-500',
        severityClass === 'warning' && 'border-l-orange-500',
        severityClass === 'info' && 'border-l-blue-500'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <SeverityIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {finding.category}
          </span>
        </div>
        <Badge className={cn('text-xs', severityColor)} variant="secondary">
          {finding.severity}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {finding.description}
      </p>

      {finding.match && (
        <code className="block text-xs font-mono p-2 bg-background rounded border">
          <span className="text-orange-500">{finding.match}</span>
        </code>
      )}

      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>Engine: {finding.engine}</span>
        {finding.pattern_name && <span>• {finding.pattern_name}</span>}
        {finding.source !== 'current' && (
          <span className="text-purple-500">• {finding.source}</span>
        )}
      </div>
    </div>
  )
})

interface ResultSummaryProps {
  result: ScanResult
}

const ResultSummary = memo(function ResultSummary({ result }: ResultSummaryProps) {
  const verdictColor = useMemo(() => ({
    BLOCK: 'text-red-500',
    ALLOW: 'text-green-500',
  }[result.verdict]), [result.verdict])

  const VerdictIcon = useMemo(() =>
    result.verdict === 'BLOCK' ? ShieldAlert : CheckCircle2,
    [result.verdict]
  )

  return (
    <div className="flex gap-3 flex-wrap">
      <Card className="flex-1 min-w-[100px]">
        <CardContent className="p-4 text-center">
          <div className={cn('text-2xl font-bold', verdictColor)}>
            {result.verdict}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Verdict</div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-[100px]">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-500">
            {result.counts.critical}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Critical</div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-[100px]">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">
            {result.counts.warning}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Warning</div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-[100px]">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">
            {result.counts.info}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Info</div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-[100px]">
        <CardContent className="p-4 text-center">
          <VerdictIcon className="h-6 w-6 mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">
            {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

interface PerformanceInfoProps {
  result: ScanResult
}

const PerformanceInfo = memo(function PerformanceInfo({ result }: PerformanceInfoProps) {
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span>Scanned {result.textLength} chars</span>
      <span>•</span>
      <span>Normalized to {result.normalizedLength} chars</span>
      <span>•</span>
      <span>{result.elapsed.toFixed(1)}ms elapsed</span>
    </div>
  )
})
