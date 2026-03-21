'use client'

/**
 * File: KagamiResults.tsx
 * Purpose: Displays fingerprint identification/verification results
 * Story: K5.2
 * Index:
 * - KagamiResultsProps interface (line ~25)
 * - ConfidenceBar helper (line ~40)
 * - CandidateCard component (line ~60)
 * - VerificationCard component (line ~130)
 * - KagamiResults component (line ~180)
 */

import { useState, useCallback } from 'react'
import {
  Download, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Trophy, Medal, Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  KagamiResult,
  CandidateMatch,
  VerificationResult,
} from 'bu-tpi/fingerprint'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface KagamiResultsProps {
  /** Identification mode results */
  readonly result?: KagamiResult
  /** Verification mode result */
  readonly verification?: VerificationResult
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-emerald-500'
  if (confidence >= 0.6) return 'bg-amber-500'
  return 'bg-red-500'
}

function ConfidenceBar({ confidence }: { readonly confidence: number }) {
  const pct = Math.round(confidence * 100)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={cn('h-full rounded-full motion-safe:transition-all motion-safe:duration-500', confidenceColor(confidence))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold w-12 text-right">{pct}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rank icons
// ---------------------------------------------------------------------------

const RANK_ICONS = [Trophy, Medal, Award] as const

function RankIcon({ rank }: { readonly rank: number }) {
  const Icon = rank < RANK_ICONS.length ? RANK_ICONS[rank] : null
  if (!Icon) return <span className="text-sm text-muted-foreground font-mono w-6 text-center">#{rank + 1}</span>
  const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
  return <Icon className={cn('h-5 w-5', colors[rank])} aria-hidden="true" />
}

// ---------------------------------------------------------------------------
// CandidateCard
// ---------------------------------------------------------------------------

function CandidateCard({
  candidate,
  rank,
}: {
  readonly candidate: CandidateMatch
  readonly rank: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={cn(rank === 0 && 'border-emerald-500/30')}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <RankIcon rank={rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--foreground)] truncate">
                {candidate.modelId}
              </span>
              <Badge variant="default">{candidate.provider}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{candidate.modelFamily}</span>
          </div>
        </div>

        {/* Confidence bar */}
        <ConfidenceBar confidence={candidate.confidence} />

        {/* Feature summary */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{candidate.matchedFeatures.length} matched</span>
          <span>{candidate.divergentFeatures.length} divergent</span>
          <span>distance: {candidate.distance.toFixed(3)}</span>
        </div>

        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-[var(--dojo-primary)] hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} feature comparison
        </button>

        {expanded && (
          <div className="space-y-2 pt-1">
            {candidate.matchedFeatures.length > 0 && (
              <div>
                <span className="text-xs font-medium text-emerald-400">Matched Features</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.matchedFeatures.map((f) => (
                    <Badge key={f} variant="success">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
            {candidate.divergentFeatures.length > 0 && (
              <div>
                <span className="text-xs font-medium text-amber-400">Divergent Features</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.divergentFeatures.map((f) => (
                    <Badge key={f} variant="warning">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// VerificationCard
// ---------------------------------------------------------------------------

function VerificationCard({ verification }: { readonly verification: VerificationResult }) {
  return (
    <Card className={cn(
      'border',
      verification.match ? 'border-emerald-500/30' : 'border-red-500/30',
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {verification.match
            ? <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            : <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />}
          {verification.match ? 'Identity Verified' : 'Identity Mismatch'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Expected Model</span>
            <p className="font-medium">{verification.expectedSignature.modelId}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Provider</span>
            <p className="font-medium">{verification.expectedSignature.provider}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Drift Score</span>
            <p className={cn(
              'font-mono font-semibold',
              verification.driftScore < 0.15 ? 'text-emerald-400' : verification.driftScore < 0.35 ? 'text-amber-400' : 'text-red-400',
            )}>
              {(verification.driftScore * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Divergent Features</span>
            <p className="font-mono">{verification.divergentFeatures.length}</p>
          </div>
        </div>

        {verification.divergentFeatures.length > 0 && (
          <div>
            <span className="text-xs font-medium text-amber-400">Divergent Features</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {verification.divergentFeatures.map((f) => (
                <Badge key={f} variant="warning">{f}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// KagamiResults
// ---------------------------------------------------------------------------

export function KagamiResults({ result, verification, className }: KagamiResultsProps) {
  const handleExport = useCallback(() => {
    const data = verification ?? result
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kagami-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, verification])

  if (!result && !verification) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          {verification ? 'Verification Result' : 'Identification Results'}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          Export JSON
        </Button>
      </div>

      {/* Verification mode */}
      {verification && <VerificationCard verification={verification} />}

      {/* Identification mode — top 5 candidates */}
      {result && (
        <>
          <div className="text-sm text-muted-foreground">
            {result.candidates.length} candidates from {result.totalProbes} probes
            ({(result.elapsed / 1000).toFixed(1)}s)
          </div>
          <div className="space-y-3">
            {result.candidates.slice(0, 5).map((candidate, idx) => (
              <CandidateCard key={candidate.modelId} candidate={candidate} rank={idx} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
