/**
 * File: AmaterasuConfig.tsx
 * Purpose: Configuration panel for Amaterasu DNA module (uses generic ConfigPanel)
 * Story: TPI-NODA-6.4 / KASHIWA-12.5 — Sync + Ingestion settings
 * Index:
 * - STORAGE_KEY + validation constants (line 15)
 * - AmaterasuConfigData interface (line 20)
 * - DEFAULT_CONFIG (line 30)
 * - loadConfig helper (line 42)
 * - SyncControls sub-component (line 65)
 * - IngestControls sub-component (line 145)
 * - CONFIG_SECTIONS definition (line 195)
 * - AmaterasuConfig component (line 260)
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const STORAGE_KEY = 'amaterasu-config'
const VALID_CLUSTER_ALGORITHMS = ['kmeans', 'dbscan', 'hierarchical'] as const
const VALID_TIMELINE_GROUPINGS = ['hour', 'day', 'week'] as const
const VALID_SYNC_SCHEDULES = ['daily', 'weekly', 'monthly', 'manual'] as const

export interface AmaterasuConfigData {
  similarityThreshold: number
  maxTreeDepth: number
  clusterAlgorithm: 'kmeans' | 'dbscan' | 'hierarchical'
  timelineGrouping: 'hour' | 'day' | 'week'
  showOrphanNodes: boolean
  highlightCritical: boolean
  embeddingModel: string
}

const DEFAULT_CONFIG: AmaterasuConfigData = {
  similarityThreshold: 0.75,
  maxTreeDepth: 10,
  clusterAlgorithm: 'dbscan',
  timelineGrouping: 'day',
  showOrphanNodes: true,
  highlightCritical: true,
  embeddingModel: 'all-MiniLM-L6-v2',
}

function loadConfig(): AmaterasuConfigData {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_CONFIG
    const parsed: unknown = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const merged = { ...DEFAULT_CONFIG, ...(parsed as Partial<AmaterasuConfigData>) }
      merged.similarityThreshold = Math.min(1, Math.max(0.1, merged.similarityThreshold))
      merged.maxTreeDepth = Math.min(25, Math.max(3, Math.round(merged.maxTreeDepth)))
      if (!(VALID_CLUSTER_ALGORITHMS as readonly string[]).includes(merged.clusterAlgorithm)) {
        merged.clusterAlgorithm = DEFAULT_CONFIG.clusterAlgorithm
      }
      if (!(VALID_TIMELINE_GROUPINGS as readonly string[]).includes(merged.timelineGrouping)) {
        merged.timelineGrouping = DEFAULT_CONFIG.timelineGrouping
      }
      return merged
    }
  } catch { /* use defaults */ }
  return DEFAULT_CONFIG
}

// ===========================================================================
// Sync Controls (custom render for ConfigPanel)
// ===========================================================================

function SyncControls() {
  const [syncStatus, setSyncStatus] = useState<{
    config: { syncSchedule: string; enabledSources: string[]; autoSyncEnabled: boolean; lastSyncAt: string | null }
    syncInProgress: boolean
    recentHistory: { syncedAt: string; entriesClassified: number; errors: string[] }[]
  } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchWithAuth('/api/attackdna/sync')
      .then(async (res) => {
        if (res.ok && mountedRef.current) {
          setSyncStatus(await res.json())
        }
      })
      .catch(() => { /* non-critical */ })
    return () => { mountedRef.current = false }
  }, [])

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetchWithAuth('/api/attackdna/sync', { method: 'POST' })
      if (mountedRef.current) {
        if (res.ok) {
          const data = await res.json()
          setMessage(`Synced: ${data.entriesClassified ?? 0} entries`)
        } else {
          setMessage('Sync failed — server returned an error')
        }
        // Refresh status
        const statusRes = await fetchWithAuth('/api/attackdna/sync')
        if (statusRes.ok && mountedRef.current) setSyncStatus(await statusRes.json())
      }
    } catch {
      if (mountedRef.current) setMessage('Sync failed — check connection')
    } finally {
      if (mountedRef.current) setSyncing(false)
    }
  }, [])

  const handleScheduleChange = useCallback(async (schedule: string) => {
    try {
      await fetchWithAuth('/api/attackdna/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
      })
      const statusRes = await fetchWithAuth('/api/attackdna/sync')
      if (statusRes.ok && mountedRef.current) setSyncStatus(await statusRes.json())
    } catch { /* non-critical */ }
  }, [])

  const handleAutoSyncToggle = useCallback(async () => {
    const current = syncStatus?.config?.autoSyncEnabled ?? false
    try {
      await fetchWithAuth('/api/attackdna/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncEnabled: !current }),
      })
      const statusRes = await fetchWithAuth('/api/attackdna/sync')
      if (statusRes.ok && mountedRef.current) setSyncStatus(await statusRes.json())
    } catch { /* non-critical */ }
  }, [syncStatus])

  const lastSync = syncStatus?.config?.lastSyncAt
  const history = syncStatus?.recentHistory?.slice(-5) ?? []

  return (
    <div className="space-y-3">
      {/* Schedule */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Schedule</p>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Sync schedule">
          {VALID_SYNC_SCHEDULES.map((s) => (
            <button
              key={s}
              onClick={() => handleScheduleChange(s)}
              role="radio"
              aria-checked={syncStatus?.config?.syncSchedule === s}
              className={`text-xs px-2 py-1.5 rounded-full border capitalize motion-safe:transition-colors min-h-[36px] ${
                syncStatus?.config?.syncSchedule === s
                  ? 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold-muted)] text-[var(--accent-gold)]'
                  : 'border-[var(--border)] text-muted-foreground hover:border-[var(--border-hover)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Sync Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Auto-Sync</span>
        <button
          onClick={handleAutoSyncToggle}
          role="switch"
          aria-checked={syncStatus?.config?.autoSyncEnabled ?? false}
          className={`w-9 h-5 rounded-full motion-safe:transition-colors relative ${
            syncStatus?.config?.autoSyncEnabled
              ? 'bg-[var(--accent-gold)]'
              : 'bg-[var(--bg-quaternary)]'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white motion-safe:transition-transform ${
            syncStatus?.config?.autoSyncEnabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Sync Now + Status */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="text-xs px-3 py-1.5 rounded-full border border-[var(--accent-gold)]/50 text-[var(--accent-gold)] hover:bg-[var(--accent-gold-muted)] motion-safe:transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        {lastSync && (
          <span className="text-[10px] text-muted-foreground">
            Last: {new Date(lastSync).toLocaleString()}
          </span>
        )}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {/* Sync History */}
      {history.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Recent Syncs</p>
          {history.map((h, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex justify-between">
              <span>{new Date(h.syncedAt).toLocaleDateString()}</span>
              <span>{h.entriesClassified} entries</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Ingest Controls (custom render for ConfigPanel)
// ===========================================================================

function IngestControls() {
  const [ingesting, setIngesting] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState<{ currentNodeCount: number; currentEdgeCount: number } | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchWithAuth('/api/attackdna/ingest')
      .then(async (res) => {
        if (res.ok && mountedRef.current) setStats(await res.json())
      })
      .catch(() => { /* non-critical */ })
    return () => { mountedRef.current = false }
  }, [])

  const handleIngestNow = useCallback(async () => {
    setIngesting(true)
    setMessage('')
    try {
      const res = await fetchWithAuth('/api/attackdna/ingest', { method: 'POST' })
      if (mountedRef.current) {
        if (res.ok) {
          const data = await res.json()
          setMessage(`Ingested: ${data.nodesIngested ?? 0} nodes, ${data.edgesCreated ?? 0} edges`)
        } else {
          setMessage('Ingestion failed — server returned an error')
        }
        const statusRes = await fetchWithAuth('/api/attackdna/ingest')
        if (statusRes.ok && mountedRef.current) setStats(await statusRes.json())
      }
    } catch {
      if (mountedRef.current) setMessage('Ingestion failed — check connection')
    } finally {
      if (mountedRef.current) setIngesting(false)
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={handleIngestNow}
          disabled={ingesting}
          className="text-xs px-3 py-1.5 rounded-full border border-[var(--bu-electric)]/50 text-[var(--bu-electric)] hover:bg-[var(--bu-electric-subtle)] motion-safe:transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {ingesting ? 'Ingesting...' : 'Ingest Now'}
        </button>
        {stats && (
          <span className="text-[10px] text-muted-foreground">
            {stats.currentNodeCount} nodes, {stats.currentEdgeCount} edges
          </span>
        )}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}

// --- ConfigPanel sections ---

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: 'master-sync',
    label: 'Master Sync',
    defaultOpen: true,
    controls: [
      {
        type: 'custom',
        key: 'masterSync',
        label: 'Master Sync',
        render: () => <SyncControls />,
      },
    ],
  },
  {
    id: 'local-ingestion',
    label: 'Local Ingestion',
    defaultOpen: true,
    controls: [
      {
        type: 'custom',
        key: 'localIngestion',
        label: 'Local Ingestion',
        render: () => <IngestControls />,
      },
    ],
  },
  {
    id: 'graph',
    label: 'Graph Settings',
    defaultOpen: true,
    controls: [
      {
        type: 'number',
        key: 'similarityThreshold',
        label: 'Similarity Threshold',
        min: 0.1,
        max: 1,
        step: 0.05,
      },
      {
        type: 'number',
        key: 'maxTreeDepth',
        label: 'Max Tree Depth',
        min: 3,
        max: 25,
        step: 1,
      },
    ],
  },
  {
    id: 'algorithms',
    label: 'Algorithms',
    defaultOpen: true,
    controls: [
      {
        type: 'radiogroup',
        key: 'clusterAlgorithm',
        label: 'Cluster Algorithm',
        options: [
          { value: 'kmeans', label: 'K-Means' },
          { value: 'dbscan', label: 'DBSCAN' },
          { value: 'hierarchical', label: 'Hierarchical' },
        ],
        columns: 3,
        accentColor: 'var(--dojo-primary)',
      },
      {
        type: 'radiogroup',
        key: 'timelineGrouping',
        label: 'Timeline Grouping',
        options: [
          { value: 'hour', label: 'Hourly' },
          { value: 'day', label: 'Daily' },
          { value: 'week', label: 'Weekly' },
        ],
        columns: 3,
        accentColor: 'var(--bu-electric)',
      },
    ],
  },
  {
    id: 'display',
    label: 'Display Options',
    defaultOpen: true,
    controls: [
      {
        type: 'toggle',
        key: 'showOrphanNodes',
        label: 'Show Orphan Nodes',
        description: 'Display nodes with no parent or children.',
      },
      {
        type: 'toggle',
        key: 'highlightCritical',
        label: 'Highlight Critical Nodes',
        description: 'Add glow effect to critical severity nodes.',
      },
    ],
  },
  {
    id: 'model',
    label: 'Embedding',
    defaultOpen: false,
    controls: [
      {
        type: 'text',
        key: 'embeddingModel',
        label: 'Embedding Model',
        placeholder: 'e.g. all-MiniLM-L6-v2',
      },
    ],
  },
]

// --- Component ---

export interface AmaterasuConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function AmaterasuConfig({ isOpen, onClose }: AmaterasuConfigProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...DEFAULT_CONFIG }))

  useEffect(() => {
    const loaded = loadConfig()
    setValues({ ...loaded })
  }, [])

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
      } catch { /* QuotaExceededError */ }
    }
  }, [values])

  const handleReset = useCallback(() => {
    setValues({ ...DEFAULT_CONFIG })
  }, [])

  return (
    <ConfigPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Amaterasu DNA"
      sections={CONFIG_SECTIONS}
      values={values}
      onChange={handleChange}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}
