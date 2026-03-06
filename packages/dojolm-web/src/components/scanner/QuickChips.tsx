/**
 * File: QuickChips.tsx
 * Purpose: Quick-load chips for common test payloads
 * Index:
 * - QuickChips component (line 11)
 */

'use client'

import { QUICK_PAYLOADS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface QuickChipsProps {
  onLoadPayload: (text: string, autoScan?: boolean) => void
  isScanning?: boolean
  className?: string
}

export function QuickChips({ onLoadPayload, isScanning = false, className }: QuickChipsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-medium text-muted-foreground">
        Quick Load Examples
      </h4>
      <div className="flex flex-wrap gap-2">
        {QUICK_PAYLOADS.map((payload) => (
          <button
            key={payload.label}
            onClick={() => onLoadPayload(payload.text, false)}
            disabled={isScanning}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:bg-[var(--overlay-active)] hover:text-foreground transition-colors duration-[var(--transition-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Load "${payload.label}" payload to scanner`}
          >
            {payload.label}
          </button>
        ))}
      </div>
    </div>
  )
}
