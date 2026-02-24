/**
 * File: FixtureDetail.tsx
 * Purpose: Display fixture content and scan results
 * Index:
 * - FixtureDetail component (line 18)
 */

'use client'

import { TextFixtureResponse, BinaryFixtureResponse, ScanResult } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn, escHtml, formatDuration } from '@/lib/utils'
import { X, FileText, HardDrive, ScanEye } from 'lucide-react'

interface FixtureDetailProps {
  path: string | null
  content: TextFixtureResponse | BinaryFixtureResponse | null
  scanResult: ScanResult | null
  isScanning?: boolean
  onClose: () => void
  onRescan?: () => void
  className?: string
}

export function FixtureDetail({
  path,
  content,
  scanResult,
  isScanning = false,
  onClose,
  onRescan,
  className
}: FixtureDetailProps) {
  if (!path || !content) {
    return null
  }

  const isBinary = 'hex_preview' in content

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBinary ? (
              <HardDrive className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">{path}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onRescan && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRescan}
                disabled={isScanning}
                className="gap-1"
              >
                <ScanEye className="h-4 w-4" />
                Rescan
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Size: {content.size} bytes</span>
          {isBinary && 'metadata' in content && (
            <>
              <span>•</span>
              <span>Format: {content.metadata.format}</span>
              {content.metadata.valid_jpeg !== undefined && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className={content.metadata.valid_jpeg ? 'text-green-500' : 'text-red-500'}>
                    JPEG: {content.metadata.valid_jpeg ? 'Valid' : 'Invalid'}
                  </Badge>
                </>
              )}
            </>
          )}
        </div>

        <Separator />

        {isBinary ? (
          <BinaryPreview content={content as BinaryFixtureResponse} />
        ) : (
          <TextPreview content={content as TextFixtureResponse} />
        )}

        {scanResult && (
          <>
            <Separator />
            <ScanResultDisplay result={scanResult} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface BinaryPreviewProps {
  content: BinaryFixtureResponse
}

function BinaryPreview({ content }: BinaryPreviewProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Hex Preview (first 256 bytes)</h4>
      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
        {content.hex_preview}
      </pre>

      {content.metadata.extracted_text && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Extracted Text</h4>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            {content.metadata.extracted_text}
          </p>
        </div>
      )}

      {content.metadata.warning && (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-3 rounded-lg text-sm">
          <strong>Warning:</strong> {content.metadata.warning}
        </div>
      )}
    </div>
  )
}

interface TextPreviewProps {
  content: TextFixtureResponse
}

function TextPreview({ content }: TextPreviewProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Content</h4>
      <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
        {escHtml(content.content)}
      </pre>
    </div>
  )
}

interface ScanResultDisplayProps {
  result: ScanResult
}

function ScanResultDisplay({ result }: ScanResultDisplayProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Scan Results</h4>

      <div className="flex gap-3 flex-wrap">
        <Card className="flex-1 min-w-[100px]">
          <CardContent className="p-3 text-center">
            <div className={cn('text-xl font-bold', result.verdict === 'BLOCK' ? 'text-red-500' : 'text-green-500')}>
              {result.verdict}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Verdict</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[100px]">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-500">
              {result.counts.critical}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Critical</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[100px]">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-orange-500">
              {result.counts.warning}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Warning</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[100px]">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-500">
              {result.counts.info}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Info</div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Scanned in {formatDuration(result.elapsed)} • {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
