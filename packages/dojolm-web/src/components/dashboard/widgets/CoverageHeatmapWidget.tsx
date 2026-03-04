'use client'

/**
 * File: CoverageHeatmapWidget.tsx
 * Purpose: TPI categories as colored grid cells using DojoCoverageMap
 * Story: TPI-NODA-1.5.9
 */

import { COVERAGE_DATA } from '@/lib/constants'
import { DojoCoverageMap } from '@/components/charts'
import { WidgetCard } from '../WidgetCard'

export function CoverageHeatmapWidget() {
  const cells = COVERAGE_DATA.map(entry => ({
    label: entry.category,
    value: entry.post,
    total: 100,
  }))

  return (
    <WidgetCard title="Coverage Heatmap">
      <DojoCoverageMap
        title=""
        data={cells}
        className="border-0 shadow-none p-0"
      />
    </WidgetCard>
  )
}
