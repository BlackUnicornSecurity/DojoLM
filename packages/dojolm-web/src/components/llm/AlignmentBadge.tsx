/**
 * File: AlignmentBadge.tsx
 * Purpose: Displays alignment method probability with confidence bar and hover tooltip
 * Epic: OBLITERATUS (OBL) — T1.1
 * Index:
 * - AlignmentBadge component (line 12)
 */

'use client'

import type { AlignmentImprint, AlignmentMethod } from '@/lib/types'

interface AlignmentBadgeProps {
  imprint: AlignmentImprint
}

const METHOD_LABELS: Record<AlignmentMethod, string> = {
  DPO: 'DPO',
  RLHF: 'RLHF',
  CAI: 'CAI',
  SFT: 'SFT',
  unknown: '?',
}

const METHOD_COLORS: Record<AlignmentMethod, string> = {
  DPO: 'bg-blue-500/20 text-blue-400',
  RLHF: 'bg-purple-500/20 text-purple-400',
  CAI: 'bg-green-500/20 text-green-400',
  SFT: 'bg-amber-500/20 text-amber-400',
  unknown: 'bg-zinc-500/20 text-zinc-400',
}

export function AlignmentBadge({ imprint }: AlignmentBadgeProps) {
  // Find top-probability method
  const entries = Object.entries(imprint.methodProbabilities) as [AlignmentMethod, number][]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const [topMethod, topProb] = sorted[0]

  return (
    <div className="group relative inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${METHOD_COLORS[topMethod]}`}>
        {METHOD_LABELS[topMethod]}
        <span className="opacity-60">{Math.round(topProb * 100)}%</span>
      </span>

      {/* Confidence bar */}
      <div className="h-1 w-8 rounded-full bg-zinc-700" title={`Confidence: ${Math.round(imprint.confidence * 100)}%`}>
        <div
          className="h-full rounded-full bg-current opacity-60"
          style={{ width: `${Math.round(imprint.confidence * 100)}%` }}
        />
      </div>

      {/* Hover tooltip with full distribution */}
      <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-48 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-lg group-hover:block">
        <p className="mb-1.5 font-medium text-zinc-300">Alignment Distribution</p>
        {sorted.map(([method, prob]) => (
          <div key={method} className="flex items-center justify-between py-0.5">
            <span className="text-zinc-400">{METHOD_LABELS[method]}</span>
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-16 rounded-full bg-zinc-700">
                <div
                  className={`h-full rounded-full ${METHOD_COLORS[method].split(' ')[0]}`}
                  style={{ width: `${Math.round(prob * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-zinc-500">{Math.round(prob * 100)}%</span>
            </div>
          </div>
        ))}
        <div className="mt-1.5 border-t border-zinc-700 pt-1 text-zinc-500">
          Confidence: {Math.round(imprint.confidence * 100)}%
        </div>
      </div>
    </div>
  )
}
