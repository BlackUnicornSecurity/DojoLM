/**
 * File: BarChart.tsx
 * Purpose: Bar chart for category distributions and comparisons
 * Story: TPI-UI-001-14
 * Index:
 * - DojoBarChartProps interface (line 14)
 * - DojoBarChart component (line 22)
 */

'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface DojoBarChartProps {
  title: string
  data: Record<string, unknown>[]
  dataKey: string
  xKey: string
  className?: string
}

const RechartsBarChart = dynamic(
  () => import('recharts').then(mod => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod
    return function Chart({ data, dataKey, xKey }: { data: Record<string, unknown>[]; dataKey: string; xKey: string }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar
              dataKey={dataKey}
              fill="var(--dojo-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false }
)

export function DojoBarChart({ title, data, dataKey, xKey, className }: DojoBarChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RechartsBarChart data={data} dataKey={dataKey} xKey={xKey} />
      </CardContent>
    </Card>
  )
}
