/**
 * File: KumiteConfig.tsx
 * Purpose: Configuration panels for SAGE, Arena, and Mitsuke sub-modules
 * Story: TPI-NODA-6.3 - The Kumite Module Configuration
 * Index:
 * - STORAGE_KEYS (line 15)
 * - Config interfaces (line 20)
 * - SAGEConfig component (line 55)
 * - ArenaConfig component (line 150)
 * - MitsukeConfig component (line 240)
 * - ConfigSlidePanel wrapper (line 330)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Settings,
  Save,
  RotateCcw,
  Dna,
  Swords,
  Radio,
  Plus,
  Trash2,
} from 'lucide-react'

const STORAGE_KEYS = {
  sage: 'kumite-sage-config',
  arena: 'kumite-arena-config',
  mitsuke: 'kumite-mitsuke-config',
} as const

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

// --- Helper: Load from localStorage with validation ---

function loadConfig<T>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return defaults
    const parsed: unknown = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...defaults, ...(parsed as Partial<T>) }
    }
  } catch { /* use defaults */ }
  return defaults
}

function saveConfig(key: string, data: unknown) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

// --- SAGE Config ---

export function SAGEConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<SAGEConfigData>(DEFAULT_SAGE)
  const [newSeed, setNewSeed] = useState('')

  useEffect(() => {
    const loaded = loadConfig(STORAGE_KEYS.sage, DEFAULT_SAGE)
    // Validate mutationWeights has all 6 numeric keys
    const requiredKeys: (keyof SAGEConfigData['mutationWeights'])[] = ['substitution', 'insertion', 'deletion', 'encoding', 'structural', 'semantic']
    const w = loaded.mutationWeights
    const validWeights = w && typeof w === 'object' && !Array.isArray(w) &&
      requiredKeys.every((k) => typeof w[k] === 'number' && w[k] >= 0 && w[k] <= 1)
    if (!validWeights) {
      loaded.mutationWeights = { ...DEFAULT_SAGE.mutationWeights }
    }
    setConfig(loaded)
  }, [])

  const handleSave = useCallback(() => {
    saveConfig(STORAGE_KEYS.sage, config)
    onClose()
  }, [config, onClose])

  const addSeed = useCallback(() => {
    if (newSeed.trim()) {
      setConfig((prev) => ({ ...prev, seeds: [...prev.seeds, newSeed.trim()] }))
      setNewSeed('')
    }
  }, [newSeed])

  const removeSeed = useCallback((idx: number) => {
    setConfig((prev) => ({ ...prev, seeds: prev.seeds.filter((_, i) => i !== idx) }))
  }, [])

  return (
    <ConfigSlidePanel isOpen={isOpen} onClose={onClose} title="SAGE Configuration" icon={Dna} onSave={handleSave} onReset={() => setConfig(DEFAULT_SAGE)}>
      {/* Mutation Operator Weights */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Mutation Operator Weights</legend>
        {(Object.keys(config.mutationWeights) as (keyof SAGEConfigData['mutationWeights'])[]).map((op) => (
          <div key={op} className="flex items-center justify-between gap-3">
            <label className="text-xs text-muted-foreground capitalize w-24">{op}</label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={config.mutationWeights[op]}
              onChange={(e) => setConfig((prev) => ({ ...prev, mutationWeights: { ...prev.mutationWeights, [op]: Number(e.target.value) } }))}
              className="flex-1 accent-primary" aria-label={`${op} weight`}
            />
            <Badge variant="outline" className="text-[10px] w-10 justify-center">{config.mutationWeights[op].toFixed(2)}</Badge>
          </div>
        ))}
      </fieldset>

      {/* Safety Threshold */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
          Safety Threshold <Badge variant="outline" className="text-[10px]">{config.safetyThreshold.toFixed(2)}</Badge>
        </legend>
        <input type="range" min={0} max={1} step={0.05} value={config.safetyThreshold} onChange={(e) => setConfig((prev) => ({ ...prev, safetyThreshold: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Safety threshold" />
      </fieldset>

      {/* Generation Limit */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
          Generation Limit <Badge variant="outline" className="text-[10px]">{config.generationLimit}</Badge>
        </legend>
        <input type="range" min={10} max={500} step={10} value={config.generationLimit} onChange={(e) => setConfig((prev) => ({ ...prev, generationLimit: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Generation limit" />
      </fieldset>

      {/* Auto-Quarantine Threshold */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
          Auto-Quarantine Threshold <Badge variant="outline" className="text-[10px]">{config.autoQuarantine.toFixed(2)}</Badge>
        </legend>
        <input type="range" min={0.5} max={1} step={0.05} value={config.autoQuarantine} onChange={(e) => setConfig((prev) => ({ ...prev, autoQuarantine: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Auto-quarantine threshold" />
      </fieldset>

      {/* Seed Library */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Seed Library ({config.seeds.length})</legend>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {config.seeds.map((seed, idx) => (
            <div key={`seed-${idx}-${seed}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] text-xs">
              <span className="truncate text-muted-foreground">{seed}</span>
              <button onClick={() => removeSeed(idx)} className="text-[var(--danger)] hover:text-[var(--danger)]/80 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Remove seed: ${seed}`}>
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newSeed} onChange={(e) => setNewSeed(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSeed()} placeholder="Add new seed..." className="flex-1 px-2 py-1.5 rounded-md bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]" aria-label="New seed text" />
          <button onClick={addSeed} className="px-2 py-1.5 rounded-md bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[36px] flex items-center justify-center" aria-label="Add seed">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </fieldset>
    </ConfigSlidePanel>
  )
}

// --- Arena Config ---

export function ArenaConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<ArenaConfigData>(DEFAULT_ARENA)
  const [newAgent, setNewAgent] = useState('')

  useEffect(() => {
    const loaded = loadConfig(STORAGE_KEYS.arena, DEFAULT_ARENA)
    // Validate agents is an array of strings
    if (!Array.isArray(loaded.agents) || !loaded.agents.every((a: unknown) => typeof a === 'string')) {
      loaded.agents = [...DEFAULT_ARENA.agents]
    }
    setConfig(loaded)
  }, [])

  const handleSave = useCallback(() => { saveConfig(STORAGE_KEYS.arena, config); onClose() }, [config, onClose])

  const addAgent = useCallback(() => {
    if (newAgent.trim()) { setConfig((prev) => ({ ...prev, agents: [...prev.agents, newAgent.trim()] })); setNewAgent('') }
  }, [newAgent])

  const removeAgent = useCallback((idx: number) => {
    setConfig((prev) => ({ ...prev, agents: prev.agents.filter((_, i) => i !== idx) }))
  }, [])

  return (
    <ConfigSlidePanel isOpen={isOpen} onClose={onClose} title="Arena Configuration" icon={Swords} onSave={handleSave} onReset={() => setConfig(DEFAULT_ARENA)}>
      {/* Agent Roster */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Agent Roster ({config.agents.length})</legend>
        <div className="space-y-1">
          {config.agents.map((agent, idx) => (
            <div key={`agent-${idx}-${agent}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] text-xs">
              <span className="text-muted-foreground">{agent}</span>
              <button onClick={() => removeAgent(idx)} className="text-[var(--danger)] hover:text-[var(--danger)]/80 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Remove agent: ${agent}`}>
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newAgent} onChange={(e) => setNewAgent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAgent()} placeholder="Add agent..." className="flex-1 px-2 py-1.5 rounded-md bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]" aria-label="New agent name" />
          <button onClick={addAgent} className="px-2 py-1.5 rounded-md bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[36px] flex items-center justify-center" aria-label="Add agent">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </fieldset>

      {/* Match Duration */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
          Match Duration <Badge variant="outline" className="text-[10px]">{config.matchDuration}s</Badge>
        </legend>
        <input type="range" min={60} max={600} step={30} value={config.matchDuration} onChange={(e) => setConfig((prev) => ({ ...prev, matchDuration: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Match duration in seconds" />
      </fieldset>

      {/* Scoring Preset */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Scoring Preset</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scoring preset">
          {(['default', 'aggressive', 'balanced', 'defensive'] as const).map((preset) => (
            <button key={preset} role="radio" aria-checked={config.scoringPreset === preset} onClick={() => setConfig((prev) => ({ ...prev, scoringPreset: preset }))}
              className={cn('px-3 py-2 rounded-lg border text-xs font-medium capitalize min-h-[40px]', 'motion-safe:transition-colors',
                config.scoringPreset === preset ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]' : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]')}>
              {preset}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Game Mode */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Game Mode</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Game mode">
          {([{ id: 'ctf', label: 'CTF' }, { id: 'koth', label: 'King of the Hill' }, { id: 'redblue', label: 'Red vs Blue' }] as const).map((gm) => (
            <button key={gm.id} role="radio" aria-checked={config.gameMode === gm.id} onClick={() => setConfig((prev) => ({ ...prev, gameMode: gm.id }))}
              className={cn('px-3 py-2 rounded-lg border text-xs font-medium min-h-[40px]', 'motion-safe:transition-colors',
                config.gameMode === gm.id ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]' : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]')}>
              {gm.label}
            </button>
          ))}
        </div>
      </fieldset>
    </ConfigSlidePanel>
  )
}

// --- Mitsuke Config ---

export function MitsukeConfig({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<MitsukeConfigData>(DEFAULT_MITSUKE)

  useEffect(() => {
    const loaded = loadConfig(STORAGE_KEYS.mitsuke, DEFAULT_MITSUKE)
    // Validate sources is an array with proper shape
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

  const handleSave = useCallback(() => { saveConfig(STORAGE_KEYS.mitsuke, config); onClose() }, [config, onClose])

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

  return (
    <ConfigSlidePanel isOpen={isOpen} onClose={onClose} title="Mitsuke Configuration" icon={Radio} onSave={handleSave} onReset={() => setConfig(DEFAULT_MITSUKE)}>
      {/* Feed Sources */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Feed Sources ({config.sources.length})</legend>
        <div className="space-y-1.5">
          {config.sources.map((source, idx) => (
            <div key={`source-${idx}-${source.name}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <button role="switch" aria-checked={source.enabled} onClick={() => toggleSource(idx)}
                  className={cn('relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0', 'motion-safe:transition-colors',
                    source.enabled ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]')}
                  aria-label={`Toggle ${source.name}`}>
                  <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white', 'motion-safe:transition-transform', source.enabled ? 'translate-x-4' : 'translate-x-0.5')} aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] truncate">{source.name}</p>
                  <p className="text-[var(--text-tertiary)] truncate">{source.url}</p>
                </div>
              </div>
              <button onClick={() => removeSource(idx)} className="text-[var(--danger)] hover:text-[var(--danger)]/80 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Remove source: ${source.name}`}>
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Alert Threshold */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Alert Threshold</legend>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Alert threshold">
          {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
            <button key={level} role="radio" aria-checked={config.alertThreshold === level} onClick={() => setConfig((prev) => ({ ...prev, alertThreshold: level }))}
              className={cn('px-3 py-2 rounded-lg border text-xs font-medium capitalize min-h-[40px]', 'motion-safe:transition-colors',
                config.alertThreshold === level ? 'border-[var(--severity-high)] bg-[var(--severity-high)]/10 text-[var(--severity-high)]' : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]')}>
              {level}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Retention Period */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
          Data Retention <Badge variant="outline" className="text-[10px]">{config.retentionDays} days</Badge>
        </legend>
        <input type="range" min={7} max={365} step={7} value={config.retentionDays} onChange={(e) => setConfig((prev) => ({ ...prev, retentionDays: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Data retention in days" />
      </fieldset>

      {/* Extraction Rules */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--foreground)]">Indicator Extraction Rules</legend>
        <div className="space-y-1">
          {config.extractionRules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] text-xs text-muted-foreground">
              <span className="flex-1">{rule}</span>
            </div>
          ))}
        </div>
      </fieldset>
    </ConfigSlidePanel>
  )
}

// --- Shared Config Slide Panel Wrapper ---

function ConfigSlidePanel({
  isOpen,
  onClose,
  title,
  icon: Icon,
  onSave,
  onReset,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  icon: typeof Settings
  onSave: () => void
  onReset: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (isOpen) closeRef.current?.focus() }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[var(--bg-secondary)] border-l border-[var(--border)] motion-safe:animate-slide-in-right flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          </div>
          <button ref={closeRef} onClick={onClose} className="p-2 rounded-md hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close config">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">{children}</div>
        <div className="flex items-center gap-2 p-4 border-t border-[var(--border)]">
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] min-h-[44px]">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset
          </button>
          <button onClick={onSave} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--dojo-primary)] text-white text-sm font-medium hover:bg-[var(--dojo-hover)] min-h-[44px] motion-safe:transition-colors">
            <Save className="h-3.5 w-3.5" aria-hidden="true" />Save
          </button>
        </div>
      </div>
    </>
  )
}
