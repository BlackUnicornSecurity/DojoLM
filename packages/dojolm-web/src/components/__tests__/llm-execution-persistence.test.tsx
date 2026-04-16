/**
 * File: llm-execution-persistence.test.tsx
 * Purpose: Tests for H1.5 — LLM test progress persistence via sessionStorage
 * Verifies:
 *   - Active batch stored in sessionStorage on start
 *   - Cleared on completion
 *   - Reconnection attempted on mount if batch exists
 *   - Batch ID validation (security)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock sessionStorage
const mockStorage = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
})

// Mock fetchWithAuth — needed by LLMExecutionContext
const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

// Mock useModelContext for TestExecution
vi.mock('@/lib/contexts/LLMModelContext', () => ({
  useModelContext: () => ({
    models: [],
    getEnabledModels: () => [],
  }),
}))

// Import after mocks
import {
  LLMExecutionProvider,
  resetExecutionStateCache,
  useExecutionContext,
} from '@/lib/contexts/LLMExecutionContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default API responses for refreshState calls */
function mockDefaultApiResponses() {
  mockFetchWithAuth.mockImplementation((url: string) => {
    if (url.includes('/batch?status=')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ batches: [] }),
        text: () => Promise.resolve(''),
      })
    }
    if (url.includes('/results?limit=')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ executions: [] }),
        text: () => Promise.resolve(''),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  })
}

/** Test consumer that exposes context state */
function TestConsumer() {
  const ctx = useExecutionContext()

  return (
    <div>
      <div data-testid="active-batch-id">{ctx.activeBatchId ?? 'null'}</div>
      <div data-testid="reconnecting-batch-id">{ctx.reconnectingBatchId ?? 'null'}</div>
      <button
        data-testid="set-batch"
        onClick={() => ctx.setActiveBatch('test-batch-123')}
      />
      <button
        data-testid="set-invalid-batch"
        onClick={() => ctx.setActiveBatch('../../invalid<script>')}
      />
      <button
        data-testid="clear-batch"
        onClick={() => ctx.clearActiveBatch()}
      />
    </div>
  )
}

function renderWithProvider() {
  return render(
    <LLMExecutionProvider>
      <TestConsumer />
    </LLMExecutionProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStorage.clear()
  mockFetchWithAuth.mockReset()
  resetExecutionStateCache()
  mockDefaultApiResponses()
})

describe('LLM Execution Persistence (H1.5)', () => {
  describe('setActiveBatch', () => {
    it('stores batch ID in sessionStorage on set', async () => {
      renderWithProvider()

      // Wait for initial load to settle
      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-batch'))
      })

      expect(screen.getByTestId('active-batch-id')).toHaveTextContent('test-batch-123')
      expect(mockStorage.get('llm-active-batch')).toBe('"test-batch-123"')
    })

    it('rejects invalid batch IDs', async () => {
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-invalid-batch'))
      })

      // Should remain null — invalid ID rejected
      expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      expect(mockStorage.has('llm-active-batch')).toBe(false)
    })
  })

  describe('clearActiveBatch', () => {
    it('removes batch ID from sessionStorage on clear', async () => {
      // Pre-populate storage
      mockStorage.set('llm-active-batch', 'test-batch-123')

      renderWithProvider()

      // Wait for hydration (may set from storage)
      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('test-batch-123')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-batch'))
      })

      expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      expect(mockStorage.has('llm-active-batch')).toBe(false)
    })
  })

  describe('shared refresh state cache', () => {
    it('deduplicates concurrent initial refreshes across providers', async () => {
      render(
        <>
          <LLMExecutionProvider>
            <TestConsumer />
          </LLMExecutionProvider>
          <LLMExecutionProvider>
            <TestConsumer />
          </LLMExecutionProvider>
        </>
      )

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('hydration on mount', () => {
    it('loads active batch ID from sessionStorage and attempts reconnection for running batch', async () => {
      // Pre-populate storage with a valid batch ID
      mockStorage.set('llm-active-batch', 'running-batch-42')

      // Mock the batch status check to return a running batch
      mockFetchWithAuth.mockImplementation((url: string) => {
        if (url.includes('/batch/running-batch-42')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              batch: {
                id: 'running-batch-42',
                status: 'running',
                totalTests: 10,
                completedTests: 3,
                failedTests: 0,
              },
            }),
            text: () => Promise.resolve(''),
          })
        }
        if (url.includes('/batch?status=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ batches: [] }),
            text: () => Promise.resolve(''),
          })
        }
        if (url.includes('/results?limit=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ executions: [] }),
            text: () => Promise.resolve(''),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        })
      })

      renderWithProvider()

      // Should hydrate activeBatchId and set reconnectingBatchId
      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('running-batch-42')
      })

      await waitFor(() => {
        expect(screen.getByTestId('reconnecting-batch-id')).toHaveTextContent('running-batch-42')
      })
    })

    it('clears storage when stored batch is completed', async () => {
      // Pre-populate storage with a completed batch
      mockStorage.set('llm-active-batch', 'done-batch-99')

      mockFetchWithAuth.mockImplementation((url: string) => {
        if (url.includes('/batch/done-batch-99')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              batch: {
                id: 'done-batch-99',
                status: 'completed',
                totalTests: 10,
                completedTests: 10,
                failedTests: 0,
              },
            }),
            text: () => Promise.resolve(''),
          })
        }
        if (url.includes('/batch?status=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ batches: [] }),
            text: () => Promise.resolve(''),
          })
        }
        if (url.includes('/results?limit=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ executions: [] }),
            text: () => Promise.resolve(''),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        })
      })

      renderWithProvider()

      // Should clear since batch is completed
      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      expect(mockStorage.has('llm-active-batch')).toBe(false)
    })

    it('clears storage when batch lookup returns 404', async () => {
      mockStorage.set('llm-active-batch', 'ghost-batch')

      mockFetchWithAuth.mockImplementation((url: string) => {
        if (url.includes('/batch/ghost-batch')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('Not found'),
          })
        }
        if (url.includes('/batch?status=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ batches: [] }),
            text: () => Promise.resolve(''),
          })
        }
        if (url.includes('/results?limit=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ executions: [] }),
            text: () => Promise.resolve(''),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        })
      })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      expect(mockStorage.has('llm-active-batch')).toBe(false)
    })

    it('ignores invalid batch IDs in sessionStorage', async () => {
      // Store an invalid batch ID
      mockStorage.set('llm-active-batch', '<script>alert(1)</script>')

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      // Should not have attempted to fetch the invalid batch
      const batchCalls = mockFetchWithAuth.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/batch/') && !(c[0] as string).includes('status=')
      )
      expect(batchCalls).toHaveLength(0)
    })
  })

  describe('batch ID validation', () => {
    it('accepts valid batch IDs', async () => {
      renderWithProvider()
      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      // Valid: alphanumeric, hyphens, underscores
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-batch'))
      })
      expect(screen.getByTestId('active-batch-id')).toHaveTextContent('test-batch-123')
    })

    it('rejects batch IDs exceeding 64 characters', async () => {
      // We need a custom consumer for this
      function LongIdConsumer() {
        const ctx = useExecutionContext()
        return (
          <div>
            <div data-testid="active-batch-id">{ctx.activeBatchId ?? 'null'}</div>
            <button
              data-testid="set-long-batch"
              onClick={() => ctx.setActiveBatch('a'.repeat(65))}
            />
          </div>
        )
      }

      render(
        <LLMExecutionProvider>
          <LongIdConsumer />
        </LLMExecutionProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-long-batch'))
      })

      expect(screen.getByTestId('active-batch-id')).toHaveTextContent('null')
    })
  })
})
