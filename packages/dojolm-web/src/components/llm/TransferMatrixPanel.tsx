'use client'

/**
 * File: TransferMatrixPanel.tsx
 * Purpose: Cross-model vulnerability transfer matrix visualization
 * Story: H25.2
 * Index:
 * - MODELS constant (line 17)
 * - MOCK_MATRIX data (line 19)
 * - heatColor helper (line 36)
 * - LEGEND_STOPS constant (line 46)
 * - TransferMatrixPanel component (line 53)
 */

import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'
import { GitBranch } from 'lucide-react'

// MOCK DATA — replace with live data when backend is available

const MODELS = ['GPT-4', 'Claude 3.5', 'Gemini 1.5', 'Llama 3', 'Mistral'] as const

/** Transfer rates (%) — row = source, column = target, diagonal = N/A */
const MOCK_MATRIX: number[][] = [
  /* GPT-4      */ [-1, 72, 65, 48, 55],
  /* Claude 3.5 */ [68, -1, 60, 42, 50],
  /* Gemini 1.5 */ [70, 64, -1, 52, 58],
  /* Llama 3    */ [82, 78, 75, -1, 70],
  /* Mistral    */ [76, 70, 68, 55, -1],
]

/**
 * Return Tailwind-compatible inline style for heat coloring.
 * -1 = diagonal (self), rendered as dash.
 */
function heatColor(value: number): { backgroundColor: string; color: string } {
  if (value < 0) return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--foreground)' }
  if (value >= 80) return { backgroundColor: 'rgba(var(--status-block-rgb, 220,38,38), 0.25)', color: 'var(--status-block)' }
  if (value >= 60) return { backgroundColor: 'rgba(var(--severity-medium-rgb, 234,179,8), 0.2)', color: 'var(--severity-medium)' }
  if (value >= 40) return { backgroundColor: 'rgba(var(--status-allow-rgb, 34,197,94), 0.15)', color: 'var(--status-allow)' }
  return { backgroundColor: 'rgba(var(--status-allow-rgb, 34,197,94), 0.08)', color: 'var(--status-allow)' }
}

const LEGEND_STOPS = [
  { label: '0-39%', bg: 'bg-green-500/10', text: 'text-[var(--status-allow)]' },
  { label: '40-59%', bg: 'bg-green-500/20', text: 'text-[var(--status-allow)]' },
  { label: '60-79%', bg: 'bg-yellow-500/20', text: 'text-[var(--severity-medium)]' },
  { label: '80-100%', bg: 'bg-red-500/25', text: 'text-[var(--status-block)]' },
]

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

      {/* Matrix Grid */}
      <div className="overflow-x-auto -mx-2">
        <table className="border-collapse mx-auto" aria-label="Vulnerability transfer matrix">
          <thead>
            <tr>
              <th className="p-2 text-xs text-muted-foreground text-left min-w-[90px]">
                Source \ Target
              </th>
              {MODELS.map((model) => (
                <th key={model} className="p-2 text-xs font-medium text-center whitespace-nowrap">
                  {model}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODELS.map((sourceModel, rowIdx) => (
              <tr key={sourceModel}>
                <td className="p-2 text-xs font-medium whitespace-nowrap">{sourceModel}</td>
                {MOCK_MATRIX[rowIdx].map((value, colIdx) => {
                  const style = heatColor(value)
                  return (
                    <td key={colIdx} className="p-1 text-center">
                      <div
                        className="w-14 h-10 flex items-center justify-center rounded text-xs font-mono font-semibold"
                        style={style}
                        aria-label={
                          value < 0
                            ? `${sourceModel} to ${MODELS[colIdx]}: N/A (same model)`
                            : `${sourceModel} to ${MODELS[colIdx]}: ${value}% transfer rate`
                        }
                      >
                        {value < 0 ? '\u2014' : `${value}%`}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground">Transfer rate:</span>
        {LEGEND_STOPS.map((stop) => (
          <div key={stop.label} className="flex items-center gap-1.5">
            <div className={cn('w-4 h-3 rounded-sm', stop.bg)} />
            <span className={cn('text-xs', stop.text)}>{stop.label}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  )
}
