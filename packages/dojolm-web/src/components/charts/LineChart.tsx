/**
 * File: LineChart.tsx
 * Purpose: Line chart with gradient fill for trend visualization
 * Story: TPI-UI-001-14
 * Index:
 * - DojoLineChartProps interface (line 14)
 * - DojoLineChart component (line 22)
 */

'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface DojoLineChartProps {
  title: string
  data: Record<string, unknown>[]
  dataKey: string
  xKey: string
  className?: string
}

const RechartsLineChart = dynamic(
  () => import('recharts').then(mod => {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } = mod
    return function Chart({ data, dataKey, xKey }: { data: Record<string, unknown>[]; dataKey: string; xKey: string }) {
      const gradientId = `lineGradient-${dataKey}`
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dojo-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--dojo-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} stroke="var(--text-tertiary)" fontSize={12} />
            <YAxis stroke="var(--text-tertiary)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--dojo-primary)' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="var(--dojo-primary)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false }
)

export function DojoLineChart({ title, data, dataKey, xKey, className }: DojoLineChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RechartsLineChart data={data} dataKey={dataKey} xKey={xKey} />
      </CardContent>
    </Card>
  )
}
