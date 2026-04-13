/**
 * File: JutsuModelCard.tsx
 * Purpose: Rich model card for LLM Jutsu showing key metrics
 * Story: NODA-3 Story 11.2
 * Index:
 * - JutsuModelCardProps (line 14)
 * - JutsuModelCard component (line 24)
 */

'use client'

import { memo, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { BeltBadge, getBeltRank } from '@/components/ui/BeltBadge'
import { Badge } from '@/components/ui/badge'
import { Eye, RefreshCw, Download, TrendingUp, TrendingDown, Minus, Clock, FlaskConical } from 'lucide-react'
import type { AggregatedModel } from './JutsuAggregation'
import { calculateTrend } from './JutsuAggregation'
import { AlignmentBadge } from './AlignmentBadge'
import { useBehavioralAnalysis } from '@/lib/contexts'

interface JutsuModelCardProps {
  model: AggregatedModel
  onView: (model: AggregatedModel) => void
  onRetest?: (modelId: string) => void
  onDownload?: (modelId: string) => void
}

export const JutsuModelCard = memo(function JutsuModelCard({
  model,
  onView,
  onRetest,
  onDownload,
}: JutsuModelCardProps) {
  const belt = getBeltRank(model.latestScore)
  const trend = calculateTrend(model.scoreTrend)
  const { getResult } = useBehavioralAnalysis()
  const alignment = getResult(model.modelId)?.alignment ?? null

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted-foreground)'

  const handleView = useCallback(() => onView(model), [model, onView])

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-card overflow-hidden',
        'hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
        'cursor-pointer focus-within:ring-2 focus-within:ring-ring',
      )}
      onClick={handleView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleView() } }}
      aria-label={`${model.modelName} — ${belt.label}, score ${model.latestScore}`}
    >
      {/* Belt Color Stripe */}
      <div className="h-1" style={{ backgroundColor: belt.color }} aria-hidden="true" />

      <div className="p-4 space-y-3">
        {/* Top Row: Name + Provider Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">{model.modelName}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[10px]">{model.provider}</Badge>
              {alignment && <AlignmentBadge imprint={alignment} />}
            </div>
          </div>
          <BeltBadge score={model.latestScore} size="md" />
        </div>

        {/* Score Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Resilience Score</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: belt.color }}>{model.latestScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full motion-safe:transition-all motion-safe:duration-[var(--transition-emphasis)]"
              style={{ width: `${Math.min(model.latestScore, 100)}%`, backgroundColor: belt.color }}
            />
          </div>
        </div>

        {/* Sparkline (simplified bar chart) */}
        {model.scoreTrend.length > 1 && (
          <div className="flex items-end gap-0.5 h-6" aria-label={`Score trend: ${trend}`}>
            {model.scoreTrend.map((score, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm motion-safe:transition-all"
                style={{
                  height: `${Math.max((score / 100) * 100, 8)}%`,
                  backgroundColor: i === model.scoreTrend.length - 1 ? belt.color : `color-mix(in srgb, ${belt.color} 40%, transparent)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Tests</p>
            <p className="text-xs font-bold tabular-nums">{model.totalExecutions}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Pass Rate</p>
            <p className="text-xs font-bold tabular-nums">{model.passRate}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Trend</p>
            <div className="flex items-center justify-center gap-0.5">
              <TrendIcon className="h-3 w-3" style={{ color: trendColor }} aria-hidden="true" />
              <span className="text-xs font-medium capitalize" style={{ color: trendColor }}>{trend}</span>
            </div>
          </div>
        </div>

        {/* Last Tested */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Last tested: {formatDate(model.lastTestedAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border)]">
          <button
            onClick={(e) => { e.stopPropagation(); handleView() }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--dojo-primary)] hover:bg-[var(--dojo-primary)]/10 motion-safe:transition-colors min-h-[44px]"
            aria-label={`View ${model.modelName} details`}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            View
          </button>
          {onRetest && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetest(model.modelId) }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors min-h-[44px]"
              aria-label={`Re-test ${model.modelName}`}
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Re-Test
            </button>
          )}
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(model.modelId) }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors min-h-[44px] ml-auto"
              aria-label={`Download ${model.modelName} report`}
            >
              <Download className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
