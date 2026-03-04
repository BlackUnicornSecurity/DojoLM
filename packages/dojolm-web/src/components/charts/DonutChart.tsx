/**
 * File: DonutChart.tsx
 * Purpose: Ring/donut chart for category proportions and breakdowns
 * Story: TPI-UI-001-14
 * Index:
 * - DonutSegment interface (line 13)
 * - DojoDonutChartProps interface (line 19)
 * - DONUT_COLORS constant (line 27)
 * - DojoDonutChart component (line 37)
 */

'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DonutSegment {
  name: string
  value: number
}

export interface DojoDonutChartProps {
  title: string
  data: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  className?: string
}

const DONUT_COLORS = [
  'var(--dojo-primary)',
  'var(--success)',
  'var(--warning)',
  'var(--severity-low)',
  'var(--muted-foreground)',
  'var(--severity-high)',
  'var(--dojo-electric)',
  'var(--text-tertiary)',
]

const RechartsDonut = dynamic(
  () => import('recharts').then(mod => {
    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } = mod
    return function Chart({ data, centerLabel, centerValue }: { data: DonutSegment[]; centerLabel?: string; centerValue?: string | number }) {
      return (
        <div className="relative">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          {(centerLabel || centerValue !== undefined) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerValue !== undefined && (
                <span className="text-2xl font-bold text-[var(--foreground)]">
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-xs text-muted-foreground">
                  {centerLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }
  }),
  { ssr: false }
)

export function DojoDonutChart({ title, data, centerLabel, centerValue, className }: DojoDonutChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RechartsDonut data={data} centerLabel={centerLabel} centerValue={centerValue} />
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {data.map((segment, index) => (
            <div key={segment.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              <span className="text-muted-foreground">{segment.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
