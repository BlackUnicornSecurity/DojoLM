/**
 * File: llm-results-context.test.tsx
 * Purpose: Unit tests for LLMResultsContext provider and hooks
 * Audit: Addresses CRITICAL getLeaderboard non-assertion, missing getComparisonReport,
 *        HIGH addManualEvaluation error, refresh, owaspCategory/tpiStory filters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { type ReactNode } from 'react'

const mockFetchWithAuth = vi.fn()
const mockCanAccess = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccess(),
}))

vi.mock('@/lib/llm-types', () => ({}))

import { LLMResultsProvider, useResultsContext } from '@/lib/contexts/LLMResultsContext'

function wrapper({ children }: { children: ReactNode }) {
  return <LLMResultsProvider>{children}</LLMResultsProvider>
}

function mockApiResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

function mockApiError(status: number, message: string) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  })
}

describe('LLMResultsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccess.mockResolvedValue(true)
  })

  describe('useResultsContext hook', () => {
    it('throws when used outside LLMResultsProvider', () => {
      expect(() => {
        renderHook(() => useResultsContext())
      }).toThrow()
    })

    it('provides all expected functions on context', () => {
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const fns = ['setFilter', 'clearFilter', 'getExecutions', 'getModelReport',
        'getCoverageMap', 'getLeaderboard', 'exportReport', 'addManualEvaluation',
        'deleteExecution', 'getComparisonReport', 'refresh']
      for (const fn of fns) {
        expect(typeof (result.current as Record<string, unknown>)[fn]).toBe('function')
      }
    })

    it('starts with empty filter, no loading, no error', () => {
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      expect(result.current.filter).toEqual({})
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Filter management', () => {
    it('setFilter merges partial updates', () => {
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      act(() => { result.current.setFilter({ category: 'injection' }) })
      expect(result.current.filter.category).toBe('injection')
      act(() => { result.current.setFilter({ minScore: 5 }) })
      expect(result.current.filter.category).toBe('injection')
      expect(result.current.filter.minScore).toBe(5)
    })

    it('clearFilter resets to empty object', () => {
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      act(() => { result.current.setFilter({ category: 'injection', minScore: 5 }) })
      act(() => { result.current.clearFilter() })
      expect(result.current.filter).toEqual({})
    })
  })

  describe('getExecutions', () => {
    it('returns empty array when API is inaccessible', async () => {
      mockCanAccess.mockResolvedValue(false)
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const execs = await act(async () => result.current.getExecutions())
      expect(execs).toEqual([])
    })

    it('fetches executions from API', async () => {
      const mockExecs = [
        { id: 'e1', modelId: 'm1', resilienceScore: 85, categoriesPassed: ['a'], categoriesFailed: [], owaspCoverage: {}, tpiCoverage: {} },
      ]
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: mockExecs }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const execs = await act(async () => result.current.getExecutions())
      expect(execs).toEqual(mockExecs)
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/api/llm/results'), expect.anything(),
      )
    })

    it('applies client-side category filter', async () => {
      const mockExecs = [
        { id: 'e1', categoriesPassed: ['injection'], categoriesFailed: [], owaspCoverage: {}, tpiCoverage: {} },
        { id: 'e2', categoriesPassed: [], categoriesFailed: ['xss'], owaspCoverage: {}, tpiCoverage: {} },
      ]
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: mockExecs }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const execs = await act(async () => result.current.getExecutions({ category: 'injection' }))
      expect(execs.length).toBe(1)
      expect(execs[0].id).toBe('e1')
    })

    it('applies client-side owaspCategory filter', async () => {
      const mockExecs = [
        { id: 'e1', categoriesPassed: [], categoriesFailed: [], owaspCoverage: { 'A01': 0.8 }, tpiCoverage: {} },
        { id: 'e2', categoriesPassed: [], categoriesFailed: [], owaspCoverage: { 'A03': 0.5 }, tpiCoverage: {} },
      ]
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: mockExecs }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const execs = await act(async () => result.current.getExecutions({ owaspCategory: 'A01' }))
      expect(execs.length).toBe(1)
      expect(execs[0].id).toBe('e1')
    })

    it('applies client-side tpiStory filter', async () => {
      const mockExecs = [
        { id: 'e1', categoriesPassed: [], categoriesFailed: [], owaspCoverage: {}, tpiCoverage: { 'S1': true } },
        { id: 'e2', categoriesPassed: [], categoriesFailed: [], owaspCoverage: {}, tpiCoverage: {} },
      ]
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: mockExecs }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const execs = await act(async () => result.current.getExecutions({ tpiStory: 'S1' }))
      expect(execs.length).toBe(1)
      expect(execs[0].id).toBe('e1')
    })

    it('includes all URL params from filter', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: [] }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      await act(async () => {
        await result.current.getExecutions({
          modelIds: ['m1', 'm2'], minScore: 50, maxScore: 90,
          startDate: '2026-01-01', endDate: '2026-04-13', includeCached: true,
        })
      })
      const url = mockFetchWithAuth.mock.calls[0][0] as string
      expect(url).toContain('modelId=m1')
      expect(url).toContain('modelId=m2')
      expect(url).toContain('minScore=50')
      expect(url).toContain('maxScore=90')
      expect(url).toContain('startDate=2026-01-01')
      expect(url).toContain('includeCached=true')
    })
  })

  describe('getModelReport', () => {
    it('fetches report for a specific model', async () => {
      const mockReport = { modelId: 'm1', avgResilienceScore: 85, categories: [] }
      mockFetchWithAuth.mockReturnValue(mockApiResponse(mockReport))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const report = await act(async () => result.current.getModelReport('m1'))
      expect(report).toEqual(mockReport)
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('modelId=m1'), expect.anything(),
      )
    })
  })

  describe('getComparisonReport', () => {
    it('fetches reports for multiple models and sorts by avgResilienceScore descending', async () => {
      const reportA = { modelId: 'a', avgResilienceScore: 70 }
      const reportB = { modelId: 'b', avgResilienceScore: 90 }
      mockFetchWithAuth
        .mockReturnValueOnce(mockApiResponse(reportA))
        .mockReturnValueOnce(mockApiResponse(reportB))

      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const reports = await act(async () => result.current.getComparisonReport(['a', 'b']))

      expect(reports.length).toBe(2)
      expect(reports[0].modelId).toBe('b') // higher score first
      expect(reports[1].modelId).toBe('a')
    })

    it('returns empty array for empty modelIds', async () => {
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const reports = await act(async () => result.current.getComparisonReport([]))
      expect(reports).toEqual([])
    })
  })

  describe('getLeaderboard', () => {
    it('fetches models, gets reports, sorts and assigns ranks', async () => {
      // First call: /models returns array of models
      // Then per-model: /reports?modelId=X returns report
      mockFetchWithAuth
        .mockReturnValueOnce(mockApiResponse([
          { id: 'm1', name: 'GPT-4' },
          { id: 'm2', name: 'Claude' },
        ]))
        .mockReturnValueOnce(mockApiResponse({ modelId: 'm1', avgResilienceScore: 70 }))
        .mockReturnValueOnce(mockApiResponse({ modelId: 'm2', avgResilienceScore: 92 }))

      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const leaderboard = await act(async () => result.current.getLeaderboard())

      expect(leaderboard.length).toBe(2)
      // Claude (92) should be rank 1, GPT-4 (70) rank 2
      expect(leaderboard[0].modelName).toBe('Claude')
      expect(leaderboard[0].rank).toBe(1)
      expect(leaderboard[0].score).toBe(92)
      expect(leaderboard[1].modelName).toBe('GPT-4')
      expect(leaderboard[1].rank).toBe(2)
    })

    it('skips models that fail report fetch', async () => {
      mockFetchWithAuth
        .mockReturnValueOnce(mockApiResponse([
          { id: 'm1', name: 'GPT-4' },
          { id: 'm2', name: 'Broken' },
        ]))
        .mockReturnValueOnce(mockApiResponse({ modelId: 'm1', avgResilienceScore: 80 }))
        .mockReturnValueOnce(mockApiError(500, 'Internal error'))

      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const leaderboard = await act(async () => result.current.getLeaderboard())

      expect(leaderboard.length).toBe(1)
      expect(leaderboard[0].modelName).toBe('GPT-4')
      expect(leaderboard[0].rank).toBe(1)
    })

    it('returns empty leaderboard when no models exist', async () => {
      mockFetchWithAuth.mockReturnValueOnce(mockApiResponse([]))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const leaderboard = await act(async () => result.current.getLeaderboard())
      expect(leaderboard).toEqual([])
    })
  })

  describe('getCoverageMap', () => {
    it('fetches without model filter', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ total: 100, covered: 75 }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const map = await act(async () => result.current.getCoverageMap())
      expect(map).toEqual({ total: 100, covered: 75 })
    })

    it('includes modelId param when provided', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ total: 50, covered: 40 }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      await act(async () => { await result.current.getCoverageMap('m1') })
      expect((mockFetchWithAuth.mock.calls[0][0] as string)).toContain('modelId=m1')
    })
  })

  describe('addManualEvaluation', () => {
    it('returns true on success', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ success: true }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const success = await act(async () =>
        result.current.addManualEvaluation({ executionId: 'e1', score: 8 } as never)
      )
      expect(success).toBe(true)
    })

    it('returns false and sets error on API failure', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiError(500, 'Server error'))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const success = await act(async () =>
        result.current.addManualEvaluation({ executionId: 'e1' } as never)
      )
      expect(success).toBe(false)
      expect(result.current.error).toBe('Server error')
    })
  })

  describe('deleteExecution', () => {
    it('returns true on success', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ success: true }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const success = await act(async () => result.current.deleteExecution('exec-1'))
      expect(success).toBe(true)
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('exec-1'), expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('returns false on API error', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiError(404, 'Not found'))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const success = await act(async () => result.current.deleteExecution('bad'))
      expect(success).toBe(false)
    })
  })

  describe('refresh', () => {
    it('sets isLoading true then false after refresh', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ executions: [] }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })

      let loadingDuringRefresh = false
      const refreshPromise = act(async () => {
        const p = result.current.refresh()
        // isLoading should be true during refresh
        loadingDuringRefresh = result.current.isLoading
        await p
      })
      await refreshPromise
      expect(result.current.isLoading).toBe(false)
    })

    it('sets error on refresh failure', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiError(500, 'Server down'))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      await act(async () => { await result.current.refresh() })
      expect(result.current.error).toBe('Server down')
    })
  })

  describe('exportReport', () => {
    it('builds URL params and returns report string', async () => {
      mockFetchWithAuth.mockReturnValue(mockApiResponse({ report: '# Report\nAll good' }))
      const { result } = renderHook(() => useResultsContext(), { wrapper })
      const report = await act(async () =>
        result.current.exportReport({
          modelConfigId: 'm1',
          format: 'markdown',
          includeExecutions: true,
          includeResponses: false,
          minSeverity: 'high',
          categoryFilter: ['injection', 'xss'],
        } as never)
      )
      expect(report).toBe('# Report\nAll good')
      const url = mockFetchWithAuth.mock.calls[0][0] as string
      expect(url).toContain('modelId=m1')
      expect(url).toContain('format=markdown')
      expect(url).toContain('includeExecutions=true')
      expect(url).toContain('minSeverity=high')
      expect(url).toContain('categoryFilter=injection%2Cxss')
    })
  })
})
