/**
 * File: AmaterasuConfig.tsx
 * Purpose: Configuration panel for Amaterasu DNA module (uses generic ConfigPanel)
 * Story: TPI-NODA-6.4 / NODA-3 Story 9.2 — ConfigPanel migration
 * Index:
 * - STORAGE_KEY + validation constants (line 14)
 * - AmaterasuConfigData interface (line 19)
 * - DEFAULT_CONFIG (line 29)
 * - loadConfig / saveConfig helpers (line 39)
 * - CONFIG_SECTIONS definition (line 66)
 * - AmaterasuConfig component (line 120)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'

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

// --- ConfigPanel sections ---

const CONFIG_SECTIONS: ConfigSection[] = [
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
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
