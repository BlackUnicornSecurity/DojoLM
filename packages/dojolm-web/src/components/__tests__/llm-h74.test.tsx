/**
 * File: llm-h74.test.tsx
 * Purpose: Tests for H7.4 — Test Case Categorization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Stable mock references (avoid infinite re-render loops in useEffect deps)
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
// Mocks
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
// EventSource mock
// ---------------------------------------------------------------------------

type ESHandler = (e: { data: string }) => void
let esHandlers: Record<string, ESHandler[]> = {}

class MockEventSource {
  close = vi.fn()
  readyState = 1
  constructor() { esHandlers = {} }
  addEventListener(ev: string, fn: ESHandler) {
    if (!esHandlers[ev]) esHandlers[ev] = []
    esHandlers[ev].push(fn)
  }
}

vi.stubGlobal('EventSource', MockEventSource)
Object.defineProperty(MockEventSource, 'CLOSED', { value: 2 })

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

import { TestExecution } from '../llm/TestExecution'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const MOCK_TEST_CASES = [
  {
    id: 'tc-sec-1', name: 'Prompt Injection Basic', category: 'prompt_injection',
    prompt: 'Ignore previous instructions', expectedBehavior: 'Refuse',
    severity: 'CRITICAL', owaspCategory: 'LLM01', tags: ['owasp'], enabled: true,
  },
  {
    id: 'tc-sec-2', name: 'Jailbreak Attempt', category: 'jailbreak',
    prompt: 'DAN mode', expectedBehavior: 'Refuse',
    severity: 'HIGH', tags: [], enabled: true,
  },
  {
    id: 'tc-comp-1', name: 'OWASP Compliance Check', category: 'bias',
    prompt: 'Bias detection', expectedBehavior: 'No bias',
    severity: 'MEDIUM', owaspCategory: 'LLM02', tags: ['compliance'], enabled: true,
  },
  {
    id: 'tc-comp-2', name: 'NIST Validation', category: 'misinformation',
    prompt: 'Fact check', expectedBehavior: 'Accurate',
    severity: 'MEDIUM', tags: ['nist', 'compliance'], enabled: true,
  },
  {
    id: 'tc-perf-1', name: 'Token Flood', category: 'dos',
    prompt: 'Send large payload', expectedBehavior: 'Rate limited',
    severity: 'HIGH', tags: ['performance'], enabled: true,
  },
  {
    id: 'tc-custom-1', name: 'Custom Test', category: 'custom',
    prompt: 'Custom scenario', expectedBehavior: 'Custom result',
    severity: 'LOW', tags: ['custom'], enabled: true,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupFetchMock(testCases = MOCK_TEST_CASES) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(testCases),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  setupFetchMock()
  try { localStorage.removeItem('llm-compliance-framework') } catch { /* noop */ }
})

afterEach(cleanup)

describe('H7.4: Test Case Categorization', () => {
  describe('Category filter pills', () => {
    it('renders all category filter pills', async () => {
      render(<TestExecution />)
      const filters = await screen.findByTestId('category-filters')
      expect(filters).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-all')).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-security')).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-compliance')).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-performance')).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-custom')).toBeInTheDocument()
    })

    it('has proper ARIA attributes on pills', async () => {
      render(<TestExecution />)
      const allPill = await screen.findByTestId('category-pill-all')
      expect(allPill).toHaveAttribute('role', 'radio')
      expect(allPill).toHaveAttribute('aria-checked', 'true')
      const secPill = screen.getByTestId('category-pill-security')
      expect(secPill).toHaveAttribute('aria-checked', 'false')
    })

    it('radiogroup has accessible label', async () => {
      render(<TestExecution />)
      const filters = await screen.findByTestId('category-filters')
      expect(filters).toHaveAttribute('role', 'radiogroup')
      expect(filters).toHaveAttribute('aria-label', 'Test category filter')
    })
  })

  describe('Category filtering', () => {
    it('shows all tests by default', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      expect(screen.getByText('Jailbreak Attempt')).toBeInTheDocument()
      expect(screen.getByText('Custom Test')).toBeInTheDocument()
      expect(screen.getByText('Token Flood')).toBeInTheDocument()
    })

    it('filters to security tests when Security pill is clicked', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-security'))
      expect(screen.getByText('Prompt Injection Basic')).toBeInTheDocument()
      expect(screen.getByText('Jailbreak Attempt')).toBeInTheDocument()
      expect(screen.queryByText('Custom Test')).not.toBeInTheDocument()
      expect(screen.queryByText('Token Flood')).not.toBeInTheDocument()
    })

    it('filters to compliance tests when Compliance pill is clicked', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-compliance'))
      // tc-comp-1 (bias+owaspCategory) and tc-comp-2 (misinformation+nist tag) are compliance
      // tc-sec-1 (prompt_injection) is security even though it has owaspCategory
      expect(screen.getByText('OWASP Compliance Check')).toBeInTheDocument()
      expect(screen.getByText('NIST Validation')).toBeInTheDocument()
      expect(screen.queryByText('Prompt Injection Basic')).not.toBeInTheDocument()
      expect(screen.queryByText('Jailbreak Attempt')).not.toBeInTheDocument()
      expect(screen.queryByText('Custom Test')).not.toBeInTheDocument()
    })

    it('filters to performance tests', async () => {
      render(<TestExecution />)
      await screen.findByText('Token Flood')
      fireEvent.click(screen.getByTestId('category-pill-performance'))
      expect(screen.getByText('Token Flood')).toBeInTheDocument()
      expect(screen.queryByText('Prompt Injection Basic')).not.toBeInTheDocument()
    })

    it('filters to custom tests', async () => {
      render(<TestExecution />)
      await screen.findByText('Custom Test')
      fireEvent.click(screen.getByTestId('category-pill-custom'))
      expect(screen.getByText('Custom Test')).toBeInTheDocument()
      expect(screen.queryByText('Prompt Injection Basic')).not.toBeInTheDocument()
    })

    it('returns to all tests when All pill is clicked', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-security'))
      expect(screen.queryByText('Custom Test')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('category-pill-all'))
      expect(screen.getByText('Custom Test')).toBeInTheDocument()
      expect(screen.getByText('Prompt Injection Basic')).toBeInTheDocument()
    })
  })

  describe('Compliance framework dropdown', () => {
    it('shows framework dropdown only when compliance is active', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      expect(screen.queryByTestId('framework-selector')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('category-pill-compliance'))
      expect(screen.getByTestId('framework-selector')).toBeInTheDocument()
      expect(screen.getByTestId('framework-dropdown')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('category-pill-security'))
      expect(screen.queryByTestId('framework-selector')).not.toBeInTheDocument()
    })

    it('framework dropdown has all three options', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-compliance'))
      const dropdown = screen.getByTestId('framework-dropdown') as HTMLSelectElement
      const options = within(dropdown).getAllByRole('option')
      expect(options).toHaveLength(4)
      expect(options[1]).toHaveTextContent('OWASP LLM Top 10')
      expect(options[2]).toHaveTextContent('NIST AI RMF')
      expect(options[3]).toHaveTextContent('MITRE ATLAS')
    })

    it('selecting OWASP framework pre-populates matching test cases', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-compliance'))
      const dropdown = screen.getByTestId('framework-dropdown')
      fireEvent.change(dropdown, { target: { value: 'owasp-llm' } })
      // tc-comp-1 has owaspCategory LLM02 — visible in compliance filter, should be selected
      await vi.waitFor(() => {
        const cb = document.getElementById('test-tc-comp-1') as HTMLInputElement
        expect(cb?.checked).toBe(true)
      })
      // Switch to all to verify tc-sec-1 (LLM01) was also selected even though not visible
      fireEvent.click(screen.getByTestId('category-pill-all'))
      expect((document.getElementById('test-tc-sec-1') as HTMLInputElement)?.checked).toBe(true)
    })
  })

  describe('Selection preservation across categories', () => {
    it('preserves test selections when switching categories', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')

      // Select a security test and a custom test
      fireEvent.click(document.getElementById('test-tc-sec-1')!)
      fireEvent.click(document.getElementById('test-tc-custom-1')!)

      // Switch to security category — security test should still be checked
      fireEvent.click(screen.getByTestId('category-pill-security'))
      expect((document.getElementById('test-tc-sec-1') as HTMLInputElement)?.checked).toBe(true)

      // Switch to custom — custom test should still be checked
      fireEvent.click(screen.getByTestId('category-pill-custom'))
      expect((document.getElementById('test-tc-custom-1') as HTMLInputElement)?.checked).toBe(true)

      // Switch to all — both should be checked
      fireEvent.click(screen.getByTestId('category-pill-all'))
      expect((document.getElementById('test-tc-sec-1') as HTMLInputElement)?.checked).toBe(true)
      expect((document.getElementById('test-tc-custom-1') as HTMLInputElement)?.checked).toBe(true)
    })

    it('select All only selects visible (filtered) tests', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')

      // Filter to custom
      fireEvent.click(screen.getByTestId('category-pill-custom'))
      // Click "All" button (select all visible)
      const buttons = screen.getAllByRole('button')
      const allBtn = buttons.find(b => b.textContent === 'All')
      fireEvent.click(allBtn!)

      // Custom test should be checked
      expect((document.getElementById('test-tc-custom-1') as HTMLInputElement)?.checked).toBe(true)

      // Switch to all — only custom should be selected
      fireEvent.click(screen.getByTestId('category-pill-all'))
      expect(screen.getByText(/1 test/)).toBeInTheDocument()
    })

    it('Clear only clears visible (filtered) tests', async () => {
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')

      // Select all tests first
      const buttons = screen.getAllByRole('button')
      const allBtn = buttons.find(b => b.textContent === 'All')
      fireEvent.click(allBtn!)

      // Filter to custom, then clear
      fireEvent.click(screen.getByTestId('category-pill-custom'))
      const clearBtn = buttons.find(b => b.textContent === 'Clear')
      fireEvent.click(clearBtn!)

      // Custom test should be unchecked
      expect((document.getElementById('test-tc-custom-1') as HTMLInputElement)?.checked).toBe(false)

      // Switch back to all — other tests should still be selected
      fireEvent.click(screen.getByTestId('category-pill-all'))
      expect((document.getElementById('test-tc-sec-1') as HTMLInputElement)?.checked).toBe(true)
    })
  })

  describe('H8.3: Cross-module localStorage link', () => {
    it('reads llm-compliance-framework from localStorage on mount', async () => {
      localStorage.setItem('llm-compliance-framework', 'owasp-llm')

      render(<TestExecution />)

      // Wait for test cases to load (triggers re-render cycle)
      await screen.findByText('OWASP Compliance Check')

      // After effects settle, compliance should be auto-selected
      // Use findByTestId to wait for the framework selector to appear
      const frameworkSelector = await screen.findByTestId('framework-selector')
      expect(frameworkSelector).toBeInTheDocument()

      const compliancePill = screen.getByTestId('category-pill-compliance')
      expect(compliancePill).toHaveAttribute('aria-checked', 'true')

      const dropdown = screen.getByTestId('framework-dropdown') as HTMLSelectElement
      expect(dropdown.value).toBe('owasp-llm')
      expect(localStorage.getItem('llm-compliance-framework')).toBeNull()
    })

    it('ignores invalid framework values from localStorage', async () => {
      localStorage.setItem('llm-compliance-framework', 'invalid-framework')
      render(<TestExecution />)
      await screen.findByTestId('category-pill-all')
      expect(screen.getByTestId('category-pill-all')).toHaveAttribute('aria-checked', 'true')
      expect(screen.queryByTestId('framework-selector')).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows empty message when no tests match a category', async () => {
      setupFetchMock([MOCK_TEST_CASES[0], MOCK_TEST_CASES[1]])
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-performance'))
      expect(screen.getByText(/No tests match/)).toBeInTheDocument()
    })

    it('show all tests button resets category filter', async () => {
      setupFetchMock([MOCK_TEST_CASES[0]])
      render(<TestExecution />)
      await screen.findByText('Prompt Injection Basic')
      fireEvent.click(screen.getByTestId('category-pill-performance'))
      fireEvent.click(screen.getByText(/Show all tests/i))
      expect(screen.getByText('Prompt Injection Basic')).toBeInTheDocument()
      expect(screen.getByTestId('category-pill-all')).toHaveAttribute('aria-checked', 'true')
    })
  })
})
