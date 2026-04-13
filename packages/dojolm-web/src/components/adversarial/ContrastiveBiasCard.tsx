/**
 * File: ContrastiveBiasCard.tsx
 * Purpose: Tool card for contrastive prompt bias (Module 6)
 * Epic: OBLITERATUS (OBL) — T4.2
 * Index:
 * - ContrastiveBiasCard component (line 10)
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface ContrastiveBiasCardProps {
  onApply?: (strength: number) => void
}

export function ContrastiveBiasCard({ onApply }: ContrastiveBiasCardProps) {
  const [strength, setStrength] = useState(0.5)

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Contrastive Prompt Bias</h4>
        <Badge variant="outline" className="text-[10px]">Behavioral Approximation</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Nudges model toward compliance using prompt-level bias derived from contrastive pair analysis.
        Works with any provider (prompt-level, not activation-level).
      </p>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="bias-strength" className="text-xs text-zinc-400">Strength</label>
          <span className="text-xs tabular-nums text-zinc-500">{Math.round(strength * 100)}%</span>
        </div>
        <input
          id="bias-strength"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={strength}
          onChange={(e) => setStrength(parseFloat(e.target.value))}
          className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-[var(--dojo-primary)]"
        />
      </div>

      {onApply && (
        <button
          onClick={() => onApply(strength)}
          className="w-full px-3 py-1.5 text-xs rounded bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)] hover:bg-[var(--dojo-primary)]/20 transition-colors"
        >
          Apply Bias
        </button>
      )}
    </div>
  )
}
