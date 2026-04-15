/**
 * File: BehavioralAnalysisContext.tsx
 * Purpose: Shared context for OBL behavioral analysis results across ModelLab and Scanner surfaces
 * Epic: OBLITERATUS (OBL)
 * Index:
 * - BehavioralAnalysisContextValue interface (line 18)
 * - BehavioralAnalysisProvider component (line 38)
 * - useBehavioralAnalysis hook (line 145)
 */

'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import type { OBLAnalysisResult } from '../types'

const CACHE_KEY = 'obl-analysis-v1'
const ACTIVE_MODEL_KEY = 'obl-active-model'
const SCHEMA_VERSION = 1

interface BehavioralAnalysisContextValue {
  /** Cached analysis results keyed by modelId */
  readonly results: Readonly<Record<string, OBLAnalysisResult>>
  /** Whether any analysis is currently running */
  readonly isAnalyzing: boolean
  /** Currently active model ID (set by whichever surface last ran analysis) */
  readonly activeModelId: string | null
  /** Display name of the active model */
  readonly activeModelName: string | null
  /** Error from the last analysis attempt */
  readonly error: string | null
  /** Run alignment imprint analysis for a model */
  runAlignment: (modelId: string, modelName?: string) => Promise<void>
  /** Run defense robustness analysis for a model */
  runRobustness: (modelId: string, modelName?: string) => Promise<void>
  /** Run concept geometry analysis for a model */
  runGeometry: (modelId: string, modelName?: string) => Promise<void>
  /** Run refusal depth profile analysis for a model */
  runDepthProfile: (modelId: string, modelName?: string) => Promise<void>
  /** Get cached result for a specific model */
  getResult: (modelId: string) => OBLAnalysisResult | null
  /** Get cached result for the active model */
  getActiveResult: () => OBLAnalysisResult | null
  /** Set which model's OBL data is currently "active" */
  setActiveModel: (modelId: string, modelName: string) => void
}

const BehavioralAnalysisContext = createContext<BehavioralAnalysisContextValue | undefined>(undefined)

function loadCachedResults(): Record<string, OBLAnalysisResult> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, OBLAnalysisResult>
    // Discard stale schema versions
    const valid: Record<string, OBLAnalysisResult> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value.schemaVersion === SCHEMA_VERSION) {
        valid[key] = value
      }
    }
    return valid
  } catch {
    return {}
  }
}

function loadActiveModel(): { id: string | null; name: string | null } {
  if (typeof window === 'undefined') return { id: null, name: null }
  try {
    const raw = localStorage.getItem(ACTIVE_MODEL_KEY)
    if (!raw) return { id: null, name: null }
    return JSON.parse(raw)
  } catch {
    return { id: null, name: null }
  }
}

export function BehavioralAnalysisProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Record<string, OBLAnalysisResult>>(loadCachedResults)
  const [analyzingCount, setAnalyzingCount] = useState(0)
  const isAnalyzing = analyzingCount > 0
  const [activeModel] = useState(() => loadActiveModel())
  const [activeModelId, setActiveModelId] = useState<string | null>(activeModel.id)
  const [activeModelName, setActiveModelName] = useState<string | null>(activeModel.name)
  const [error, setError] = useState<string | null>(null)

  // Persist results to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(results))
    } catch {
      // localStorage quota exceeded — non-critical
    }
  }, [results])

  // Persist active model to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_MODEL_KEY, JSON.stringify({ id: activeModelId, name: activeModelName }))
    } catch {
      // non-critical
    }
  }, [activeModelId, activeModelName])

  const mergeResult = useCallback((modelId: string, partial: Partial<OBLAnalysisResult>) => {
    setResults(prev => {
      const existing = prev[modelId]
      const merged: OBLAnalysisResult = {
        ...existing,
        ...partial,
        modelId,
        timestamp: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
      }
      return { ...prev, [modelId]: merged }
    })
  }, [])

  const runAnalysis = useCallback(async (
    endpoint: string,
    resultKey: keyof OBLAnalysisResult,
    modelId: string,
    modelName?: string,
  ) => {
    setAnalyzingCount(c => c + 1)
    setError(null)
    setActiveModelId(modelId)
    if (modelName) setActiveModelName(modelName)
    try {
      const res = await fetch(`/api/llm/obl/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `Analysis failed (${res.status})`)
      }
      const data = await res.json()
      mergeResult(modelId, { [resultKey]: data })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzingCount(c => c - 1)
    }
  }, [mergeResult])

  const runAlignment = useCallback(
    (modelId: string, modelName?: string) => runAnalysis('alignment', 'alignment', modelId, modelName),
    [runAnalysis],
  )

  const runRobustness = useCallback(
    (modelId: string, modelName?: string) => runAnalysis('robustness', 'robustness', modelId, modelName),
    [runAnalysis],
  )

  const runGeometry = useCallback(
    (modelId: string, modelName?: string) => runAnalysis('geometry', 'geometry', modelId, modelName),
    [runAnalysis],
  )

  const runDepthProfile = useCallback(
    (modelId: string, modelName?: string) => runAnalysis('depth', 'refusalDepth', modelId, modelName),
    [runAnalysis],
  )

  const getResult = useCallback(
    (modelId: string): OBLAnalysisResult | null => results[modelId] ?? null,
    [results],
  )

  const getActiveResult = useCallback(
    (): OBLAnalysisResult | null => activeModelId ? results[activeModelId] ?? null : null,
    [activeModelId, results],
  )

  const setActiveModel = useCallback((modelId: string, modelName: string) => {
    setActiveModelId(modelId)
    setActiveModelName(modelName)
  }, [])

  const value = useMemo<BehavioralAnalysisContextValue>(() => ({
    results,
    isAnalyzing,
    activeModelId,
    activeModelName,
    error,
    runAlignment,
    runRobustness,
    runGeometry,
    runDepthProfile,
    getResult,
    getActiveResult,
    setActiveModel,
  }), [results, isAnalyzing, activeModelId, activeModelName, error, runAlignment, runRobustness, runGeometry, runDepthProfile, getResult, getActiveResult, setActiveModel])

  return (
    <BehavioralAnalysisContext.Provider value={value}>
      {children}
    </BehavioralAnalysisContext.Provider>
  )
}

/** Access OBL behavioral analysis context */
export function useBehavioralAnalysis(): BehavioralAnalysisContextValue {
  const context = useContext(BehavioralAnalysisContext)
  if (!context) {
    throw new Error('useBehavioralAnalysis must be used within BehavioralAnalysisProvider')
  }
  return context
}
