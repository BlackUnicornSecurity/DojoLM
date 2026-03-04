/**
 * File: AmaterasuConfig.tsx
 * Purpose: Configuration panel for Amaterasu DNA module
 * Story: TPI-NODA-6.4 - Amaterasu DNA Configuration
 * Index:
 * - STORAGE_KEY (line 14)
 * - AmaterasuConfigData interface (line 16)
 * - DEFAULT_CONFIG (line 26)
 * - AmaterasuConfigProps interface (line 37)
 * - AmaterasuConfig component (line 42)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Save,
  RotateCcw,
  Dna,
} from 'lucide-react'

const STORAGE_KEY = 'amaterasu-config'
const VALID_CLUSTER_ALGORITHMS = ['kmeans', 'dbscan', 'hierarchical'] as const
const VALID_TIMELINE_GROUPINGS = ['hour', 'day', 'week'] as const

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
      // Clamp numeric values to valid ranges
      merged.similarityThreshold = Math.min(1, Math.max(0.1, merged.similarityThreshold))
      merged.maxTreeDepth = Math.min(25, Math.max(3, Math.round(merged.maxTreeDepth)))
      // Validate enum fields against allowed values
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

export interface AmaterasuConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function AmaterasuConfig({ isOpen, onClose }: AmaterasuConfigProps) {
  const [config, setConfig] = useState<AmaterasuConfigData>(DEFAULT_CONFIG)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setConfig(loadConfig()) }, [])
  useEffect(() => { if (isOpen) closeRef.current?.focus() }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSave = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }
    onClose()
  }, [config, onClose])

  const handleReset = useCallback(() => { setConfig(DEFAULT_CONFIG) }, [])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Amaterasu DNA Configuration"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[var(--bg-secondary)] border-l border-[var(--border)] motion-safe:animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Amaterasu Configuration</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close config"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Similarity Threshold */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
              Similarity Threshold <Badge variant="outline" className="text-[10px]">{config.similarityThreshold.toFixed(2)}</Badge>
            </legend>
            <p className="text-[11px] text-muted-foreground">Minimum cosine similarity to create an edge between nodes.</p>
            <input type="range" min={0.1} max={1} step={0.05} value={config.similarityThreshold} onChange={(e) => setConfig((prev) => ({ ...prev, similarityThreshold: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Similarity threshold" />
          </fieldset>

          {/* Max Tree Depth */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--foreground)] flex items-center justify-between">
              Max Tree Depth <Badge variant="outline" className="text-[10px]">{config.maxTreeDepth}</Badge>
            </legend>
            <p className="text-[11px] text-muted-foreground">Maximum depth for family tree traversal.</p>
            <input type="range" min={3} max={25} step={1} value={config.maxTreeDepth} onChange={(e) => setConfig((prev) => ({ ...prev, maxTreeDepth: Number(e.target.value) }))} className="w-full accent-primary" aria-label="Max tree depth" />
          </fieldset>

          {/* Cluster Algorithm */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--foreground)]">Cluster Algorithm</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cluster algorithm">
              {([
                { id: 'kmeans', label: 'K-Means' },
                { id: 'dbscan', label: 'DBSCAN' },
                { id: 'hierarchical', label: 'Hierarchical' },
              ] as const).map((alg) => (
                <button
                  key={alg.id}
                  role="radio"
                  aria-checked={config.clusterAlgorithm === alg.id}
                  onClick={() => setConfig((prev) => ({ ...prev, clusterAlgorithm: alg.id }))}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-xs font-medium min-h-[40px]',
                    'motion-safe:transition-colors',
                    config.clusterAlgorithm === alg.id
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                      : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]',
                  )}
                >
                  {alg.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Timeline Grouping */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--foreground)]">Timeline Grouping</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Timeline grouping">
              {([
                { id: 'hour', label: 'Hourly' },
                { id: 'day', label: 'Daily' },
                { id: 'week', label: 'Weekly' },
              ] as const).map((grp) => (
                <button
                  key={grp.id}
                  role="radio"
                  aria-checked={config.timelineGrouping === grp.id}
                  onClick={() => setConfig((prev) => ({ ...prev, timelineGrouping: grp.id }))}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-xs font-medium min-h-[40px]',
                    'motion-safe:transition-colors',
                    config.timelineGrouping === grp.id
                      ? 'border-[var(--bu-electric)] bg-[var(--bu-electric)]/10 text-[var(--bu-electric)]'
                      : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]',
                  )}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Toggle switches */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-[var(--foreground)]">Display Options</legend>

            {/* Show Orphan Nodes */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[var(--foreground)]">Show Orphan Nodes</p>
                <p className="text-[11px] text-muted-foreground">Display nodes with no parent or children.</p>
              </div>
              <button
                role="switch"
                aria-checked={config.showOrphanNodes}
                onClick={() => setConfig((prev) => ({ ...prev, showOrphanNodes: !prev.showOrphanNodes }))}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0',
                  'motion-safe:transition-colors',
                  config.showOrphanNodes ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]',
                )}
                aria-label="Show orphan nodes"
              >
                <span className={cn('inline-block h-4 w-4 rounded-full bg-white', 'motion-safe:transition-transform', config.showOrphanNodes ? 'translate-x-5' : 'translate-x-0.5')} aria-hidden="true" />
              </button>
            </div>

            {/* Highlight Critical */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[var(--foreground)]">Highlight Critical Nodes</p>
                <p className="text-[11px] text-muted-foreground">Add glow effect to critical severity nodes.</p>
              </div>
              <button
                role="switch"
                aria-checked={config.highlightCritical}
                onClick={() => setConfig((prev) => ({ ...prev, highlightCritical: !prev.highlightCritical }))}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0',
                  'motion-safe:transition-colors',
                  config.highlightCritical ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]',
                )}
                aria-label="Highlight critical nodes"
              >
                <span className={cn('inline-block h-4 w-4 rounded-full bg-white', 'motion-safe:transition-transform', config.highlightCritical ? 'translate-x-5' : 'translate-x-0.5')} aria-hidden="true" />
              </button>
            </div>
          </fieldset>

          {/* Embedding Model */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--foreground)]">Embedding Model</legend>
            <input
              type="text"
              value={config.embeddingModel}
              onChange={(e) => setConfig((prev) => ({ ...prev, embeddingModel: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]"
              aria-label="Embedding model name"
            />
            <p className="text-[11px] text-muted-foreground">Model used for computing attack embeddings.</p>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-[var(--border)]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] min-h-[44px]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--dojo-primary)] text-white text-sm font-medium hover:bg-[var(--dojo-hover)] min-h-[44px] motion-safe:transition-colors"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </button>
        </div>
      </div>
    </>
  )
}
