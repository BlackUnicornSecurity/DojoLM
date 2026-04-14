'use client'

/**
 * File: TransferMatrixPanel.tsx
 * Purpose: Cross-model vulnerability transfer matrix visualization
 * Story: H25.2 (initial) / 5.2.1 (mock data removed — awaiting backend)
 */

import { GlowCard } from '@/components/ui/GlowCard'
import { GitBranch, Clock } from 'lucide-react'

export function TransferMatrixPanel() {
  return (
    <GlowCard glow="subtle" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <GitBranch className="w-5 h-5 text-[var(--bu-electric)]" aria-hidden="true" />
        <h3 className="text-base font-semibold">Transfer Matrix</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Cross-model vulnerability transfer analysis
      </p>

      {/* Not-yet-available notice */}
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-muted-foreground"
      >
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Transfer matrix is not yet available. The backend route is under development.</span>
      </div>
    </GlowCard>
  )
}
