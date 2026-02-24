/**
 * File: ScannerInput.tsx
 * Purpose: Main scanner input component with textarea and controls
 * Index:
 * - ScannerInput component (line 15)
 */

'use client'

import { useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickChips } from './QuickChips'
import { cn } from '@/lib/utils'
import { Loader2, Scan, Trash2 } from 'lucide-react'

interface ScannerInputProps {
  onScan: (text: string) => void
  onClear: () => void
  isScanning?: boolean
  className?: string
}

export function ScannerInput({
  onScan,
  onClear,
  isScanning = false,
  className
}: ScannerInputProps) {
  const [text, setText] = useState('')

  const handleScan = useCallback(() => {
    if (text.trim()) {
      onScan(text)
    }
  }, [text, onScan])

  const handleLoadPayload = useCallback((payloadText: string, autoScan = false) => {
    setText(payloadText)
    if (autoScan && payloadText.trim()) {
      onScan(payloadText)
    }
  }, [onScan])

  const handleClear = useCallback(() => {
    setText('')
    onClear()
  }, [onClear])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleScan()
    }
  }, [handleScan])

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Input Text</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to scan for prompt injection..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[200px] font-mono text-sm"
          disabled={isScanning}
        />

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleScan}
            disabled={!text.trim() || isScanning}
            className="gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4" />
                Scan
              </>
            )}
          </Button>
          <Button
            onClick={handleClear}
            variant="secondary"
            disabled={isScanning}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <QuickChips onLoadPayload={handleLoadPayload} />
      </CardContent>
    </Card>
  )
}
