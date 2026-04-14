/**
 * File: JutsuTab.tsx
 * Purpose: Jutsu model-centric view as a tab inside LLM Dashboard
 * Story: DAITENGUYAMA M1.2
 * Index:
 * - JutsuTabProps (line 12)
 * - JutsuTab component (line 18)
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search, Filter, HelpCircle, Settings, ScrollText } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'
import { BeltLegend } from '@/components/ui/BeltLegend'
import { JutsuModelCard } from './JutsuModelCard'
import { ModelDetailView } from './ModelDetailView'
import { aggregateByModel, type AggregatedModel, type TestExecution } from './JutsuAggregation'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { useBehavioralAnalysis } from '@/lib/contexts'
import type { AlignmentMethod } from '@/lib/types'

/** Human-readable provider display names */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  llamacpp: 'llama.cpp',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistral: 'Mistral',
  meta: 'Meta',
  cohere: 'Cohere',
}

function getProviderDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider.toLowerCase()] ?? provider
}

/** Demo test execution data for when no real data exists */
const DEMO_EXECUTIONS: TestExecution[] = [
  { id: 'e1', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', score: 78, passRate: 78, totalTests: 50, passed: 39, failed: 11, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering'], timestamp: '2026-03-05T10:00:00Z', batchId: 'b1' },
  { id: 'e2', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', score: 82, passRate: 82, totalTests: 50, passed: 41, failed: 9, categoriesFailed: ['Prompt Injection', 'Jailbreak'], timestamp: '2026-03-04T10:00:00Z', batchId: 'b2' },
  { id: 'e3', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', score: 75, passRate: 75, totalTests: 50, passed: 37, failed: 13, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering', 'Encoding'], timestamp: '2026-03-03T10:00:00Z' },
  { id: 'e4', modelId: 'claude-3.5', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', score: 91, passRate: 91, totalTests: 50, passed: 45, failed: 5, categoriesFailed: ['Encoding', 'Boundary'], timestamp: '2026-03-05T11:00:00Z', batchId: 'b1' },
  { id: 'e5', modelId: 'claude-3.5', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', score: 88, passRate: 88, totalTests: 50, passed: 44, failed: 6, categoriesFailed: ['Encoding', 'Boundary', 'Jailbreak'], timestamp: '2026-03-04T11:00:00Z' },
  { id: 'e6', modelId: 'gemini-1.5', modelName: 'Gemini 1.5 Pro', provider: 'Google', score: 72, passRate: 72, totalTests: 50, passed: 36, failed: 14, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering', 'Boundary'], timestamp: '2026-03-05T12:00:00Z' },
  { id: 'e7', modelId: 'gemini-1.5', modelName: 'Gemini 1.5 Pro', provider: 'Google', score: 68, passRate: 68, totalTests: 50, passed: 34, failed: 16, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering', 'Boundary', 'Encoding'], timestamp: '2026-03-03T12:00:00Z' },
  { id: 'e8', modelId: 'mistral-large', modelName: 'Mistral Large', provider: 'Mistral', score: 65, passRate: 65, totalTests: 50, passed: 32, failed: 18, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering', 'Encoding', 'Multimodal'], timestamp: '2026-03-05T09:00:00Z' },
  { id: 'e9', modelId: 'llama-3', modelName: 'Llama 3 70B', provider: 'Meta', score: 58, passRate: 58, totalTests: 50, passed: 29, failed: 21, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering', 'Encoding', 'Boundary', 'Multimodal'], timestamp: '2026-03-05T08:00:00Z' },
  { id: 'e10', modelId: 'command-r', modelName: 'Command R+', provider: 'Cohere', score: 70, passRate: 70, totalTests: 50, passed: 35, failed: 15, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Boundary', 'Encoding'], timestamp: '2026-03-04T14:00:00Z' },
]

const GUIDE_SECTIONS: GuideSection[] = [
  { title: 'Model Grid', content: 'See all tested models at a glance with belt rankings, scores, and trend indicators. Click any card to drill into detailed analysis.', icon: ScrollText },
  { title: 'Model Details', content: 'Deep dive into any model with 5 sub-tabs: Overview (scores, trends, vulnerabilities), History (all executions), Reports (downloadable deliverables), Training (hardening sessions), and Metrics (performance data).', icon: Filter },
  { title: 'Aggregation', content: 'Results are automatically grouped by model name across batches and individual tests. Rolling averages, belt progression, and vulnerability trends are calculated in real-time.', icon: Search },
]

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: 'display',
    label: 'Display',
    defaultOpen: true,
    controls: [
      { type: 'dropdown', key: 'sortBy', label: 'Sort Models By', options: [
        { value: 'score', label: 'Latest Score' },
        { value: 'name', label: 'Model Name' },
        { value: 'provider', label: 'Provider' },
        { value: 'tests', label: 'Test Count' },
      ] },
      { type: 'toggle', key: 'showSparklines', label: 'Show Score Sparklines', description: 'Display trend sparklines on model cards' },
      { type: 'number', key: 'gridCols', label: 'Grid Columns', min: 1, max: 4, step: 1 },
    ],
  },
  {
    id: 'filters',
    label: 'Default Filters',
    controls: [
      { type: 'number', key: 'minScore', label: 'Minimum Score', min: 0, max: 100, step: 5 },
      { type: 'dropdown', key: 'defaultProvider', label: 'Default Provider Filter', options: [
        { value: 'all', label: 'All Providers' },
        { value: 'OpenAI', label: 'OpenAI' },
        { value: 'Anthropic', label: 'Anthropic' },
        { value: 'Google', label: 'Google' },
        { value: 'Mistral', label: 'Mistral' },
        { value: 'Meta', label: 'Meta' },
        { value: 'Cohere', label: 'Cohere' },
      ] },
      { type: 'dropdown', key: 'alignmentFilter', label: 'Alignment Method Filter', options: [
        { value: 'all', label: 'All Alignments' },
        { value: 'DPO', label: 'DPO' },
        { value: 'RLHF', label: 'RLHF' },
        { value: 'CAI', label: 'CAI' },
        { value: 'SFT', label: 'SFT' },
      ] },
    ],
  },
]

const DEFAULT_CONFIG: Record<string, unknown> = {
  sortBy: 'score',
  showSparklines: true,
  gridCols: 3,
  minScore: 0,
  defaultProvider: 'all',
}

interface JutsuTabProps {
  onNavigateToTests?: () => void
}

/**
 * JutsuTab — Model-centric testing command center, embedded as tab inside LLM Dashboard
 */
export function JutsuTab({ onNavigateToTests }: JutsuTabProps) {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [selectedModel, setSelectedModel] = useState<AggregatedModel | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, unknown>>(DEFAULT_CONFIG)
  const { getResult, runAlignment, runRobustness, runGeometry, runDepthProfile } = useBehavioralAnalysis()

  const handleRunTest = useCallback(() => {
    onNavigateToTests?.()
  }, [onNavigateToTests])

  /** Run all 4 OBL modules for a model. Concurrent — each settles independently. */
  const handleAnalyze = useCallback(async (modelId: string, modelName: string) => {
    await Promise.allSettled([
      runAlignment(modelId, modelName),
      runRobustness(modelId, modelName),
      runGeometry(modelId, modelName),
      runDepthProfile(modelId, modelName),
    ])
  }, [runAlignment, runRobustness, runGeometry, runDepthProfile])

  // Rehydrate config from localStorage on mount (with schema validation).
  //
  // Train 2 PR-4b.8 (2026-04-09): key renamed from 'noda-llm-jutsu-config' →
  // 'noda-jutsu-config' (llm NavId retired). Read new key first, fall back to
  // old key, then migrate (write new, delete old) in one pass.
  useEffect(() => {
    try {
      const NEW_KEY = 'noda-jutsu-config'
      const OLD_KEY = 'noda-llm-jutsu-config'
      let stored = localStorage.getItem(NEW_KEY)
      let fromLegacy = false
      if (!stored) {
        stored = localStorage.getItem(OLD_KEY)
        fromLegacy = !!stored
      }
      if (stored) {
        const parsed = JSON.parse(stored, (key, value) => {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined
          return value
        }) as Record<string, unknown>
        // Only pick known config keys with type validation
        const VALID_KEYS = new Set(Object.keys(DEFAULT_CONFIG))
        const safe: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (VALID_KEYS.has(k) && typeof v === typeof DEFAULT_CONFIG[k]) {
            safe[k] = typeof v === 'string' ? String(v).slice(0, 256) : v
          }
        }
        setConfigValues(prev => ({ ...prev, ...safe }))
        if (fromLegacy) {
          // One-shot migration: copy to new key, remove old
          try {
            localStorage.setItem(NEW_KEY, JSON.stringify(safe))
            localStorage.removeItem(OLD_KEY)
          } catch { /* QuotaExceededError — next load will retry */ }
        }
      }
    } catch { /* corrupted or unavailable */ }
  }, [])

  // Try to load real results from API
  useEffect(() => {
    let cancelled = false
    async function loadResults() {
      try {
        const res = await fetchWithAuth('/api/llm/results')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.results)) {
          const mapped: TestExecution[] = data.results.map((r: Record<string, unknown>, i: number) => ({
            id: String(r.id ?? `res-${i}`),
            modelId: String(r.modelId ?? ''),
            modelName: String(r.modelName ?? r.modelId ?? 'Unknown'),
            provider: String(r.provider ?? 'Unknown'),
            score: typeof r.resilienceScore === 'number' ? r.resilienceScore : 0,
            passRate: typeof r.passRate === 'number' ? r.passRate : 0,
            totalTests: typeof r.totalTests === 'number' ? r.totalTests : 0,
            passed: typeof r.passed === 'number' ? r.passed : 0,
            failed: typeof r.failed === 'number' ? r.failed : 0,
            categoriesFailed: Array.isArray(r.categoriesFailed) ? r.categoriesFailed.filter((c: unknown): c is string => typeof c === 'string') : [],
            timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date().toISOString(),
            batchId: typeof r.batchId === 'string' ? r.batchId : undefined,
          }))
          setExecutions(mapped)
        }
      } catch {
        // API unavailable — show empty state
      }
    }
    loadResults()
    return () => { cancelled = true }
  }, [])

  const aggregatedModels = useMemo(() => aggregateByModel(executions), [executions])

  const providers = useMemo(() => {
    const set = new Set(aggregatedModels.map(m => m.provider))
    return Array.from(set).sort()
  }, [aggregatedModels])

  const minScore = typeof configValues.minScore === 'number' ? configValues.minScore : 0
  const sortBy = typeof configValues.sortBy === 'string' ? configValues.sortBy : 'score'
  const alignmentFilter = typeof configValues.alignmentFilter === 'string' ? configValues.alignmentFilter : 'all'

  const filteredModels = useMemo(() => {
    const filtered = aggregatedModels.filter(m => {
      if (minScore > 0 && m.latestScore < minScore) return false
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false
      if (alignmentFilter !== 'all') {
        const alignment = getResult(m.modelId)?.alignment
        if (alignment) {
          const entries = Object.entries(alignment.methodProbabilities) as [AlignmentMethod, number][]
          const topMethod = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
          if (topMethod !== alignmentFilter) return false
        }
      }
      if (search) {
        const s = search.toLowerCase()
        return m.modelName.toLowerCase().includes(s) || m.provider.toLowerCase().includes(s)
      }
      return true
    })
    const sorted = [...filtered]
    switch (sortBy) {
      case 'name': sorted.sort((a, b) => a.modelName.localeCompare(b.modelName)); break
      case 'provider': sorted.sort((a, b) => a.provider.localeCompare(b.provider) || b.latestScore - a.latestScore); break
      case 'tests': sorted.sort((a, b) => b.totalExecutions - a.totalExecutions); break
      default: sorted.sort((a, b) => b.latestScore - a.latestScore); break
    }
    return sorted
  }, [aggregatedModels, providerFilter, search, minScore, sortBy, alignmentFilter, getResult])

  const handleConfigChange = useCallback((key: string, value: unknown) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Model-Centric Testing View</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setGuideOpen(true)}
            aria-label="Open Jutsu guide"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigOpen(true)}
            aria-label="Open Jutsu settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30 border border-[var(--border)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models, providers..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm min-h-[40px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
            aria-label="Search models"
          />
        </div>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm min-h-[40px]',
            'bg-[var(--bg-primary)] border border-[var(--border)]',
            'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
          )}
          aria-label="Filter by provider"
        >
          <option value="all">All Providers</option>
          {providers.map(p => (
            <option key={p} value={p}>{getProviderDisplayName(p)}</option>
          ))}
        </select>
      </div>

      {/* Belt Legend */}
      <BeltLegend compact className="bg-transparent border-0 p-0" />

      {/* Results Count */}
      <p className="text-xs text-muted-foreground">
        {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} found
      </p>

      {/* Model Grid */}
      {filteredModels.length > 0 ? (
        <div className={cn('grid gap-4', {
          'grid-cols-1': configValues.gridCols === 1,
          'md:grid-cols-2': configValues.gridCols === 2 || !configValues.gridCols,
          'md:grid-cols-2 lg:grid-cols-3': configValues.gridCols === 3,
          'md:grid-cols-2 lg:grid-cols-4': configValues.gridCols === 4,
        })}>
          {filteredModels.map(model => (
            <JutsuModelCard
              key={model.modelId}
              model={model}
              onView={setSelectedModel}
              onRetest={handleRunTest}
              onAnalyze={handleAnalyze}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="No models found"
          description="Run LLM tests from the Tests tab to populate the model grid"
        />
      )}

      {/* Model Detail */}
      {selectedModel && (
        <ModelDetailView
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onAnalyze={handleAnalyze}
        />
      )}

      {/* Guide Panel */}
      <ModuleGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Jutsu Guide"
        description="Jutsu is your model-centric testing command center. View all tested models, track score progression, analyze vulnerabilities, and download reports."
        sections={GUIDE_SECTIONS}
      />

      {/* Config Panel */}
      <ConfigPanel
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Jutsu Settings"
        sections={CONFIG_SECTIONS}
        values={configValues}
        onChange={handleConfigChange}
        onSave={() => {
          try {
            // PR-4b.8: write new key name; old key is deleted during mount migration.
            localStorage.setItem('noda-jutsu-config', JSON.stringify(configValues))
          } catch { /* quota */ }
        }}
        onReset={() => setConfigValues({ ...DEFAULT_CONFIG })}
      />
    </div>
  )
}
