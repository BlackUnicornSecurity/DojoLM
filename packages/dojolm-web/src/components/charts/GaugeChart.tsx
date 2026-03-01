/**
 * File: GaugeChart.tsx
 * Purpose: Radial/semicircle gauge for pass rates, coverage, confidence
 * Story: TPI-UI-001-14
 * Index:
 * - DojoGaugeChartProps interface (line 13)
 * - getColorForValue helper (line 21)
 * - DojoGaugeChart component (line 29)
 */

'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface DojoGaugeChartProps {
  title: string
  value: number
  label?: string
  className?: string
}

function getColorForValue(value: number): string {
  if (value >= 80) return 'var(--success)'
  if (value >= 50) return 'var(--warning)'
  return 'var(--dojo-primary)'
}

const RechartsGauge = dynamic(
  () => import('recharts').then(mod => {
    const { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } = mod
    return function Chart({ value, label }: { value: number; label?: string }) {
      const data = [{ value, fill: getColorForValue(value) }]
      return (
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={0}
              data={data}
              cx="50%"
              cy="80%"
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: 'var(--bg-quaternary)' }}
                dataKey="value"
                angleAxisId={0}
                cornerRadius={8}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-6">
            <span className="text-2xl font-bold text-[var(--foreground)]">
              {value}%
            </span>
            {label && (
              <span className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {label}
              </span>
            )}
          </div>
        </div>
      )
    }
  }),
  { ssr: false }
)

export function DojoGaugeChart({ title, value, label, className }: DojoGaugeChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RechartsGauge value={value} label={label} />
      </CardContent>
    </Card>
  )
}
