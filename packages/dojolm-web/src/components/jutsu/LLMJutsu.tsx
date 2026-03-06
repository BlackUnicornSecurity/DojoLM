/**
 * File: LLMJutsu.tsx
 * Purpose: Main LLM Jutsu — Model-centric testing command center
 * Story: NODA-3 Story 11.1
 * Index:
 * - DEMO_EXECUTIONS (line 22)
 * - LLMJutsu component (line 97)
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ScrollText, Search, Filter, HelpCircle, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'
import { JutsuModelCard } from './JutsuModelCard'
import { ModelDetailView } from './ModelDetailView'
import { aggregateByModel, type AggregatedModel, type TestExecution } from './JutsuAggregation'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

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

/**
 * LLMJutsu — Main LLM testing command center
 */
export function LLMJutsu() {
  const [executions, setExecutions] = useState<TestExecution[]>(DEMO_EXECUTIONS)
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [selectedModel, setSelectedModel] = useState<AggregatedModel | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, unknown>>(DEFAULT_CONFIG)

  // Try to load real results from API
  useEffect(() => {
    let cancelled = false
    async function loadResults() {
      try {
        const res = await fetchWithAuth('/api/llm/results')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.results) && data.results.length > 0) {
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
            categoriesFailed: Array.isArray(r.categoriesFailed) ? r.categoriesFailed : [],
            timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date().toISOString(),
            batchId: typeof r.batchId === 'string' ? r.batchId : undefined,
          }))
          setExecutions(mapped)
        }
      } catch {
        // Use demo data (already set)
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

  const filteredModels = useMemo(() => {
    return aggregatedModels.filter(m => {
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return m.modelName.toLowerCase().includes(s) || m.provider.toLowerCase().includes(s)
      }
      return true
    })
  }, [aggregatedModels, providerFilter, search])

  const handleConfigChange = useCallback((key: string, value: unknown) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-purple-500" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">LLM Jutsu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Testing Command Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGuideOpen(true)}
            className={cn(
              'p-2 rounded-lg text-muted-foreground hover:text-foreground',
              'hover:bg-[var(--bg-tertiary)] min-w-[44px] min-h-[44px]',
              'flex items-center justify-center motion-safe:transition-colors',
            )}
            aria-label="Open LLM Jutsu guide"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setConfigOpen(true)}
            className={cn(
              'p-2 rounded-lg text-muted-foreground hover:text-foreground',
              'hover:bg-[var(--bg-tertiary)] min-w-[44px] min-h-[44px]',
              'flex items-center justify-center motion-safe:transition-colors',
            )}
            aria-label="Open LLM Jutsu settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-[var(--border)]">
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
              'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
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
            'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
          )}
          aria-label="Filter by provider"
        >
          <option value="all">All Providers</option>
          {providers.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <p className="text-xs text-muted-foreground">
        {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} found
      </p>

      {/* Model Grid */}
      {filteredModels.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModels.map(model => (
            <JutsuModelCard
              key={model.modelId}
              model={model}
              onView={setSelectedModel}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">No models found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run LLM tests from the LLM Dashboard to populate the model grid
          </p>
        </div>
      )}

      {/* Model Detail */}
      {selectedModel && (
        <ModelDetailView
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
        />
      )}

      {/* Guide Panel */}
      <ModuleGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="LLM Jutsu Guide"
        description="LLM Jutsu is your model-centric testing command center. View all tested models, track score progression, analyze vulnerabilities, and download reports."
        sections={GUIDE_SECTIONS}
      />

      {/* Config Panel */}
      <ConfigPanel
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        title="LLM Jutsu Settings"
        sections={CONFIG_SECTIONS}
        values={configValues}
        onChange={handleConfigChange}
        onSave={() => {
          try {
            localStorage.setItem('noda-llm-jutsu-config', JSON.stringify(configValues))
          } catch { /* quota */ }
        }}
        onReset={() => setConfigValues({ ...DEFAULT_CONFIG })}
      />
    </div>
  )
}
