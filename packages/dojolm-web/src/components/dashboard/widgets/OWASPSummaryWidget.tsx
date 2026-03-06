'use client'

/**
 * File: OWASPSummaryWidget.tsx
 * Purpose: 10-row compact list of OWASP LLM Top 10 with coverage %
 * Story: TPI-NODA-1.5.9
 */

import { OWASP_LLM_COVERAGE_DATA } from '@/lib/constants'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'
import { WidgetCard } from '../WidgetCard'

export function OWASPSummaryWidget() {
  return (
    <WidgetCard title="OWASP LLM Top 10">
      <div className="space-y-1.5">
        {OWASP_LLM_COVERAGE_DATA.map(entry => (
          <div key={entry.category} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">{entry.category}</span>
              <span className="tabular-nums font-medium ml-2">{entry.post}%</span>
            </div>
            <EnhancedProgress
              value={entry.post}
              max={100}
              color={entry.post >= 80 ? 'success' : entry.post >= 50 ? 'warning' : 'danger'}
              size="sm"
            />
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
