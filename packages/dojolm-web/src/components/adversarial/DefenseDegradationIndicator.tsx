/**
 * File: DefenseDegradationIndicator.tsx
 * Purpose: Line chart showing defense degradation curve and recovery rate
 * Epic: OBLITERATUS (OBL) — T3.1
 * Index:
 * - DefenseDegradationIndicator component (line 10)
 */

'use client'

import { DojoLineChart } from '@/components/charts/LineChart'

interface DefenseDegradationIndicatorProps {
  degradationCurve: readonly number[]
  recoveryRate: number
}

export function DefenseDegradationIndicator({ degradationCurve, recoveryRate }: DefenseDegradationIndicatorProps) {
  const transformed = degradationCurve.map((rate, i) => ({
    step: i,
    rate: Math.round(rate * 100) / 100,
  }))

  return (
    <div className="space-y-2">
      <DojoLineChart
        title="Defense Degradation"
        data={transformed}
        dataKey="rate"
        xKey="step"
      />
      <p className="text-xs text-muted-foreground">
        Recovery Rate: <span className="font-medium">{Math.round(recoveryRate * 100)}%</span>
      </p>
    </div>
  )
}
