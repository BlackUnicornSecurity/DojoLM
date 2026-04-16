/**
 * File: KumiteConfig.tsx
 * Purpose: Configuration panels for SAGE, Arena, and Mitsuke sub-modules
 * Story: TPI-NODA-6.3, NODA-3 Story 9.2 (ConfigPanel migration)
 * Index:
 * - STORAGE_KEYS (line 15)
 * - Config interfaces (line 20)
 * - SAGEConfig component (line 65)
 * - ArenaConfig component (line 155)
 * - MitsukeConfig component (line 230)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'
import { kumiteSageStore, kumiteArenaStore, kumiteMitsukeStore } from '@/lib/stores'
import type { ClientStore } from '@/lib/client-storage'

const KUMITE_STORES: Record<'sage' | 'arena' | 'mitsuke', ClientStore<Record<string, unknown>>> = {
  sage: kumiteSageStore,
  arena: kumiteArenaStore,
  mitsuke: kumiteMitsukeStore,
}

// --- Config Data Types ---

export interface SAGEConfigData {
  mutationWeights: { substitution: number; insertion: number; deletion: number; encoding: number; structural: number; semantic: number }
  safetyThreshold: number
  generationLimit: number
  autoQuarantine: number
  seeds: string[]
}

export interface ArenaConfigData {
  agents: string[]
  matchDuration: number
  scoringPreset: 'default' | 'aggressive' | 'balanced' | 'defensive'
  gameMode: 'ctf' | 'koth' | 'redblue'
  attackMode: 'kunai' | 'shuriken' | 'naginata' | 'musashi'
  soundMuted: boolean
  temperature: number
  maxTokens: number
}

export interface MitsukeConfigData {
  sources: { name: string; url: string; enabled: boolean }[]
  alertThreshold: 'low' | 'medium' | 'high' | 'critical'
  extractionRules: string[]
  retentionDays: number
}

// --- Default configs ---

const DEFAULT_SAGE: SAGEConfigData = {
  mutationWeights: { substitution: 0.3, insertion: 0.2, deletion: 0.1, encoding: 0.15, structural: 0.15, semantic: 0.1 },
  safetyThreshold: 0.8,
  generationLimit: 100,
  autoQuarantine: 0.95,
  seeds: ['System override prompt', 'DAN jailbreak', 'Base64 encoded injection'],
}

const DEFAULT_ARENA: ArenaConfigData = {
  agents: ['Sentinel-v4', 'RedHawk-v2', 'BlueShield-v1'],
  matchDuration: 300,
  scoringPreset: 'default',
  gameMode: 'ctf',
  attackMode: 'kunai',
  soundMuted: true,
  temperature: 0.7,
  maxTokens: 1024,
}

const DEFAULT_MITSUKE: MitsukeConfigData = {
  sources: [
    { name: 'NIST NVD', url: 'https://nvd.nist.gov/feeds', enabled: true },
    { name: 'MITRE ATT&CK', url: 'https://attack.mitre.org/feeds', enabled: true },
    { name: 'OWASP Alerts', url: 'https://owasp.org/feeds', enabled: true },
  ],
  alertThreshold: 'medium',
  extractionRules: ['IP addresses', 'Domain names', 'Hash values', 'CVE IDs'],
  retentionDays: 90,
}

// --- Helper: Load/save via typed stores ---

function loadConfig<T>(
  store: ClientStore<Record<string, unknown>>,
  defaults: T,
): T {
  const parsed = store.get()
  if (Object.keys(parsed).length === 0) return defaults
  return { ...defaults, ...parsed } as T
}

function saveConfig(store: ClientStore<Record<string, unknown>>, data: unknown): void {
  store.set(data as Record<string, unknown>)
}

// --- Reusable dynamic list renderer ---

function DynamicListControl({
  items,
  onAdd,
  onRemove,
  placeholder,
  itemLabel,
}: {
  items: string[]
  onAdd: (item: string) => void
  onRemove: (idx: number) => void
  placeholder: string
  itemLabel: string
}) {
  const [newItem, setNewItem] = useState('')

  const handleAdd = useCallback(() => {
    if (newItem.trim()) {
      onAdd(newItem.trim())
      setNewItem('')
    }
  }, [newItem, onAdd])

  return (
    <div className="space-y-2">
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {items.map((item, idx) => (
          <div key={`${itemLabel}-${idx}-${item}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs">
            <span className="truncate text-muted-foreground">{item}</span>
            <button
              onClick={() => onRemove(idx)}
              className="text-[var(--danger)] hover:opacity-80 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Remove ${itemLabel}: ${item}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]"
          aria-label={`New ${itemLabel}`}
        />
        <button
          onClick={handleAdd}
          className="px-2 py-1.5 rounded-lg bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Add ${itemLabel}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// --- SAGE Config ---

export function SAGEConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<SAGEConfigData>(DEFAULT_SAGE)

  useEffect(() => {
    const loaded = loadConfig(KUMITE_STORES.sage, DEFAULT_SAGE)
    const requiredKeys: (keyof SAGEConfigData['mutationWeights'])[] = ['substitution', 'insertion', 'deletion', 'encoding', 'structural', 'semantic']
    const w = loaded.mutationWeights
    const validWeights = w && typeof w === 'object' && !Array.isArray(w) &&
      requiredKeys.every((k) => typeof w[k] === 'number' && w[k] >= 0 && w[k] <= 1)
    if (!validWeights) {
      loaded.mutationWeights = { ...DEFAULT_SAGE.mutationWeights }
    }
    setConfig(loaded)
  }, [])

  const handleChange = useCallback((key: string, value: unknown) => {
    if (key.startsWith('weight_')) {
      const op = key.replace('weight_', '') as keyof SAGEConfigData['mutationWeights']
      setConfig((prev) => ({
        ...prev,
        mutationWeights: { ...prev.mutationWeights, [op]: value },
      }))
    } else if (key === 'seeds') {
      setConfig((prev) => ({ ...prev, seeds: value as string[] }))
    } else {
      setConfig((prev) => ({ ...prev, [key]: value }))
    }
  }, [])

  const handleSave = useCallback(() => {
    saveConfig(KUMITE_STORES.sage, config)
  }, [config])

  const handleReset = useCallback(() => setConfig(DEFAULT_SAGE), [])

  const sections: ConfigSection[] = [
    {
      id: 'mutation-weights',
      label: 'Mutation Operator Weights',
      defaultOpen: true,
      controls: ['substitution', 'insertion', 'deletion', 'encoding', 'structural', 'semantic'].map((op) => ({
        type: 'number' as const,
        key: `weight_${op}`,
        label: op.charAt(0).toUpperCase() + op.slice(1),
        min: 0,
        max: 1,
        step: 0.05,
      })),
    },
    {
      id: 'thresholds',
      label: 'Thresholds & Limits',
      defaultOpen: true,
      controls: [
        { type: 'number' as const, key: 'safetyThreshold', label: 'Safety Threshold', min: 0, max: 1, step: 0.05 },
        { type: 'number' as const, key: 'generationLimit', label: 'Generation Limit', min: 10, max: 500, step: 10 },
        { type: 'number' as const, key: 'autoQuarantine', label: 'Auto-Quarantine Threshold', min: 0.5, max: 1, step: 0.05 },
      ],
    },
    {
      id: 'seed-library',
      label: `Seed Library (${config.seeds.length})`,
      defaultOpen: true,
      controls: [
        {
          type: 'custom' as const,
          key: 'seeds',
          label: '',
          render: () => (
            <DynamicListControl
              items={config.seeds}
              onAdd={(item) => setConfig((prev) => ({ ...prev, seeds: [...prev.seeds, item] }))}
              onRemove={(idx) => setConfig((prev) => ({ ...prev, seeds: prev.seeds.filter((_, i) => i !== idx) }))}
              placeholder="Add new seed..."
              itemLabel="seed"
            />
          ),
        },
      ],
    },
  ]

  // Flatten config to values record for ConfigPanel
  const values: Record<string, unknown> = {
    ...Object.fromEntries(
      Object.entries(config.mutationWeights).map(([k, v]) => [`weight_${k}`, v])
    ),
    safetyThreshold: config.safetyThreshold,
    generationLimit: config.generationLimit,
    autoQuarantine: config.autoQuarantine,
    seeds: config.seeds,
  }

  return (
    <ConfigPanel
      isOpen={isOpen}
      onClose={onClose}
      title="SAGE Configuration"
      sections={sections}
      values={values}
      onChange={handleChange}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}

// --- Arena Config ---

export function ArenaConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<ArenaConfigData>(DEFAULT_ARENA)

  useEffect(() => {
    const loaded = loadConfig(KUMITE_STORES.arena, DEFAULT_ARENA)
    if (!Array.isArray(loaded.agents) || !loaded.agents.every((a: unknown) => typeof a === 'string')) {
      loaded.agents = [...DEFAULT_ARENA.agents]
    }
    setConfig(loaded)
  }, [])

  const handleChange = useCallback((key: string, value: unknown) => {
    if (key === 'agents') {
      setConfig((prev) => ({ ...prev, agents: value as string[] }))
    } else if (key === 'soundMuted') {
      setConfig((prev) => ({ ...prev, soundMuted: value === 'true' }))
    } else {
      setConfig((prev) => ({ ...prev, [key]: value }))
    }
  }, [])

  const handleSave = useCallback(() => {
    saveConfig(KUMITE_STORES.arena, config)
  }, [config])

  const handleReset = useCallback(() => setConfig(DEFAULT_ARENA), [])

  const sections: ConfigSection[] = [
    {
      id: 'roster',
      label: `Agent Roster (${config.agents.length})`,
      defaultOpen: true,
      controls: [
        {
          type: 'custom' as const,
          key: 'agents',
          label: '',
          render: () => (
            <DynamicListControl
              items={config.agents}
              onAdd={(item) => setConfig((prev) => ({ ...prev, agents: [...prev.agents, item] }))}
              onRemove={(idx) => setConfig((prev) => ({ ...prev, agents: prev.agents.filter((_, i) => i !== idx) }))}
              placeholder="Add agent..."
              itemLabel="agent"
            />
          ),
        },
      ],
    },
    {
      id: 'match-settings',
      label: 'Match Settings',
      defaultOpen: true,
      controls: [
        { type: 'number' as const, key: 'matchDuration', label: 'Match Duration', min: 60, max: 600, step: 30, unit: 's' },
        {
          type: 'radiogroup' as const,
          key: 'scoringPreset',
          label: 'Scoring Preset',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'aggressive', label: 'Aggressive' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'defensive', label: 'Defensive' },
          ],
          columns: 2,
          accentColor: 'var(--dojo-primary)',
        },
        {
          type: 'radiogroup' as const,
          key: 'gameMode',
          label: 'Game Mode',
          options: [
            { value: 'ctf', label: 'CTF' },
            { value: 'koth', label: 'King of the Hill' },
            { value: 'redblue', label: 'Red vs Blue' },
          ],
          columns: 3,
          accentColor: 'var(--warning)',
        },
        {
          type: 'radiogroup' as const,
          key: 'attackMode',
          label: 'Attack Mode',
          options: [
            { value: 'kunai', label: 'Kunai Strike' },
            { value: 'shuriken', label: 'Shuriken Storm' },
            { value: 'naginata', label: 'Naginata Sweep' },
            { value: 'musashi', label: 'Way of Musashi' },
          ],
          columns: 2,
          accentColor: 'var(--dojo-primary)',
        },
      ],
    },
    {
      id: 'model-defaults',
      label: 'Model Defaults',
      defaultOpen: true,
      controls: [
        { type: 'number' as const, key: 'temperature', label: 'Temperature', min: 0, max: 2, step: 0.1 },
        { type: 'number' as const, key: 'maxTokens', label: 'Max Tokens', min: 128, max: 4096, step: 128 },
        {
          type: 'radiogroup' as const,
          key: 'soundMuted',
          label: 'Sound Effects',
          options: [
            { value: 'true', label: 'Muted' },
            { value: 'false', label: 'Enabled' },
          ],
          columns: 2,
          accentColor: 'var(--bu-electric)',
        },
      ],
    },
  ]

  const values: Record<string, unknown> = {
    agents: config.agents,
    matchDuration: config.matchDuration,
    scoringPreset: config.scoringPreset,
    gameMode: config.gameMode,
    attackMode: config.attackMode,
    soundMuted: String(config.soundMuted),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }

  return (
    <ConfigPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Arena Configuration"
      sections={sections}
      values={values}
      onChange={handleChange}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}

// --- Mitsuke Config ---

export function MitsukeConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<MitsukeConfigData>(DEFAULT_MITSUKE)

  useEffect(() => {
    const loaded = loadConfig(KUMITE_STORES.mitsuke, DEFAULT_MITSUKE)
    if (
      !Array.isArray(loaded.sources) ||
      !loaded.sources.every((s: unknown) =>
        s && typeof s === 'object' && !Array.isArray(s) &&
        typeof (s as Record<string, unknown>).name === 'string' &&
        typeof (s as Record<string, unknown>).url === 'string' &&
        typeof (s as Record<string, unknown>).enabled === 'boolean'
      )
    ) {
      loaded.sources = DEFAULT_MITSUKE.sources.map((s) => ({ ...s }))
    }
    setConfig(loaded)
  }, [])

  const handleChange = useCallback((key: string, value: unknown) => {
    if (key === 'sources') {
      setConfig((prev) => ({ ...prev, sources: value as MitsukeConfigData['sources'] }))
    } else {
      setConfig((prev) => ({ ...prev, [key]: value }))
    }
  }, [])

  const handleSave = useCallback(() => {
    saveConfig(KUMITE_STORES.mitsuke, config)
  }, [config])

  const handleReset = useCallback(() => setConfig(DEFAULT_MITSUKE), [])

  const toggleSource = useCallback((idx: number) => {
    setConfig((prev) => {
      const sources = [...prev.sources]
      sources[idx] = { ...sources[idx], enabled: !sources[idx].enabled }
      return { ...prev, sources }
    })
  }, [])

  const removeSource = useCallback((idx: number) => {
    setConfig((prev) => ({ ...prev, sources: prev.sources.filter((_, i) => i !== idx) }))
  }, [])

  const sections: ConfigSection[] = [
    {
      id: 'sources',
      label: `Feed Sources (${config.sources.length})`,
      defaultOpen: true,
      controls: [
        {
          type: 'custom' as const,
          key: 'sources',
          label: '',
          render: () => (
            <div className="space-y-1.5">
              {config.sources.map((source, idx) => (
                <div key={`source-${idx}-${source.name}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      role="switch"
                      aria-checked={source.enabled}
                      onClick={() => toggleSource(idx)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0',
                        'motion-safe:transition-colors',
                        source.enabled ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]',
                      )}
                      aria-label={`Toggle ${source.name}`}
                    >
                      <span
                        className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full bg-white',
                          'motion-safe:transition-transform',
                          source.enabled ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">{source.name}</p>
                      <p className="text-[var(--text-tertiary)] truncate">{source.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSource(idx)}
                    className="text-[var(--danger)] hover:opacity-80 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Remove source: ${source.name}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ),
        },
      ],
    },
    {
      id: 'alerts',
      label: 'Alert Settings',
      defaultOpen: true,
      controls: [
        {
          type: 'radiogroup' as const,
          key: 'alertThreshold',
          label: 'Alert Threshold',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ],
          columns: 4,
          accentColor: 'var(--severity-high)',
        },
        { type: 'number' as const, key: 'retentionDays', label: 'Data Retention', min: 7, max: 365, step: 7, unit: 'days' },
      ],
    },
    {
      id: 'extraction',
      label: 'Indicator Extraction Rules',
      defaultOpen: false,
      controls: [
        {
          type: 'custom' as const,
          key: 'extractionRules',
          label: '',
          render: () => (
            <div className="space-y-1">
              {config.extractionRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs text-muted-foreground">
                  <span className="flex-1">{rule}</span>
                </div>
              ))}
            </div>
          ),
        },
      ],
    },
  ]

  const values: Record<string, unknown> = {
    sources: config.sources,
    alertThreshold: config.alertThreshold,
    retentionDays: config.retentionDays,
    extractionRules: config.extractionRules,
  }

  return (
    <ConfigPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Mitsuke Configuration"
      sections={sections}
      values={values}
      onChange={handleChange}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}
