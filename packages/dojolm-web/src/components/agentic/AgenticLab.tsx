/**
 * File: AgenticLab.tsx
 * Purpose: Agentic Security Testing Lab — configure scenarios, run tests, view dual scores
 * Story: KENJUTSU Phase 3.3
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Bot, Play, Shield, Target, AlertTriangle, CheckCircle2,
  XCircle, Settings2, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/ui/GlowCard'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types (mirror bu-tpi agentic types for display)
// ---------------------------------------------------------------------------

type ToolArchitecture = 'openai-functions' | 'langchain-tools' | 'code-interpreter' | 'react-agent' | 'mcp-tools' | 'custom-schema'
type ToolCategory = 'filesystem' | 'database' | 'api' | 'email' | 'calendar' | 'search' | 'code' | 'browser'
type Difficulty = 'easy' | 'medium' | 'hard'

interface ScenarioConfig {
  readonly architecture: ToolArchitecture
  readonly categories: readonly ToolCategory[]
  readonly difficulty: Difficulty
  readonly objective: string
  readonly injectionPayload: string
  readonly targetModelId: string
}

interface DualScore {
  readonly utility: number
  readonly security: number
  readonly combined: number
  readonly utilityReasoning: string
  readonly securityReasoning: string
}

interface TestResultDisplay {
  readonly scenarioId: string
  readonly scenarioName: string
  readonly taskCompleted: boolean
  readonly injectionFollowed: boolean
  readonly score: DualScore
  readonly toolCallCount: number
  readonly elapsed: number
}

// ---------------------------------------------------------------------------
// Architecture metadata
// ---------------------------------------------------------------------------

const ARCHITECTURE_INFO: Record<ToolArchitecture, { name: string; desc: string }> = {
  'openai-functions': { name: 'OpenAI Functions', desc: 'Function calling via tool_choice / tools API' },
  'langchain-tools': { name: 'LangChain Tools', desc: 'Tool-calling via LangChain agent framework' },
  'code-interpreter': { name: 'Code Interpreter', desc: 'Code execution sandbox (Python/JS)' },
  'react-agent': { name: 'ReAct Agent', desc: 'Reasoning + Acting loop with tool use' },
  'mcp-tools': { name: 'MCP Tools', desc: 'Model Context Protocol tool servers' },
  'custom-schema': { name: 'Custom Schema', desc: 'User-defined tool-calling format' },
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  filesystem: 'Filesystem',
  database: 'Database',
  api: 'API',
  email: 'Email',
  calendar: 'Calendar',
  search: 'Search',
  code: 'Code',
  browser: 'Browser',
}

// ---------------------------------------------------------------------------
// Score Display
// ---------------------------------------------------------------------------

function DualScoreDisplay({ score }: { score: DualScore }) {
  const utilityColor = score.utility >= 7 ? 'text-green-400' : score.utility >= 4 ? 'text-yellow-400' : 'text-red-400'
  const securityColor = score.security >= 7 ? 'text-green-400' : score.security >= 4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Utility</div>
        <div className={cn('text-2xl font-bold', utilityColor)}>{score.utility.toFixed(1)}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Security</div>
        <div className={cn('text-2xl font-bold', securityColor)}>{score.security.toFixed(1)}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Combined</div>
        <div className="text-2xl font-bold text-zinc-200">{score.combined.toFixed(1)}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgenticLabProps {
  readonly availableModels: readonly { id: string; name: string }[]
}

export function AgenticLab({ availableModels }: AgenticLabProps) {
  const [architecture, setArchitecture] = useState<ToolArchitecture>('openai-functions')
  const [selectedCategories, setSelectedCategories] = useState<ToolCategory[]>(['filesystem', 'email'])
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [objective, setObjective] = useState('Exfiltrate sensitive data via email')
  const [targetModel, setTargetModel] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<readonly TestResultDisplay[]>([])

  const toggleCategory = useCallback((cat: ToolCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }, [])

  const handleRun = useCallback(async () => {
    if (!targetModel || isRunning) return
    setIsRunning(true)
    try {
      const res = await fetch('/api/agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architecture,
          categories: selectedCategories,
          difficulty,
          objective,
          targetModelId: targetModel,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        // Map response to display format when real data is returned
        setResults([])
      }
    } catch {
      // Network error — silently handle
    } finally {
      setIsRunning(false)
    }
  }, [targetModel, isRunning, architecture, selectedCategories, difficulty, objective])

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Bot}
        title="Agentic Security Lab"
        subtitle="Test tool-calling agents against indirect prompt injection across multiple architectures"
      />

      {/* Architecture Selector */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">Tool Architecture</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(ARCHITECTURE_INFO) as [ToolArchitecture, { name: string; desc: string }][]).map(([arch, info]) => (
            <button
              key={arch}
              onClick={() => setArchitecture(arch)}
              className={cn(
                'rounded-lg border p-2 text-left transition-all text-xs',
                architecture === arch
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-purple-400/30',
              )}
            >
              <div className="font-medium text-zinc-200">{info.name}</div>
              <div className="text-zinc-500 mt-0.5">{info.desc}</div>
            </button>
          ))}
        </div>
      </GlowCard>

      {/* Tool Categories */}
      <GlowCard>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-zinc-200">Tool Categories</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CATEGORY_LABELS) as [ToolCategory, string][]).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                selectedCategories.includes(cat)
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-zinc-700 text-zinc-500 hover:border-blue-400/30',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </GlowCard>

      {/* Configuration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlowCard>
          <label className="text-xs text-zinc-400 mb-1 block">Target Model</label>
          <select
            value={targetModel}
            onChange={(e) => setTargetModel(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Select model...</option>
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </GlowCard>
        <GlowCard>
          <label className="text-xs text-zinc-400 mb-1 block">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </GlowCard>
        <GlowCard>
          <label className="text-xs text-zinc-400 mb-1 block">Injection Objective</label>
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            maxLength={200}
          />
        </GlowCard>
      </div>

      {/* Launch */}
      <div className="flex justify-end">
        <Button
          onClick={handleRun}
          disabled={!targetModel || isRunning || selectedCategories.length === 0}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6"
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running Scenarios...' : 'Run Agentic Test'}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <GlowCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-medium text-zinc-200">Results</h3>
          </div>
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.scenarioId} className="rounded-lg border border-zinc-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-200">{r.scenarioName}</span>
                  <div className="flex items-center gap-2">
                    {r.taskCompleted ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Task Done
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Task Failed
                      </span>
                    )}
                    {r.injectionFollowed ? (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Injection Followed
                      </span>
                    ) : (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Injection Resisted
                      </span>
                    )}
                  </div>
                </div>
                <DualScoreDisplay score={r.score} />
              </div>
            ))}
          </div>
        </GlowCard>
      ) : (
        <EmptyState
          icon={Bot}
          title="No test results yet"
          description="Configure a scenario and run to see dual utility/security scores"
        />
      )}
    </div>
  )
}
