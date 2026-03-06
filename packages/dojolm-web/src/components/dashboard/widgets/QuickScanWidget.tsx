'use client'

/**
 * File: QuickScanWidget.tsx
 * Purpose: Text input with inline ALLOW/BLOCK verdict
 * Story: TPI-NODA-1.5.9
 */

import { useState, useCallback } from 'react'
import { useScanner } from '@/lib/ScannerContext'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { ScanLine, Loader2 } from 'lucide-react'

export function QuickScanWidget() {
  const { scanText, scanResult, isScanning } = useScanner()
  const [text, setText] = useState('')

  const handleScan = useCallback(() => {
    if (text.trim()) scanText(text)
  }, [text, scanText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleScan()
  }, [handleScan])

  return (
    <WidgetCard title="Quick Scan">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste text to scan..."
            className="flex-1 px-3 py-1.5 text-xs bg-muted/50 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--dojo-primary)]"
            disabled={isScanning}
          />
          <button
            onClick={handleScan}
            disabled={!text.trim() || isScanning}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg',
              'bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-primary-hover)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
              'disabled:opacity-50'
            )}
          >
            {isScanning ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" /> : <ScanLine className="w-3 h-3" aria-hidden="true" />}
          </button>
        </div>
        {scanResult && (
          <div className={cn(
            'flex items-center justify-between px-2 py-1 rounded text-xs font-medium',
            scanResult.verdict === 'BLOCK'
              ? 'bg-[var(--status-block-bg)] text-[var(--status-block)]'
              : 'bg-[var(--status-allow-bg)] text-[var(--status-allow)]'
          )}>
            <span>{scanResult.verdict}</span>
            {scanResult.findings.length > 0 && (
              <SeverityBadge
                severity={scanResult.counts.critical > 0 ? 'CRITICAL' : scanResult.counts.warning > 0 ? 'WARNING' : 'INFO'}
                showIcon={false}
              />
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
