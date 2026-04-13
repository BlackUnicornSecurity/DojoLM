/**
 * File: RefusalDepthChart.tsx
 * Purpose: Line/area chart showing refusal probability vs prompt severity
 * Epic: OBLITERATUS (OBL) — T5.1
 * Index:
 * - RefusalDepthChart component (line 10)
 */

'use client'

import type { RefusalDepthProfile } from '@/lib/types'
import { DojoLineChart } from '@/components/charts/LineChart'
import { Badge } from '@/components/ui/badge'

interface RefusalDepthChartProps {
  profile: RefusalDepthProfile | null
}

const DEPTH_COLORS: Record<string, string> = {
  shallow: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  deep: 'bg-red-500/20 text-red-400',
}

export function RefusalDepthChart({ profile }: RefusalDepthChartProps) {
  if (!profile) return null

  const transformed = profile.thresholds.map(t => ({
    severity: t.promptSeverity,
    probability: Math.round(t.refusalProbability * 100) / 100,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-zinc-300">Refusal Depth Profile</h4>
        <Badge className={DEPTH_COLORS[profile.activationDepth] ?? ''}>
          {profile.activationDepth}
        </Badge>
      </div>

      <DojoLineChart
        title="Refusal Depth Profile"
        data={transformed}
        dataKey="probability"
        xKey="severity"
      />

      <p className="text-xs text-muted-foreground">
        Sharpness: <span className="font-medium">{Math.round(profile.sharpness * 100)}%</span>
        {' '}&mdash; higher means steeper refusal transition
      </p>
    </div>
  )
}
