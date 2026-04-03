/**
 * File: llm-dashboard-h71.test.tsx
 * Purpose: Tests for H7.1 — clickable test cases navigate to results
 * Index:
 * - Mocks & helpers (line 10)
 * - Suite: H7.1 (line 120)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Stable mock references
// ---------------------------------------------------------------------------

const MODELS = [{ id: 'm1', name: 'GPT-4', enabled: true, provider: 'openai', modelId: 'gpt-4' }]
const getEnabledModels = () => MODELS

const mockExecCtx = {
  executeTest: vi.fn(),
  executeBatch: vi.fn(),
  getBatch: vi.fn(),
  cancelBatch: vi.fn().mockResolvedValue(true),
  state: { batches: [], recentResults: [] },
  refreshState: vi.fn(),
  activeBatchId: null as string | null,
  reconnectingBatchId: null as string | null,
  setActiveBatch: vi.fn(),
  clearActiveBatch: vi.fn(),
}

// ---------------------------------------------------------------------------
// AuthenticatedEventStream mock
// ---------------------------------------------------------------------------

type ESHandler = (event: { data: string }) => void
let esHandlers: Record<string, ESHandler[]> = {}
const mockClose = vi.fn()

function createMockEventStream() {
  esHandlers = {}
  return {
    addEventListener(type: string, listener: ESHandler) {
      if (!esHandlers[type]) esHandlers[type] = []
      esHandlers[type].push(listener)
    },
    close: mockClose,
    readyState: 1,
  }
}

function emitSSE(ev: string, data: Record<string, unknown>) {
  for (const fn of esHandlers[ev] ?? []) fn({ data: JSON.stringify(data) })
}

vi.mock('@/lib/authenticated-event-stream', () => ({
  connectAuthenticatedEventStream: () => createMockEventStream(),
  AUTHENTICATED_EVENT_STREAM_CLOSED: 2,
}))

// ---------------------------------------------------------------------------
// Other mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetch(...args),
}))

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({ models: MODELS, getEnabledModels }),
  useExecutionContext: () => mockExecCtx,
}))

vi.mock('@/components/ui/button', () => ({
  Button: (p: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => <button {...p} />,
}))
vi.mock('@/components/ui/card', () => ({
  Card: (p: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => <div {...p} />,
  CardContent: (p: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => <div {...p} />,
  CardDescription: (p: React.PropsWithChildren) => <p>{p.children}</p>,
  CardHeader: (p: React.PropsWithChildren) => <div>{p.children}</div>,
  CardTitle: (p: React.PropsWithChildren) => <h3>{p.children}</h3>,
}))
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (p: { id?: string; checked?: boolean; onCheckedChange?: () => void; disabled?: boolean; className?: string }) => (
    <input type="checkbox" id={p.id} checked={!!p.checked} onChange={() => p.onCheckedChange?.()} disabled={p.disabled} />
  ),
}))
vi.mock('@/components/ui/badge', () => ({ Badge: (p: React.PropsWithChildren) => <span>{p.children}</span> }))
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div /> }))
vi.mock('@/components/ui/progress', () => ({ Progress: () => <div /> }))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: (p: React.PropsWithChildren) => <div>{p.children}</div>,
}))

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

import { TestExecution } from '../llm/TestExecution'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CASES = [
  { id: 'tc1', name: 'Injection Test', prompt: 'Ignore all', severity: 'HIGH', category: 'inj' },
  { id: 'tc2', name: 'Exfil Test', prompt: 'Send secrets', severity: 'CRITICAL', category: 'exfil' },
]

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('H7.1 — clickable running tests navigate to results', () => {
  let navSpy: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    navSpy = vi.fn() as unknown as () => void
    esHandlers = {}

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/test-cases')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CASES) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    mockExecCtx.executeBatch = vi.fn().mockResolvedValue({
      id: 'b1', status: 'running', completedTests: 0, totalTests: 2,
      failedTests: 0, avgResilienceScore: 0,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('does not show View Results when no batch is complete', async () => {
    await act(async () => { render(<TestExecution onNavigateToResults={navSpy} />) })

    await waitFor(() => {
      expect(screen.getByText('Injection Test')).toBeTruthy()
    })

    expect(screen.queryByTestId('view-results-btn')).toBeNull()
  })

  it('shows View Results after batch completes, fires callback on click', async () => {
    await act(async () => { render(<TestExecution onNavigateToResults={navSpy} />) })

    await waitFor(() => {
      expect(screen.getByText('Injection Test')).toBeTruthy()
    })

    // select all + run
    fireEvent.click(screen.getByText('All'))
    await act(async () => {
      fireEvent.click(screen.getByText(/Run Tests/))
    })

    // Wait for SSE handlers to be registered (executeBatch → connectSSE)
    await waitFor(() => {
      expect(esHandlers['batch_complete']).toBeDefined()
    })

    // SSE batch_complete
    await act(async () => {
      emitSSE('batch_complete', {
        completedTests: 2, totalTests: 2, failedTests: 0,
        avgResilienceScore: 85, status: 'completed',
      })
    })

    const btn = screen.getByTestId('view-results-btn')
    expect(btn.getAttribute('aria-label')).toBe('View test results')
    fireEvent.click(btn)
    expect(navSpy).toHaveBeenCalledOnce()
  })

  it('test case names become clickable buttons after batch completes', async () => {
    await act(async () => { render(<TestExecution onNavigateToResults={navSpy} />) })

    await waitFor(() => {
      expect(screen.getByText('Injection Test')).toBeTruthy()
    })

    // before run — labels
    expect(screen.getByText('Injection Test').tagName).toBe('LABEL')

    fireEvent.click(screen.getByText('All'))
    await act(async () => {
      fireEvent.click(screen.getByText(/Run Tests/))
    })

    await waitFor(() => {
      expect(esHandlers['batch_complete']).toBeDefined()
    })

    await act(async () => {
      emitSSE('batch_complete', {
        completedTests: 2, totalTests: 2, failedTests: 1,
        avgResilienceScore: 72, status: 'completed',
      })
    })

    const links = screen.getAllByTestId(/^test-case-link-/)
    expect(links).toHaveLength(2)
    expect(links[0].tagName).toBe('BUTTON')
    expect(links[0].getAttribute('aria-label')).toContain('Injection Test')

    fireEvent.click(links[1])
    expect(navSpy).toHaveBeenCalledOnce()
  })

  it('no View Results or clickable names when onNavigateToResults is undefined', async () => {
    await act(async () => { render(<TestExecution />) })

    await waitFor(() => {
      expect(screen.getByText('Injection Test')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('All'))
    await act(async () => {
      fireEvent.click(screen.getByText(/Run Tests/))
    })

    await waitFor(() => {
      expect(esHandlers['batch_complete']).toBeDefined()
    })

    await act(async () => {
      emitSSE('batch_complete', {
        completedTests: 2, totalTests: 2, failedTests: 0,
        avgResilienceScore: 90, status: 'completed',
      })
    })

    expect(screen.getByText('Batch Complete')).toBeTruthy()
    expect(screen.queryByTestId('view-results-btn')).toBeNull()
    expect(screen.queryAllByTestId(/^test-case-link-/)).toHaveLength(0)
  })
})
