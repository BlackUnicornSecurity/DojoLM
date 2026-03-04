/**
 * File: PayloadCard.tsx
 * Purpose: Display payload catalog with clickable cards
 * Index:
 * - PayloadCard component (line 18)
 * - PayloadGrid component (line 70)
 */

'use client'

import { PayloadEntry } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Zap, Package } from 'lucide-react'

interface PayloadCardProps {
  payload: PayloadEntry
  onClick: (payload: PayloadEntry) => void
  className?: string
}

export function PayloadCard({ payload, onClick, className }: PayloadCardProps) {
  const statusColor = payload.status === 'current'
    ? 'text-green-500 bg-green-500/10 border-green-500/20'
    : 'text-orange-500 bg-orange-500/10 border-orange-500/20'

  const StatusIcon = payload.status === 'current' ? Zap : Package

  return (
    <Card
      className={cn(
        'cursor-pointer motion-safe:transition-all hover:border-primary/50 hover:shadow-md',
        className
      )}
      onClick={() => onClick(payload)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
            {payload.title}
          </CardTitle>
          <Badge variant="outline" className={cn('text-xs', statusColor)}>
            {payload.status === 'current' ? 'Active' : 'Planned'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {payload.desc}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Story: {payload.story}</span>
        </div>

        {/* React JSX auto-escapes text children. Do not apply escHtml() here. */}
        <code className="block text-xs font-mono p-3 bg-muted rounded border overflow-hidden">
          <pre className="whitespace-pre-wrap break-all text-orange-500">
            {payload.example}
          </pre>
        </code>

        <div className="text-xs text-muted-foreground italic">
          Click to load into scanner
        </div>
      </CardContent>
    </Card>
  )
}

interface PayloadGridProps {
  payloads: PayloadEntry[]
  showCurrent: boolean
  showPlanned: boolean
  onLoadPayload: (payload: PayloadEntry) => void
  className?: string
}

export function PayloadGrid({
  payloads,
  showCurrent,
  showPlanned,
  onLoadPayload,
  className
}: PayloadGridProps) {
  const filteredPayloads = payloads.filter(p =>
    (p.status === 'current' && showCurrent) || (p.status === 'planned' && showPlanned)
  )

  if (filteredPayloads.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-2">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              No payloads match the current filters
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {filteredPayloads.map((payload, idx) => (
        <PayloadCard
          key={`${payload.title}-${idx}`}
          payload={payload}
          onClick={onLoadPayload}
        />
      ))}
    </div>
  )
}

interface PayloadFiltersProps {
  showCurrent: boolean
  showPlanned: boolean
  onCurrentChange: (checked: boolean) => void
  onPlannedChange: (checked: boolean) => void
  className?: string
}

export function PayloadFilters({
  showCurrent,
  showPlanned,
  onCurrentChange,
  onPlannedChange,
  className
}: PayloadFiltersProps) {
  return (
    <div className={cn('flex items-center gap-4 flex-wrap', className)}>
      <span className="text-sm font-medium">Show:</span>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={showCurrent}
          onCheckedChange={onCurrentChange}
        />
        <span>Current Detection</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={showPlanned}
          onCheckedChange={onPlannedChange}
        />
        <span>TPI Planned</span>
      </label>
    </div>
  )
}
