'use client'

/**
 * File: QuickScanWidget.tsx
 * Purpose: Text input with inline ALLOW/BLOCK verdict
 * Story: TPI-NODA-1.5.9
 * BUG-007 fix: uses local result state to avoid showing stale results
 * from the global scanner context. Tracks scan identity via scanResult
 * reference comparison to avoid stale-on-error scenarios.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useScanner } from '@/lib/ScannerContext'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { ScanLine, Loader2, X } from 'lucide-react'

export function QuickScanWidget() {
  const { scanText, scanResult, isScanning } = useScanner()
  const [text, setText] = useState('')
  const [localResult, setLocalResult] = useState<typeof scanResult>(null)
  const didScanRef = useRef(false)
  const lastSeenResultRef = useRef<typeof scanResult>(null)

  const handleScan = useCallback(() => {
    if (text.trim() && !isScanning) {
      didScanRef.current = true
      scanText(text)
    }
  }, [text, scanText, isScanning])

  // Only capture results from scans this widget initiated.
  // Compare scanResult identity to avoid re-displaying stale results
  // when a scan fails and scanResult remains from a prior successful scan.
  useEffect(() => {
    if (!isScanning && didScanRef.current) {
      if (scanResult && scanResult !== lastSeenResultRef.current) {
        setLocalResult(scanResult)
        lastSeenResultRef.current = scanResult
      }
      didScanRef.current = false
    }
  }, [isScanning, scanResult])

  const handleClear = useCallback(() => {
    setText('')
    setLocalResult(null)
    didScanRef.current = false
  }, [])

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
            onChange={(e) => {
              setText(e.target.value)
              if (!e.target.value.trim()) setLocalResult(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste text to scan..."
            className="flex-1 px-3 py-1.5 text-xs bg-muted/50 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--bu-electric)]"
            disabled={isScanning}
          />
          <button
            onClick={handleScan}
            disabled={!text.trim() || isScanning}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg',
              'bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-primary-hover)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
              'disabled:opacity-50'
            )}
            aria-label={isScanning ? 'Scanning...' : 'Run scan'}
          >
            {isScanning ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" /> : <ScanLine className="w-3 h-3" aria-hidden="true" />}
          </button>
        </div>
        {localResult && (
          <div className={cn(
            'flex items-center justify-between px-2 py-1 rounded text-xs font-medium',
            localResult.verdict === 'BLOCK'
              ? 'bg-[var(--status-block-bg)] text-[var(--status-block)]'
              : 'bg-[var(--status-allow-bg)] text-[var(--status-allow)]'
          )}>
            <span>{localResult.verdict}</span>
            <div className="flex items-center gap-1">
              {localResult.findings.length > 0 && (
                <SeverityBadge
                  severity={localResult.counts.critical > 0 ? 'CRITICAL' : localResult.counts.warning > 0 ? 'WARNING' : 'INFO'}
                  showIcon={false}
                />
              )}
              <button
                onClick={handleClear}
                className="ml-1 p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss scan result"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
