'use client'

/**
 * File: ThreatTrendWidget.tsx
 * Purpose: Line chart of scan results over session
 * Story: TPI-NODA-1.5.9
 */

import { useScannerMetrics } from '@/lib/hooks'
import { DojoLineChart } from '@/components/charts'
import { WidgetCard } from '../WidgetCard'

export function ThreatTrendWidget() {
  const metrics = useScannerMetrics()

  const data = metrics.threatTrend.map((value, i) => ({
    scan: `${i + 1}`,
    threats: value,
  }))

  if (data.length === 0) {
    return (
      <WidgetCard title="Threat Trend">
        <p className="text-xs text-muted-foreground text-center py-6">
          Run scans to see threat trends
        </p>
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Threat Trend">
      <DojoLineChart
        title=""
        data={data}
        dataKey="threats"
        xKey="scan"
        className="border-0 shadow-none p-0"
      />
    </WidgetCard>
  )
}
