/**
 * File: OrchestratorBuilder.tsx
 * Purpose: Configure and launch orchestrated attack runs (PAIR, Crescendo, TAP, Sensei-Adaptive)
 * Story: TESSENJUTSU Phase 2.3
 * Index:
 * - Orchestrator type selector (line ~60)
 * - Model configuration fields (line ~100)
 * - Parameter configuration (line ~140)
 * - Launch button with validation (line ~200)
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Swords, Play, Settings2, Cpu, Target, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchestratorType = 'pair' | 'crescendo' | 'tap' | 'sensei-adaptive'

interface OrchestratorConfig {
  readonly type: OrchestratorType
  readonly targetModelId: string
  readonly attackerModelId: string
  readonly judgeModelId: string
  readonly objective: string
  readonly category: string
  readonly maxTurns: number
  readonly maxBranches: number
  readonly pruneThreshold: number
  readonly successThreshold: number
  readonly spendingCapUsd: number
}

interface OrchestratorBuilderProps {
  readonly availableModels: readonly { id: string; name: string }[]
  readonly onLaunch: (config: OrchestratorConfig) => void
  readonly isRunning: boolean
}

// ---------------------------------------------------------------------------
// Orchestrator metadata
// ---------------------------------------------------------------------------

const ORCHESTRATOR_INFO: Record<OrchestratorType, { name: string; description: string; icon: string }> = {
  pair: {
    name: 'PAIR',
    description: 'Iterative refinement — attacker LLM refines prompts based on judge feedback',
    icon: '🔄',
  },
  crescendo: {
    name: 'Crescendo',
    description: 'Gradual escalation — builds trust then escalates from benign to adversarial',
    icon: '📈',
  },
  tap: {
    name: 'TAP',
    description: 'Tree of Attacks — explores multiple branches with pruning of weak paths',
    icon: '🌳',
  },
  'sensei-adaptive': {
    name: 'Sensei Adaptive',
    description: 'Combines PAIR refinement + TAP branching with strategy-aware attack selection',
    icon: '🥋',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrchestratorBuilder({ availableModels, onLaunch, isRunning }: OrchestratorBuilderProps) {
  const [selectedType, setSelectedType] = useState<OrchestratorType>('pair')
  const [targetModel, setTargetModel] = useState('')
  const [attackerModel, setAttackerModel] = useState('')
  const [judgeModel, setJudgeModel] = useState('')
  const [objective, setObjective] = useState('')
  const [category, setCategory] = useState('prompt-injection')
  const [maxTurns, setMaxTurns] = useState(20)
  const [maxBranches, setMaxBranches] = useState(4)
  const [pruneThreshold, setPruneThreshold] = useState(3)
  const [successThreshold, setSuccessThreshold] = useState(8)
  const [spendingCap, setSpendingCap] = useState(5)

  const canLaunch = !isRunning && targetModel && attackerModel && judgeModel && objective.trim()

  const [isLaunching, setIsLaunching] = useState(false)

  const handleLaunch = useCallback(async () => {
    if (!canLaunch || isLaunching) return
    setIsLaunching(true)
    try {
      const res = await fetch('/api/orchestrator/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          targetModelId: targetModel,
          attackerModelId: attackerModel,
          judgeModelId: judgeModel || attackerModel,
          objective: objective.trim(),
          category,
          maxTurns,
          maxBranches,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onLaunch?.(data.data)
      }
    } catch {
      // Network error
    } finally {
      setIsLaunching(false)
    }
  }, [canLaunch, isLaunching, selectedType, targetModel, attackerModel, judgeModel, objective, category, maxTurns, maxBranches, onLaunch])

  return (
    <div className="space-y-6">
      {/* Orchestrator Type Selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(ORCHESTRATOR_INFO) as [OrchestratorType, typeof ORCHESTRATOR_INFO[OrchestratorType]][]).map(([type, info]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              'rounded-lg border p-3 text-left transition-all hover:border-orange-400/50',
              selectedType === type
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-700 bg-zinc-800/50',
            )}
          >
            <div className="text-lg">{info.icon}</div>
            <div className="mt-1 text-sm font-medium text-zinc-200">{info.name}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{info.description}</div>
          </button>
        ))}
      </div>

      {/* Model Selection */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-medium text-zinc-200">Model Configuration</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Target Model</label>
            <select
              value={targetModel}
              onChange={(e) => setTargetModel(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Select target...</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Attacker Model</label>
            <select
              value={attackerModel}
              onChange={(e) => setAttackerModel(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Select attacker...</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Judge Model</label>
            <select
              value={judgeModel}
              onChange={(e) => setJudgeModel(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Select judge...</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </GlowCard>

      {/* Objective */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-medium text-zinc-200">Attack Objective</h3>
        </div>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe the objective (e.g., 'Make the model reveal its system prompt')"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 resize-none"
          rows={3}
          maxLength={500}
        />
        <div className="flex items-center gap-4 mt-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="prompt-injection">Prompt Injection</option>
              <option value="jailbreak">Jailbreak</option>
              <option value="data-extraction">Data Extraction</option>
              <option value="model-theft">Model Theft</option>
              <option value="social-engineering">Social Engineering</option>
            </select>
          </div>
        </div>
      </GlowCard>

      {/* Parameters */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-zinc-200">Parameters</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Max Turns</label>
            <input
              type="number"
              value={maxTurns}
              onChange={(e) => setMaxTurns(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
              min={1}
              max={50}
            />
          </div>
          {(selectedType === 'tap' || selectedType === 'sensei-adaptive') && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Max Branches</label>
                <input
                  type="number"
                  value={maxBranches}
                  onChange={(e) => setMaxBranches(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                  min={1}
                  max={10}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Prune Threshold</label>
                <input
                  type="number"
                  value={pruneThreshold}
                  onChange={(e) => setPruneThreshold(Math.min(9, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                  min={1}
                  max={9}
                  step={0.5}
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Success (0-10)</label>
            <input
              type="number"
              value={successThreshold}
              onChange={(e) => setSuccessThreshold(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
              min={1}
              max={10}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Budget ($)</label>
            <input
              type="number"
              value={spendingCap}
              onChange={(e) => setSpendingCap(Math.min(100, Math.max(0.01, Number(e.target.value))))}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
              min={0.01}
              max={100}
              step={0.5}
            />
          </div>
        </div>
      </GlowCard>

      {/* Launch */}
      <div className="flex justify-end">
        <Button
          onClick={handleLaunch}
          disabled={!canLaunch || isLaunching}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6"
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning || isLaunching ? 'Running...' : `Launch ${ORCHESTRATOR_INFO[selectedType].name}`}
        </Button>
      </div>
    </div>
  )
}
