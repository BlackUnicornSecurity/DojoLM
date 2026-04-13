/**
 * File: behavioral-analysis-context.test.tsx
 * Purpose: Tests for BehavioralAnalysisContext
 * Epic: OBLITERATUS (OBL) — T0.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { BehavioralAnalysisProvider, useBehavioralAnalysis } from '../BehavioralAnalysisContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function wrapper({ children }: { children: ReactNode }) {
  return <BehavioralAnalysisProvider>{children}</BehavioralAnalysisProvider>
}

describe('BehavioralAnalysisContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useBehavioralAnalysis())
    }).toThrow('useBehavioralAnalysis must be used within BehavioralAnalysisProvider')
  })

  it('provides default state', () => {
    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })
    expect(result.current.results).toEqual({})
    expect(result.current.isAnalyzing).toBe(false)
    expect(result.current.activeModelId).toBeNull()
    expect(result.current.activeModelName).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('getResult returns null for unknown model', () => {
    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })
    expect(result.current.getResult('unknown-model')).toBeNull()
  })

  it('getActiveResult returns null when no active model', () => {
    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })
    expect(result.current.getActiveResult()).toBeNull()
  })

  it('setActiveModel updates activeModelId and activeModelName', () => {
    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })
    act(() => {
      result.current.setActiveModel('model-1', 'GPT-4')
    })
    expect(result.current.activeModelId).toBe('model-1')
    expect(result.current.activeModelName).toBe('GPT-4')
  })

  it('runAlignment fetches from correct endpoint and merges result', async () => {
    const mockAlignment = {
      methodProbabilities: { DPO: 0.7, RLHF: 0.2, CAI: 0.05, SFT: 0.03, unknown: 0.02 },
      confidence: 0.85,
      refusalSharpness: 0.9,
      principleReferencing: 0.3,
      evidenceProbes: ['obl-align-01'],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAlignment),
    })

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    await act(async () => {
      await result.current.runAlignment('model-1', 'GPT-4')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/llm/obl/alignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'model-1' }),
    })
    expect(result.current.activeModelId).toBe('model-1')
    expect(result.current.activeModelName).toBe('GPT-4')
    const res = result.current.getResult('model-1')
    expect(res?.alignment).toEqual(mockAlignment)
    expect(res?.schemaVersion).toBe(1)
    expect(result.current.isAnalyzing).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    await act(async () => {
      await result.current.runAlignment('model-1')
    })

    expect(result.current.error).toBe('Server error')
    expect(result.current.isAnalyzing).toBe(false)
  })

  it('persists results to localStorage on update', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ methodProbabilities: {}, confidence: 0.5, refusalSharpness: 0.5, principleReferencing: 0.1, evidenceProbes: [] }),
    })

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    await act(async () => {
      await result.current.runAlignment('model-1')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'obl-analysis-v1',
      expect.stringContaining('model-1'),
    )
  })

  it('loads cached results from localStorage on mount', () => {
    const cached = {
      'model-1': {
        schemaVersion: 1,
        modelId: 'model-1',
        timestamp: '2026-04-13T00:00:00Z',
        alignment: { methodProbabilities: { DPO: 1, RLHF: 0, CAI: 0, SFT: 0, unknown: 0 }, confidence: 0.9, refusalSharpness: 0.8, principleReferencing: 0.1, evidenceProbes: [] },
      },
    }
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cached))

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    expect(result.current.getResult('model-1')?.alignment?.confidence).toBe(0.9)
  })

  it('discards cached results with stale schemaVersion', () => {
    const stale = {
      'model-1': {
        schemaVersion: 0,
        modelId: 'model-1',
        timestamp: '2026-01-01T00:00:00Z',
      },
    }
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stale))

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    expect(result.current.getResult('model-1')).toBeNull()
  })

  it('merges multiple analysis types for same model', async () => {
    const alignment = { methodProbabilities: { DPO: 1, RLHF: 0, CAI: 0, SFT: 0, unknown: 0 }, confidence: 0.9, refusalSharpness: 0.8, principleReferencing: 0.1, evidenceProbes: [] }
    const robustness = { baselineRefusalRate: 0.95, pressuredRefusalRate: 0.6, recoveryRate: 0.8, degradationCurve: [0.95, 0.85, 0.7, 0.6], ouroboros: 0.75 }

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(alignment) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(robustness) })

    const { result } = renderHook(() => useBehavioralAnalysis(), { wrapper })

    await act(async () => {
      await result.current.runAlignment('model-1')
    })
    await act(async () => {
      await result.current.runRobustness('model-1')
    })

    const res = result.current.getResult('model-1')
    expect(res?.alignment).toEqual(alignment)
    expect(res?.robustness).toEqual(robustness)
  })
})
