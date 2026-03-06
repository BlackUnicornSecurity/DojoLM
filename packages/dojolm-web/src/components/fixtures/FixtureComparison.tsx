/**
 * File: FixtureComparison.tsx
 * Purpose: Side-by-side fixture comparison with scan result diffs
 * Story: 3.3 - Fixture Comparison Mode
 * Index:
 * - ComparisonItem type (line 14)
 * - FixtureComparison component (line 22)
 * - ComparisonPane component (line 84)
 * - ScanDiffDisplay component (line 140)
 */

'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, ArrowLeftRight, FileText } from 'lucide-react'
import type { TextFixtureResponse, BinaryFixtureResponse, ScanResult } from '@/lib/types'

export interface ComparisonItem {
  path: string
  content: TextFixtureResponse | BinaryFixtureResponse | null
  scanResult: ScanResult | null
}

interface FixtureComparisonProps {
  items: [ComparisonItem, ComparisonItem]
  onClose: () => void
  className?: string
}

export const FixtureComparison = memo(function FixtureComparison({
  items,
  onClose,
  className,
}: FixtureComparisonProps) {
  const [left, right] = items

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-lg">Fixture Comparison</CardTitle>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close comparison"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side-by-side panes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonPane item={left} label="Left" />
          <ComparisonPane item={right} label="Right" />
        </div>

        {/* Scan result diff */}
        {left.scanResult && right.scanResult && (
          <>
            <Separator />
            <ScanDiffDisplay left={left.scanResult} right={right.scanResult} leftPath={left.path} rightPath={right.path} />
          </>
        )}
      </CardContent>
    </Card>
  )
})

/** Single pane in the comparison view */
function ComparisonPane({ item, label }: { item: ComparisonItem; label: string }) {
  const isBinary = item.content && 'hex_preview' in item.content

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium truncate" title={item.path}>
          {item.path}
        </span>
      </div>

      {item.content ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {item.content.size} bytes
            {isBinary && ' (binary)'}
          </div>

          {isBinary ? (
            <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
              {(item.content as BinaryFixtureResponse).hex_preview}
            </pre>
          ) : (
            <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {(item.content as TextFixtureResponse).content}
            </pre>
          )}

          {item.scanResult && (
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge
                variant={item.scanResult.verdict === 'BLOCK' ? 'critical' : 'success'}
                className="text-xs"
              >
                {item.scanResult.verdict}
              </Badge>
              {item.scanResult.counts.critical > 0 && (
                <Badge variant="critical" className="text-xs">
                  {item.scanResult.counts.critical} critical
                </Badge>
              )}
              {item.scanResult.counts.warning > 0 && (
                <Badge variant="warning" className="text-xs">
                  {item.scanResult.counts.warning} warning
                </Badge>
              )}
              {item.scanResult.counts.info > 0 && (
                <Badge variant="info" className="text-xs">
                  {item.scanResult.counts.info} info
                </Badge>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
          Loading {label.toLowerCase()} fixture...
        </div>
      )}
    </div>
  )
}

/** Side-by-side scan result diff */
function ScanDiffDisplay({
  left,
  right,
  leftPath,
  rightPath,
}: {
  left: ScanResult
  right: ScanResult
  leftPath: string
  rightPath: string
}) {
  /** Findings unique to left or right */
  const diffs = useMemo(() => {
    const leftEngines = new Set(left.findings.map(f => `${f.engine}:${f.description}`))
    const rightEngines = new Set(right.findings.map(f => `${f.engine}:${f.description}`))

    const onlyLeft = left.findings.filter(f => !rightEngines.has(`${f.engine}:${f.description}`))
    const onlyRight = right.findings.filter(f => !leftEngines.has(`${f.engine}:${f.description}`))
    const shared = left.findings.filter(f => rightEngines.has(`${f.engine}:${f.description}`))

    return { onlyLeft, onlyRight, shared }
  }, [left.findings, right.findings])

  const leftFilename = leftPath.includes('/') ? leftPath.split('/').pop() : leftPath
  const rightFilename = rightPath.includes('/') ? rightPath.split('/').pop() : rightPath

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Detection Differences</h4>

      {/* Summary row */}
      <div className="flex gap-3 flex-wrap text-xs">
        <span className="text-muted-foreground">
          Shared: <strong>{diffs.shared.length}</strong>
        </span>
        <span className="text-red-500">
          Only in {leftFilename}: <strong>{diffs.onlyLeft.length}</strong>
        </span>
        <span className="text-blue-500">
          Only in {rightFilename}: <strong>{diffs.onlyRight.length}</strong>
        </span>
      </div>

      {/* Verdict comparison */}
      <div className="flex gap-4">
        <div className="flex-1 text-center p-2 rounded-lg bg-muted">
          <div className={cn('text-sm font-bold', left.verdict === 'BLOCK' ? 'text-red-500' : 'text-green-500')}>
            {left.verdict}
          </div>
          <div className="text-xs text-muted-foreground truncate">{leftFilename}</div>
        </div>
        <div className="flex items-center">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="flex-1 text-center p-2 rounded-lg bg-muted">
          <div className={cn('text-sm font-bold', right.verdict === 'BLOCK' ? 'text-red-500' : 'text-green-500')}>
            {right.verdict}
          </div>
          <div className="text-xs text-muted-foreground truncate">{rightFilename}</div>
        </div>
      </div>

      {/* Unique findings lists */}
      {diffs.onlyLeft.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-500">Only in {leftFilename}:</p>
          {diffs.onlyLeft.map((f, i) => (
            <div key={`l-${f.engine}-${i}`} className="text-xs text-muted-foreground pl-3 border-l-2 border-red-500/30">
              [{f.severity}] {f.engine}: {f.description}
            </div>
          ))}
        </div>
      )}

      {diffs.onlyRight.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-500">Only in {rightFilename}:</p>
          {diffs.onlyRight.map((f, i) => (
            <div key={`r-${f.engine}-${i}`} className="text-xs text-muted-foreground pl-3 border-l-2 border-blue-500/30">
              [{f.severity}] {f.engine}: {f.description}
            </div>
          ))}
        </div>
      )}

      {diffs.onlyLeft.length === 0 && diffs.onlyRight.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Both fixtures have identical detection results
        </p>
      )}
    </div>
  )
}
