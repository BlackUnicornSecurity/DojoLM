/**
 * File: QuickChips.tsx
 * Purpose: Quick-load chips for common test payloads with cycling selection
 * Index:
 * - QuickChips component (line 12)
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { QUICK_PAYLOADS, QUICK_PAYLOAD_DISPLAY_COUNT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface QuickChipsProps {
  onLoadPayload: (text: string, autoScan?: boolean) => void
  isScanning?: boolean
  className?: string
}

export function QuickChips({ onLoadPayload, isScanning = false, className }: QuickChipsProps) {
  const [cycleIndex, setCycleIndex] = useState(0)

  const visiblePayloads = useMemo(() => {
    const start = (cycleIndex * QUICK_PAYLOAD_DISPLAY_COUNT) % QUICK_PAYLOADS.length
    const result = []
    for (let i = 0; i < QUICK_PAYLOAD_DISPLAY_COUNT; i++) {
      result.push(QUICK_PAYLOADS[(start + i) % QUICK_PAYLOADS.length])
    }
    return result
  }, [cycleIndex])

  const canCycle = QUICK_PAYLOADS.length > QUICK_PAYLOAD_DISPLAY_COUNT

  const handleCycle = useCallback(() => {
    setCycleIndex(prev => prev + 1)
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Quick Load Examples
        </h4>
        {canCycle && (
          <button
            onClick={handleCycle}
            disabled={isScanning}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 min-h-[44px]"
            aria-label="Show more examples"
          >
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
            More
          </button>
        )}
      </div>
      {/* VIS-19: bumped idle-state text from muted-foreground (#7E8A9A) to
          foreground-adjacent slate-200 to meet WCAG AA 4.5:1 on the muted
          pill background. Hover still darkens via overlay-active. */}
      <div className="flex flex-wrap gap-2">
        {visiblePayloads.map((payload) => (
          <button
            key={payload.label}
            onClick={() => onLoadPayload(payload.text, false)}
            disabled={isScanning}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted text-slate-200 hover:bg-[var(--overlay-active)] hover:text-foreground transition-colors duration-[var(--transition-fast)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center"
            title={`Load "${payload.label}" payload to scanner`}
          >
            {payload.label}
          </button>
        ))}
      </div>
    </div>
  )
}
