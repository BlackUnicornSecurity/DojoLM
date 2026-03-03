/**
 * File: SAGEDashboard.tsx
 * Purpose: SAGE (Synthetic Attack Generator Engine) evolution dashboard
 * Story: S75
 * Index:
 * - EvolutionStatus type (line 18)
 * - MutationOperator interface (line 20)
 * - SeedCategory interface (line 27)
 * - MOCK_MUTATION_OPERATORS (line 33)
 * - MOCK_SEED_CATEGORIES (line 67)
 * - MOCK_FITNESS_HISTORY (line 83)
 * - SAGEDashboard component (line 100)
 * - FitnessChart component (line 256)
 * - MutationOperatorRow component (line 300)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dna,
  Play,
  Pause,
  RotateCcw,
  Shield,
  AlertTriangle,
  Beaker,
  TrendingUp,
  Archive,
  Lock,
  Gauge,
  ChevronRight,
} from 'lucide-react'

type EvolutionStatus = 'running' | 'stopped' | 'paused'

interface MutationOperator {
  id: string
  name: string
  description: string
  weight: number
  hitCount: number
  enabled: boolean
}

interface SeedCategory {
  name: string
  count: number
  lastUpdated: string
}

interface FitnessDataPoint {
  generation: number
  best: number
  average: number
  worst: number
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_MUTATION_OPERATORS: MutationOperator[] = [
  { id: 'op-swap-role', name: 'Role Swap', description: 'Swap system/user role markers', weight: 0.15, hitCount: 342, enabled: true },
  { id: 'op-encode-b64', name: 'Base64 Encode', description: 'Encode payload segments in Base64', weight: 0.12, hitCount: 289, enabled: true },
  { id: 'op-delimiter-break', name: 'Delimiter Break', description: 'Insert delimiter-breaking sequences', weight: 0.18, hitCount: 415, enabled: true },
  { id: 'op-unicode-sub', name: 'Unicode Substitute', description: 'Replace chars with Unicode homoglyphs', weight: 0.10, hitCount: 178, enabled: true },
  { id: 'op-context-inject', name: 'Context Inject', description: 'Inject false context references', weight: 0.14, hitCount: 301, enabled: true },
  { id: 'op-token-split', name: 'Token Split', description: 'Split tokens across BPE boundaries', weight: 0.08, hitCount: 145, enabled: true },
  { id: 'op-nested-instruct', name: 'Nested Instruction', description: 'Nest instructions in benign content', weight: 0.13, hitCount: 267, enabled: true },
  { id: 'op-semantic-shift', name: 'Semantic Shift', description: 'Gradually shift semantic meaning', weight: 0.10, hitCount: 198, enabled: false },
]

const MOCK_SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Prompt Injection', count: 342, lastUpdated: '2 hours ago' },
  { name: 'Jailbreak', count: 218, lastUpdated: '4 hours ago' },
  { name: 'Role Confusion', count: 156, lastUpdated: '1 day ago' },
  { name: 'Delimiter Attacks', count: 189, lastUpdated: '6 hours ago' },
  { name: 'Encoded Payloads', count: 134, lastUpdated: '12 hours ago' },
  { name: 'Social Engineering', count: 98, lastUpdated: '2 days ago' },
  { name: 'Multi-modal', count: 67, lastUpdated: '1 day ago' },
  { name: 'Agent Abuse', count: 43, lastUpdated: '3 days ago' },
]

const MOCK_FITNESS_HISTORY: FitnessDataPoint[] = [
  { generation: 1, best: 0.32, average: 0.18, worst: 0.05 },
  { generation: 10, best: 0.41, average: 0.25, worst: 0.08 },
  { generation: 20, best: 0.48, average: 0.31, worst: 0.12 },
  { generation: 30, best: 0.55, average: 0.38, worst: 0.15 },
  { generation: 40, best: 0.61, average: 0.42, worst: 0.18 },
  { generation: 50, best: 0.67, average: 0.47, worst: 0.21 },
  { generation: 60, best: 0.72, average: 0.51, worst: 0.24 },
  { generation: 70, best: 0.76, average: 0.54, worst: 0.26 },
  { generation: 80, best: 0.80, average: 0.58, worst: 0.29 },
  { generation: 90, best: 0.83, average: 0.61, worst: 0.31 },
  { generation: 100, best: 0.86, average: 0.64, worst: 0.33 },
  { generation: 110, best: 0.88, average: 0.66, worst: 0.35 },
  { generation: 120, best: 0.90, average: 0.68, worst: 0.36 },
  { generation: 130, best: 0.92, average: 0.70, worst: 0.37 },
  { generation: 142, best: 0.94, average: 0.72, worst: 0.38 },
]

const TOTAL_SEEDS = MOCK_SEED_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SAGE Dashboard - Evolution engine monitoring and control
 */
export function SAGEDashboard() {
  const [status, setStatus] = useState<EvolutionStatus>('running')
  const [generation] = useState(142)
  const [bestFitness] = useState(0.94)
  const [quarantineCount] = useState(23)
  const [safetyThreshold] = useState(0.85)

  const toggleStatus = () => {
    setStatus((prev) => {
      if (prev === 'running') return 'paused'
      return 'running'
    })
  }

  const stopEvolution = () => {
    setStatus('stopped')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dna className="w-6 h-6 text-[var(--dojo-primary)]" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">SAGE Evolution Engine</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Synthetic attack generation with genetic evolution
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={status === 'running' ? 'success' : status === 'paused' ? 'warning' : 'error'}
            dot
          >
            {status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : 'Stopped'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            aria-label={status === 'running' ? 'Pause evolution' : 'Resume evolution'}
            className="gap-2"
          >
            {status === 'running' ? (
              <><Pause className="w-4 h-4" aria-hidden="true" /> Pause</>
            ) : (
              <><Play className="w-4 h-4" aria-hidden="true" /> Resume</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={stopEvolution}
            aria-label="Stop evolution"
            className="gap-2"
            disabled={status === 'stopped'}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[var(--muted-foreground)]" aria-hidden="true" />
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Generation</p>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{generation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-[var(--success)]" aria-hidden="true" />
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Best Fitness</p>
            </div>
            <p className="text-2xl font-bold text-[var(--success)]">{bestFitness.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Beaker className="w-4 h-4 text-[var(--muted-foreground)]" aria-hidden="true" />
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Total Seeds</p>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{TOTAL_SEEDS.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Quarantined</p>
            </div>
            <p className="text-2xl font-bold text-[var(--warning)]">{quarantineCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fitness Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fitness Over Generations</CardTitle>
            <CardDescription>Best, average, and worst fitness scores per generation</CardDescription>
          </CardHeader>
          <CardContent>
            <FitnessChart data={MOCK_FITNESS_HISTORY} />
          </CardContent>
        </Card>

        {/* Content Safety & Quarantine */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              <CardTitle className="text-base">Content Safety</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-[var(--muted-foreground)]">Safety Threshold</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">{safetyThreshold.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-[var(--bg-quaternary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full motion-safe:transition-all motion-safe:duration-500"
                  style={{ width: `${safetyThreshold * 100}%` }}
                  role="progressbar"
                  aria-valuenow={safetyThreshold * 100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Safety threshold at ${(safetyThreshold * 100).toFixed(0)}%`}
                />
              </div>
            </div>

            <div className="border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--foreground)]">Quarantine Queue</span>
              </div>
              <p className="text-3xl font-bold text-[var(--warning)]">{quarantineCount}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Payloads exceeding safety threshold awaiting review
              </p>
            </div>

            <div className="border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="w-4 h-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--foreground)]">Reviewed Today</span>
              </div>
              <p className="text-xl font-bold text-[var(--foreground)]">8</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">5 approved, 3 rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Seed Library */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Seed Library</CardTitle>
              <Badge variant="outline">{TOTAL_SEEDS.toLocaleString()} seeds</Badge>
            </div>
            <CardDescription>Attack seed corpus by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" aria-label="Seed library categories">
              {MOCK_SEED_CATEGORIES.map((cat) => (
                <li key={cat.name}>
                  <button
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-md text-left',
                      'hover:bg-[var(--bg-quaternary)]',
                      'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'min-h-[44px]'
                    )}
                    aria-label={`${cat.name}: ${cat.count} seeds, updated ${cat.lastUpdated}`}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{cat.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Updated {cat.lastUpdated}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Mutation Operators */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mutation Operators</CardTitle>
              <Badge variant="outline">{MOCK_MUTATION_OPERATORS.filter(o => o.enabled).length} active</Badge>
            </div>
            <CardDescription>Operator weights and hit counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1" role="list" aria-label="Mutation operators">
              {MOCK_MUTATION_OPERATORS.map((op) => (
                <MutationOperatorRow key={op.id} operator={op} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Placeholder fitness chart using styled divs with bar visualization
 */
function FitnessChart({ data }: { data: FitnessDataPoint[] }) {
  const maxGen = data[data.length - 1]?.generation ?? 1

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--success)]" aria-hidden="true" />
          <span className="text-[var(--muted-foreground)]">Best</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--dojo-primary)]" aria-hidden="true" />
          <span className="text-[var(--muted-foreground)]">Average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--bg-quaternary)]" aria-hidden="true" />
          <span className="text-[var(--muted-foreground)]">Worst</span>
        </div>
      </div>

      {/* Chart area */}
      <div
        className="relative h-48 border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-secondary)]"
        role="img"
        aria-label={`Fitness chart showing evolution from generation 1 to ${maxGen}. Best fitness improved from ${data[0]?.best.toFixed(2)} to ${data[data.length - 1]?.best.toFixed(2)}.`}
      >
        <div className="flex items-end justify-between h-full gap-1">
          {data.map((point) => (
            <div key={point.generation} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
              {/* Best bar */}
              <div
                className="w-full rounded-t-sm bg-[var(--success)] opacity-80 motion-safe:transition-all motion-safe:duration-300"
                style={{ height: `${point.best * 100}%`, minHeight: '2px' }}
              />
              {/* Average bar overlay */}
              <div
                className="w-full rounded-t-sm bg-[var(--dojo-primary)] opacity-60 -mt-1"
                style={{ height: `${point.average * 100}%`, minHeight: '2px' }}
              />
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-3 right-3 flex justify-between text-[10px] text-[var(--muted-foreground)] -mb-5">
          <span>Gen 1</span>
          <span>Gen {Math.round(maxGen / 2)}</span>
          <span>Gen {maxGen}</span>
        </div>
      </div>

      {/* Spacer for axis labels */}
      <div className="h-2" />
    </div>
  )
}

/**
 * Single mutation operator row with weight bar and hit count
 */
function MutationOperatorRow({ operator }: { operator: MutationOperator }) {
  return (
    <div
      role="listitem"
      className={cn(
        'flex items-center gap-3 p-2 rounded-md',
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        operator.enabled
          ? 'hover:bg-[var(--bg-quaternary)]'
          : 'opacity-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">{operator.name}</p>
          {!operator.enabled && <Badge variant="pending">Disabled</Badge>}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{operator.description}</p>
      </div>

      {/* Weight bar */}
      <div className="w-20 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] mb-0.5">
          <span>Weight</span>
          <span className="font-mono">{operator.weight.toFixed(2)}</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--bg-quaternary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--dojo-primary)] rounded-full"
            style={{ width: `${(operator.weight / Math.max(...MOCK_MUTATION_OPERATORS.map(o => o.weight))) * 100}%` }}
          />
        </div>
      </div>

      {/* Hit count */}
      <div className="text-right flex-shrink-0 w-16">
        <p className="text-sm font-mono font-semibold text-[var(--foreground)]">{operator.hitCount}</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">hits</p>
      </div>
    </div>
  )
}
