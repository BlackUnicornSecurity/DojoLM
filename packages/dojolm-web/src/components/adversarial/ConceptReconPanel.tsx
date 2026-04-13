/**
 * File: ConceptReconPanel.tsx
 * Purpose: Concept cone geometry visualization with per-angle consistency bars
 * Epic: OBLITERATUS (OBL) — T4.1
 * Index:
 * - ConceptReconPanel component (line 10)
 */

'use client'

import type { ConceptGeometry } from '@/lib/types'
import { DojoBarChart } from '@/components/charts/BarChart'
import { Badge } from '@/components/ui/badge'

interface ConceptReconPanelProps {
  geometry: ConceptGeometry | null
  isLoading: boolean
}

const TYPE_COLORS: Record<string, string> = {
  monolithic: 'bg-green-500/20 text-green-400',
  polyhedral: 'bg-red-500/20 text-red-400',
  mixed: 'bg-yellow-500/20 text-yellow-400',
}

const STRATEGY_TEXT: Record<string, string> = {
  monolithic: 'Model has uniform safety boundaries across all approach angles. Consistent, difficult to bypass via reframing.',
  polyhedral: 'Model shows different refusal thresholds for different approach angles. Framing and persona shifts may reveal inconsistencies.',
  mixed: 'Model shows moderate variation in safety boundaries across approach angles.',
}

export function ConceptReconPanel({ geometry, isLoading }: ConceptReconPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <p className="text-xs text-muted-foreground animate-pulse">Analyzing concept geometry...</p>
      </div>
    )
  }

  if (!geometry) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <p className="text-xs text-muted-foreground">No geometry data. Run concept recon analysis first.</p>
      </div>
    )
  }

  const transformed = geometry.facets.map(f => ({
    angle: f.angle,
    consistency: Math.round(f.consistency * 100) / 100,
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-zinc-300">Concept Geometry</h4>
        <Badge className={TYPE_COLORS[geometry.type] ?? ''}>
          {geometry.type}
        </Badge>
      </div>

      {transformed.length > 0 && (
        <DojoBarChart
          title="Refusal Consistency by Angle"
          data={transformed}
          dataKey="consistency"
          xKey="angle"
        />
      )}

      <div className="rounded-lg bg-zinc-800/50 p-3">
        <p className="text-xs text-zinc-400">
          {STRATEGY_TEXT[geometry.type] ?? STRATEGY_TEXT.mixed}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Solid Angle: {Math.round(geometry.solidAngle * 100)}%
        </p>
      </div>
    </div>
  )
}
