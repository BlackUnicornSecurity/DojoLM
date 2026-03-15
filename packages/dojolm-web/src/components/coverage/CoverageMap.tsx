/**
 * File: CoverageMap.tsx
 * Purpose: Display coverage map with progress bars (TPI or OWASP LLM)
 * Index:
 * - CoverageMap component (line 18)
 * - CoverageProgressBar component (line 68)
 */

'use client'

import { CoverageEntry } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, Shield, Database } from 'lucide-react'

interface CoverageMapProps {
  coverageData: CoverageEntry[]
  className?: string
  title?: string
  subtitle?: string
  icon?: 'shield' | 'database'
}

export function CoverageMap({
  coverageData,
  className,
  title = 'TPI Coverage Map',
  subtitle = 'CrowdStrike TPI taxonomy coverage • Implementation progress',
  icon = 'shield'
}: CoverageMapProps) {
  const Icon = icon === 'shield' ? Shield : Database

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverageData.map((item, idx) => (
              <TableRow key={`${item.category}-${idx}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.category}
                    {item.gap && (
                      <Badge variant="outline" className="text-red-500 border-red-500/20 text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Gap
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <CoverageProgressBar value={item.post} target={100} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.stories}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 bg-green-500 rounded-full" />
            <span>Full coverage (≥80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 bg-orange-500 rounded-full" />
            <span>Partial coverage (1-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 bg-red-500 rounded-full" />
            <span>Gap (0%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CoverageProgressBarProps {
  value: number
  target: number
}

function CoverageProgressBar({ value, target }: CoverageProgressBarProps) {
  const getColor = (value: number) => {
    if (value >= 80) return 'bg-green-500'
    if (value > 0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const percentage = Math.min(value, 100)

  return (
    <div className="w-full">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full motion-safe:transition-all duration-[var(--transition-emphasis)]', getColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {value < target && (
        <div className="mt-1 text-xs text-muted-foreground">
          Target: {target}%
        </div>
      )}
    </div>
  )
}

interface CoverageSummaryProps {
  coverageData: CoverageEntry[]
  className?: string
}

export function CoverageSummary({ coverageData, className }: CoverageSummaryProps) {
  const avgPre = Math.round(
    coverageData.reduce((sum, item) => sum + item.pre, 0) / coverageData.length
  )
  const avgPost = Math.round(
    coverageData.reduce((sum, item) => sum + item.post, 0) / coverageData.length
  )
  const gaps = coverageData.filter(item => item.gap).length
  const fullCoverage = coverageData.filter(item => item.pre >= 80).length

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{avgPre}%</div>
          <div className="text-xs text-muted-foreground mt-1">Avg Baseline</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{avgPost}%</div>
          <div className="text-xs text-muted-foreground mt-1">Avg Coverage</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">
            {fullCoverage}/{coverageData.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Full Coverage</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className={cn('text-2xl font-bold', gaps > 0 ? 'text-red-500' : 'text-green-500')}>
            {gaps}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Gaps</div>
        </CardContent>
      </Card>
    </div>
  )
}
