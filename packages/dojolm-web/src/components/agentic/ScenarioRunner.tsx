/**
 * File: ScenarioRunner.tsx
 * Purpose: Execute agentic test scenarios and display live progress + results
 * Story: KENJUTSU Phase 3.3
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Play, Pause, RotateCcw, CheckCircle2, XCircle,
  AlertTriangle, Shield, Clock, Zap, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

interface ScenarioStep {
  readonly toolName: string
  readonly status: 'pending' | 'running' | 'passed' | 'failed'
  readonly durationMs: number | null
  readonly injectionDetected: boolean
}

interface ScenarioRunResult {
  readonly scenarioId: string
  readonly scenarioName: string
  readonly steps: readonly ScenarioStep[]
  readonly utilityScore: number
  readonly securityScore: number
  readonly combinedScore: number
  readonly taskCompleted: boolean
  readonly injectionFollowed: boolean
  readonly totalDurationMs: number
}

interface ScenarioRunnerProps {
  readonly scenarioId: string
  readonly scenarioName: string
  readonly architecture: string
  readonly difficulty: string
  readonly targetModelId: string
  readonly onComplete?: (result: ScenarioRunResult) => void
}

// ---------------------------------------------------------------------------
// Step Display
// ---------------------------------------------------------------------------

function StepRow({ step, index }: { step: ScenarioStep; index: number }) {
  const statusIcon = {
    pending: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
    running: <Activity className="h-3.5 w-3.5 text-blue-400 animate-pulse" />,
    passed: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
    failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  }[step.status]

  return (
    <div className={cn(
      'flex items-center justify-between rounded-md px-3 py-2 text-xs',
      step.status === 'running' ? 'bg-blue-500/10 border border-blue-500/30' :
      step.status === 'failed' ? 'bg-red-500/5 border border-red-500/20' :
      'bg-zinc-800/50 border border-zinc-700/50',
    )}>
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-zinc-400">Step {index + 1}:</span>
        <span className="text-zinc-200 font-mono">{step.toolName}</span>
      </div>
      <div className="flex items-center gap-3">
        {step.injectionDetected && (
          <span className="text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Injection
          </span>
        )}
        {step.durationMs !== null && (
          <span className="text-zinc-500">{step.durationMs}ms</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score Bar
// ---------------------------------------------------------------------------

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={cn('font-bold', color)}>{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color.replace('text-', 'bg-'))}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioRunner({
  scenarioId,
  scenarioName,
  architecture,
  difficulty,
  targetModelId,
  onComplete,
}: ScenarioRunnerProps) {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [steps, setSteps] = useState<ScenarioStep[]>([])
  const [result, setResult] = useState<ScenarioRunResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef(false)

  const handleStart = useCallback(async () => {
    if (status === 'running') return
    setStatus('running')
    setResult(null)
    setElapsed(0)
    abortRef.current = false

    // Initialize steps from scenario
    const initialSteps: ScenarioStep[] = [
      { toolName: 'read_file', status: 'pending', durationMs: null, injectionDetected: false },
      { toolName: 'search_web', status: 'pending', durationMs: null, injectionDetected: false },
      { toolName: 'send_email', status: 'pending', durationMs: null, injectionDetected: false },
    ]
    setSteps(initialSteps)

    // In production, this calls /api/agentic with SSE streaming
    // For now, simulate step progression
    const completedSteps: ScenarioStep[] = []
    for (let i = 0; i < initialSteps.length; i++) {
      if (abortRef.current) break

      setSteps((prev) => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'running' } : s,
      ))

      // Simulate step execution
      await new Promise((r) => setTimeout(r, 300))

      const completed: ScenarioStep = {
        ...initialSteps[i],
        status: 'passed',
        durationMs: 150 + Math.floor(Math.random() * 200),
        injectionDetected: i === 2 && difficulty === 'easy',
      }
      completedSteps.push(completed)

      setSteps((prev) => prev.map((s, idx) =>
        idx === i ? completed : s,
      ))
      setElapsed((prev) => prev + (completed.durationMs ?? 0))
    }

    if (!abortRef.current) {
      const runResult: ScenarioRunResult = {
        scenarioId,
        scenarioName,
        steps: completedSteps,
        utilityScore: 8.5,
        securityScore: difficulty === 'easy' ? 6.0 : 9.0,
        combinedScore: difficulty === 'easy' ? 7.25 : 8.75,
        taskCompleted: true,
        injectionFollowed: difficulty === 'easy',
        totalDurationMs: completedSteps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0),
      }
      setResult(runResult)
      setStatus('completed')
      onComplete?.(runResult)
    }
  }, [status, scenarioId, scenarioName, difficulty, onComplete])

  const handleStop = useCallback(() => {
    abortRef.current = true
    setStatus('paused')
  }, [])

  const handleReset = useCallback(() => {
    setStatus('idle')
    setSteps([])
    setResult(null)
    setElapsed(0)
    abortRef.current = false
  }, [])

  return (
    <GlowCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-zinc-200">{scenarioName}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <span className="font-mono">{architecture}</span>
            <span>·</span>
            <span className={cn(
              difficulty === 'hard' ? 'text-red-400' :
              difficulty === 'medium' ? 'text-yellow-400' : 'text-green-400',
            )}>{difficulty}</span>
            <span>·</span>
            <span>{targetModelId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <Button size="sm" onClick={handleStart} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Play className="h-3.5 w-3.5 mr-1" /> Run
            </Button>
          )}
          {status === 'running' && (
            <Button size="sm" variant="outline" onClick={handleStop}>
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          )}
          {(status === 'completed' || status === 'paused' || status === 'error') && (
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {steps.map((step, i) => (
            <StepRow key={`${step.toolName}-${i}`} step={step} index={i} />
          ))}
        </div>
      )}

      {/* Elapsed */}
      {status !== 'idle' && (
        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-4">
          <Zap className="h-3 w-3" />
          <span>{elapsed}ms elapsed</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3 pt-3 border-t border-zinc-700">
          <div className="flex items-center gap-3">
            {result.taskCompleted ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Task Completed
              </span>
            ) : (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Task Failed
              </span>
            )}
            {result.injectionFollowed ? (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Injection Followed
              </span>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Injection Resisted
              </span>
            )}
          </div>
          <div className="space-y-2">
            <ScoreBar
              label="Utility"
              score={result.utilityScore}
              color={result.utilityScore >= 7 ? 'text-green-400' : result.utilityScore >= 4 ? 'text-yellow-400' : 'text-red-400'}
            />
            <ScoreBar
              label="Security"
              score={result.securityScore}
              color={result.securityScore >= 7 ? 'text-green-400' : result.securityScore >= 4 ? 'text-yellow-400' : 'text-red-400'}
            />
            <ScoreBar
              label="Combined"
              score={result.combinedScore}
              color="text-zinc-200"
            />
          </div>
        </div>
      )}
    </GlowCard>
  )
}
