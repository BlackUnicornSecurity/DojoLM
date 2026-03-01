/**
 * File: TrendChart.tsx
 * Purpose: Mini sparkline chart for embedding in MetricCards
 * Story: TPI-UI-001-14
 * Index:
 * - DojoTrendChartProps interface (line 12)
 * - DojoTrendChart component (line 19)
 */

'use client'

import dynamic from 'next/dynamic'

export interface DojoTrendChartProps {
  data: Record<string, unknown>[]
  dataKey: string
  color?: string
  height?: number
  className?: string
}

const RechartsTrendChart = dynamic(
  () => import('recharts').then(mod => {
    const { AreaChart, Area, ResponsiveContainer } = mod
    return function Chart({ data, dataKey, color, height }: { data: Record<string, unknown>[]; dataKey: string; color: string; height: number }) {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`trend-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#trend-${dataKey})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false }
)

export function DojoTrendChart({
  data,
  dataKey,
  color = 'var(--dojo-primary)',
  height = 40,
  className,
}: DojoTrendChartProps) {
  return (
    <div className={className}>
      <RechartsTrendChart data={data} dataKey={dataKey} color={color} height={height} />
    </div>
  )
}
