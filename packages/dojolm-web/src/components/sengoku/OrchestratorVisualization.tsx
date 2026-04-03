/**
 * File: OrchestratorVisualization.tsx
 * Purpose: Real-time visualization of orchestrated attack execution
 * Story: TESSENJUTSU Phase 2.3
 * Index:
 * - Score timeline chart (line ~50)
 * - Branch tree view for TAP (line ~100)
 * - Turn detail panel (line ~160)
 * - Strategy distribution for Sensei-Adaptive (line ~200)
 */

'use client'

import { useMemo } from 'react'
import {
  GitBranch, TrendingUp, Shield, Swords, CheckCircle2, XCircle,
  Clock, AlertTriangle, DollarSign,
} from 'lucide-react'
import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types (mirror bu-tpi orchestrator types for display)
// ---------------------------------------------------------------------------

interface OrchestratorTurn {
  readonly index: number
  readonly attackPrompt: string
  readonly targetResponse: string
  readonly judgeScore: number
  readonly judgeReasoning: string
  readonly isSuccess: boolean
  readonly elapsed: number
  readonly tokensUsed: number
}

interface BranchState {
  readonly id: string
  readonly parentId: string | null
  readonly depth: number
  readonly turns: readonly OrchestratorTurn[]
  readonly currentScore: number
  readonly pruned: boolean
  readonly prunedReason: string | null
}

type OrchestratorStatus = 'running' | 'succeeded' | 'failed' | 'timeout' | 'budget-exceeded'

interface OrchestratorState {
  readonly configType: string
  readonly status: OrchestratorStatus
  readonly currentTurn: number
  readonly totalTurns: number
  readonly branches: readonly BranchState[]
  readonly bestScore: number
  readonly bestTurnIndex: number | null
  readonly totalTokensUsed: number
  readonly totalCostUsd: number
  readonly startedAt: string
}

interface OrchestratorVisualizationProps {
  readonly state: OrchestratorState | null
  readonly allTurns: readonly OrchestratorTurn[]
  readonly selectedTurnIndex: number | null
  readonly onSelectTurn: (index: number) => void
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: OrchestratorStatus }) {
  const config: Record<OrchestratorStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
    running: { label: 'Running', color: 'text-blue-400 bg-blue-400/10', Icon: Clock },
    succeeded: { label: 'Succeeded', color: 'text-green-400 bg-green-400/10', Icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'text-red-400 bg-red-400/10', Icon: XCircle },
    timeout: { label: 'Timeout', color: 'text-yellow-400 bg-yellow-400/10', Icon: AlertTriangle },
    'budget-exceeded': { label: 'Budget Exceeded', color: 'text-orange-400 bg-orange-400/10', Icon: DollarSign },
  }

  const { label, color, Icon } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Score Bar
// ---------------------------------------------------------------------------

function ScoreBar({ score, isBest }: { score: number; isBest: boolean }) {
  const width = Math.min(100, Math.max(0, score * 10))
  const color = score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-zinc-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${width}%` }} />
      </div>
      <span className={cn('text-xs tabular-nums', isBest ? 'text-green-400 font-bold' : 'text-zinc-400')}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrchestratorVisualization({
  state,
  allTurns,
  selectedTurnIndex,
  onSelectTurn,
}: OrchestratorVisualizationProps) {
  if (!state) {
    return (
      <GlowCard>
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <Swords className="h-8 w-8 mb-2" />
          <p className="text-sm">No orchestrator run active. Configure and launch above.</p>
        </div>
      </GlowCard>
    )
  }

  const selectedTurn = selectedTurnIndex !== null ? allTurns.find((t) => t.index === selectedTurnIndex) : null

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <GlowCard>
          <div className="text-xs text-zinc-500">Status</div>
          <div className="mt-1"><StatusBadge status={state.status} /></div>
        </GlowCard>
        <GlowCard>
          <div className="text-xs text-zinc-500">Best Score</div>
          <div className="mt-1 text-lg font-bold text-zinc-200">{state.bestScore.toFixed(1)}/10</div>
        </GlowCard>
        <GlowCard>
          <div className="text-xs text-zinc-500">Turns</div>
          <div className="mt-1 text-lg font-bold text-zinc-200">{state.currentTurn}/{state.totalTurns}</div>
        </GlowCard>
        <GlowCard>
          <div className="text-xs text-zinc-500">Tokens</div>
          <div className="mt-1 text-lg font-bold text-zinc-200">{state.totalTokensUsed.toLocaleString()}</div>
        </GlowCard>
        <GlowCard>
          <div className="text-xs text-zinc-500">Cost</div>
          <div className="mt-1 text-lg font-bold text-zinc-200">${state.totalCostUsd.toFixed(4)}</div>
        </GlowCard>
      </div>

      {/* Branch View (for TAP and Sensei-Adaptive) */}
      {state.branches.length > 1 && (
        <GlowCard>
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-medium text-zinc-200">Branches</h3>
          </div>
          <div className="space-y-2">
            {state.branches.map((branch) => (
              <div
                key={branch.id}
                className={cn(
                  'rounded-lg border p-2 text-xs',
                  branch.pruned ? 'border-zinc-700 bg-zinc-800/30 opacity-50' : 'border-zinc-600 bg-zinc-800/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">{branch.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Score: {branch.currentScore.toFixed(1)}</span>
                    {branch.pruned && <span className="text-red-400">Pruned</span>}
                    <span className="text-zinc-600">{branch.turns.length} turns</span>
                  </div>
                </div>
                {branch.prunedReason && (
                  <div className="mt-1 text-zinc-600 text-[10px]">{branch.prunedReason}</div>
                )}
              </div>
            ))}
          </div>
        </GlowCard>
      )}

      {/* Turn Timeline */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-zinc-200">Turn Timeline</h3>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {allTurns.map((turn) => (
            <button
              key={turn.index}
              onClick={() => onSelectTurn(turn.index)}
              className={cn(
                'w-full flex items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors',
                selectedTurnIndex === turn.index
                  ? 'bg-orange-500/20 border border-orange-500/30'
                  : 'hover:bg-zinc-800/50',
              )}
            >
              <span className="text-zinc-400">Turn {turn.index + 1}</span>
              <ScoreBar score={turn.judgeScore} isBest={turn.index === state.bestTurnIndex} />
              {turn.isSuccess && <CheckCircle2 className="h-3 w-3 text-green-400" />}
            </button>
          ))}
        </div>
      </GlowCard>

      {/* Selected Turn Detail */}
      {selectedTurn && (
        <GlowCard>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-medium text-zinc-200">Turn {selectedTurn.index + 1} Detail</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Attack Prompt</div>
              <div className="rounded-md bg-zinc-900 p-2 text-xs text-zinc-300 max-h-32 overflow-y-auto font-mono">
                {selectedTurn.attackPrompt}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Target Response</div>
              <div className="rounded-md bg-zinc-900 p-2 text-xs text-zinc-300 max-h-32 overflow-y-auto font-mono">
                {selectedTurn.targetResponse}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-500">Score: <span className="text-zinc-200">{selectedTurn.judgeScore}/10</span></span>
              <span className="text-zinc-500">Tokens: <span className="text-zinc-200">{selectedTurn.tokensUsed}</span></span>
              <span className="text-zinc-500">Time: <span className="text-zinc-200">{selectedTurn.elapsed.toFixed(0)}ms</span></span>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Judge Reasoning</div>
              <div className="text-xs text-zinc-400">{selectedTurn.judgeReasoning}</div>
            </div>
          </div>
        </GlowCard>
      )}
    </div>
  )
}
