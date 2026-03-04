/**
 * File: CoverageMap.tsx
 * Purpose: Grid-based heatmap showing test coverage by security category
 * Story: TPI-UI-001-14
 * Index:
 * - CoverageCell interface (line 13)
 * - DojoCoverageMapProps interface (line 19)
 * - getColorForValue helper (line 28)
 * - DojoCoverageMap component (line 43)
 */

'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CoverageCell {
  label: string
  value: number
  total?: number
}

export interface DojoCoverageMapProps {
  title: string
  data: CoverageCell[]
  className?: string
}

/**
 * Returns a color between red (0%) → amber (50%) → green (100%)
 * using the project design tokens
 */
function getColorForValue(value: number): string {
  if (value >= 80) return 'var(--success)'
  if (value >= 50) return 'var(--warning)'
  if (value >= 20) return 'var(--dojo-primary)'
  return 'var(--bg-quaternary)'
}

function getTextColor(value: number): string {
  if (value >= 50) return 'var(--background)'
  return 'var(--foreground)'
}

export function DojoCoverageMap({ title, data, className }: DojoCoverageMapProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {data.map((cell) => (
            <div
              key={cell.label}
              className={cn(
                "relative rounded-lg p-3 text-center",
                "motion-safe:transition-transform motion-safe:duration-[var(--transition-fast)]",
                "motion-safe:hover:scale-105"
              )}
              style={{ backgroundColor: getColorForValue(cell.value) }}
              title={`${cell.label}: ${cell.value}%${cell.total ? ` (${cell.total} tests)` : ''}`}
            >
              <p
                className="text-xs font-medium truncate"
                style={{ color: getTextColor(cell.value) }}
              >
                {cell.label}
              </p>
              <p
                className="text-lg font-bold mt-1"
                style={{ color: getTextColor(cell.value) }}
              >
                {cell.value}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
