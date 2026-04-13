/**
 * File: TransferMatrix.tsx
 * Purpose: Heatmap visualization of cross-model vulnerability transfer scores
 * Epic: OBLITERATUS (OBL) — T1.2
 * Index:
 * - TransferMatrix component (line 12)
 */

'use client'

import type { TransferScore } from '@/lib/types'

interface TransferMatrixProps {
  scores: TransferScore[]
  modelNames: Record<string, string>
}

function getColorClass(correlation: number): string {
  if (correlation < 0.3) return 'bg-green-500/30 text-green-300'
  if (correlation < 0.6) return 'bg-yellow-500/30 text-yellow-300'
  return 'bg-red-500/30 text-red-300'
}

export function TransferMatrix({ scores, modelNames }: TransferMatrixProps) {
  if (scores.length === 0) return null

  // Build unique model list
  const modelIds = new Set<string>()
  for (const s of scores) {
    modelIds.add(s.sourceModelId)
    modelIds.add(s.targetModelId)
  }
  const models = [...modelIds]

  // Build lookup map
  const scoreMap = new Map<string, TransferScore>()
  for (const s of scores) {
    scoreMap.set(`${s.sourceModelId}:${s.targetModelId}`, s)
    scoreMap.set(`${s.targetModelId}:${s.sourceModelId}`, s)
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-300">Vulnerability Transfer Matrix</h4>
      <p className="text-xs text-muted-foreground">
        Jaccard similarity of failed test categories between model pairs
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-zinc-500" />
              {models.map(id => (
                <th key={id} className="p-1 text-center text-zinc-400 max-w-[80px] truncate" title={modelNames[id] ?? id}>
                  {(modelNames[id] ?? id).slice(0, 10)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map(rowId => (
              <tr key={rowId}>
                <td className="p-1 text-zinc-400 max-w-[80px] truncate" title={modelNames[rowId] ?? rowId}>
                  {(modelNames[rowId] ?? rowId).slice(0, 10)}
                </td>
                {models.map(colId => {
                  if (rowId === colId) {
                    return <td key={colId} className="p-1 text-center text-zinc-600">-</td>
                  }
                  const score = scoreMap.get(`${rowId}:${colId}`)
                  const val = score?.correlation ?? 0
                  return (
                    <td
                      key={colId}
                      className={`p-1 text-center rounded ${getColorClass(val)}`}
                      title={score ? `Shared: ${score.sharedVulnerabilities.join(', ') || 'none'}` : ''}
                    >
                      {Math.round(val * 100)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-green-500/30" /> Low (&lt;30%)</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-yellow-500/30" /> Medium (30-60%)</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-red-500/30" /> High (&gt;60%)</span>
      </div>
    </div>
  )
}
