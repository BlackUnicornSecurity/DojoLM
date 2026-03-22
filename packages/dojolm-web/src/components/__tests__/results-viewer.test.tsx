/**
 * File: results-viewer.test.tsx
 * Purpose: Unit tests for K6.6 Results Viewer + K6.7 Export features in ValidationManager
 * Test IDs: VR-001 to VR-022
 *
 * Tests cover:
 * - Results viewer: module expansion, confusion matrix, metrics, uncertainty, decision rules
 * - Non-conformity list: filters (type, module, search), display
 * - Traceability viewer: expand/collapse, environment display
 * - Export buttons: JSON, CSV, Markdown download triggers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('lucide-react', () => ({
  PlayCircle: (props: Record<string, unknown>) => <span data-testid="icon-play" {...props} />,
  PauseCircle: (props: Record<string, unknown>) => <span data-testid="icon-pause" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => <span data-testid="icon-check" {...props} />,
  XCircle: (props: Record<string, unknown>) => <span data-testid="icon-x" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <span data-testid="icon-refresh" {...props} />,
  Clock: (props: Record<string, unknown>) => <span data-testid="icon-clock" {...props} />,
  Shield: (props: Record<string, unknown>) => <span data-testid="icon-shield" {...props} />,
  FileText: (props: Record<string, unknown>) => <span data-testid="icon-file" {...props} />,
  Download: (props: Record<string, unknown>) => <span data-testid="icon-download" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <span data-testid="icon-chevron-down" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <span data-testid="icon-chevron-right" {...props} />,
  Eye: (props: Record<string, unknown>) => <span data-testid="icon-eye" {...props} />,
  Search: (props: Record<string, unknown>) => <span data-testid="icon-search" {...props} />,
  Link2: (props: Record<string, unknown>) => <span data-testid="icon-link" {...props} />,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: { children: React.ReactNode }) => <h3 data-testid="card-title" {...props}>{children}</h3>,
  CardContent: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="card-content" {...props}>{children}</div>,
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_RUNS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    date: '2026-03-21T10:00:00Z',
    status: 'FAIL' as const,
    durationMs: 60000,
    modules: ['prompt-injection'],
    nonConformities: 2,
  },
]

const MOCK_REPORT = {
  report_available: true,
  run_id: '11111111-1111-1111-1111-111111111111',
  report_id: 'rpt-001',
  generated_at: '2026-03-21T10:30:00Z',
  overall_verdict: 'FAIL',
  non_conformity_count: 2,
  corpus_version: 'abc123def456',
  tool_version: 'v2.0.0-build',
  environment: {
    os_platform: 'darwin',
    node_version: '20.11.0',
    git_hash: 'abc123',
  },
  modules: [
    {
      module_id: 'prompt-injection',
      tier: 1,
      matrix: { tp: 95, tn: 100, fp: 1, fn: 4, total: 200 },
      metrics: { accuracy: 0.975, precision: 0.9896, recall: 0.9596, f1: 0.9744, mcc: 0.95, specificity: 0.9901, fpr: 0.0099, fnr: 0.0404 },
      decision: {
        verdict: 'FAIL',
        false_positives: 1,
        false_negatives: 4,
        non_conformities: [
          { sample_id: 'sample-fp-001', type: 'false_positive', expected: 'clean', actual: 'malicious' },
          { sample_id: 'sample-fn-001', type: 'false_negative', expected: 'malicious', actual: 'clean' },
          { sample_id: 'sample-fn-002', type: 'false_negative', expected: 'malicious', actual: 'clean' },
          { sample_id: 'sample-fn-003', type: 'false_negative', expected: 'malicious', actual: 'clean' },
          { sample_id: 'sample-fn-004', type: 'false_negative', expected: 'malicious', actual: 'clean' },
        ],
      },
      uncertainty: [
        { metric: 'accuracy', point_estimate: 0.975, wilson_ci_lower: 0.945, wilson_ci_upper: 0.99, expanded_uncertainty: 0.022 },
      ],
    },
  ],
  signature: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
}

const MOCK_MODULES = [
  { moduleId: 'prompt-injection', tier: 1, lastCalibrationDate: '2026-03-21', currentToolHash: 'abc', valid: true },
]

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks() {
  mockFetchWithAuth.mockImplementation((url: string) => {
    if (url.includes('/runs')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ runs: MOCK_RUNS, total: 1, page: 1, limit: 10 }),
      })
    }
    if (url.includes('/modules')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ modules: MOCK_MODULES }),
      })
    }
    if (url.includes('/report/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_REPORT),
      })
    }
    if (url.includes('/export/')) {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'application/json' })),
        headers: new Headers({ 'content-disposition': 'attachment; filename="katana-report.json"' }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ValidationManager — Results Viewer (K6.6)', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('VR-001: renders View and JSON export buttons in run history', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view results/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument()
  })

  it('VR-002: clicking View loads and shows report data', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view results/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /view results/i }))

    await waitFor(() => {
      expect(screen.getByText(/FAIL/)).toBeInTheDocument()
    })
    // Verify report API was called
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining('/report/11111111'),
    )
  })

  it('VR-003: shows overall verdict and non-conformity count', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      // Verify both the label and count are present
      expect(screen.getByText('Non-Conformities')).toBeInTheDocument()
      // Non-conformity count appears as text "2" in the summary grid
      const ncLabel = screen.getByText('Non-Conformities')
      const ncSection = ncLabel.closest('div')
      expect(ncSection).not.toBeNull()
      expect(within(ncSection!).getByText('2')).toBeInTheDocument()
    })
  })

  it('VR-004: shows module list with pass/fail badges and expand controls', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getAllByText('prompt-injection').length).toBeGreaterThanOrEqual(2)
    })
    // Module header should be a button with aria-expanded (in results viewer)
    const moduleBtn = screen.getByRole('button', { name: /prompt-injection/i })
    expect(moduleBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('VR-005: expanding a module shows confusion matrix', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      const moduleBtn = screen.getByRole('button', { name: /prompt-injection/i })
      fireEvent.click(moduleBtn)
    })

    await waitFor(() => {
      expect(screen.getByTestId('tp-cell')).toHaveTextContent('TP: 95')
      expect(screen.getByTestId('fn-cell')).toHaveTextContent('FN: 4')
      expect(screen.getByTestId('fp-cell')).toHaveTextContent('FP: 1')
      expect(screen.getByTestId('tn-cell')).toHaveTextContent('TN: 100')
    })
  })

  it('VR-006: expanding a module shows metrics table', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /prompt-injection/i }))
    })

    await waitFor(() => {
      expect(screen.getAllByText('accuracy').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('97.50%')).toBeInTheDocument()
    })
  })

  it('VR-007: expanding a module shows uncertainty CI range bars', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /prompt-injection/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/94\.50%, 99\.00%/)).toBeInTheDocument()
    })
  })

  it('VR-008: expanding a module shows decision rule result', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /prompt-injection/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Non-conformities detected: 1 FP, 4 FN/)).toBeInTheDocument()
    })
  })
})

describe('ValidationManager — Non-Conformity List (K6.6)', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('VR-009: shows non-conformity register with total count', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Non-Conformity Register \(5 total\)/)).toBeInTheDocument()
    })
  })

  it('VR-010: shows NC table with sample IDs, modules, types', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('sample-fp-001')).toBeInTheDocument()
      expect(screen.getByText('sample-fn-001')).toBeInTheDocument()
    })
  })

  it('VR-011: type filter shows only FPs when selected', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('sample-fp-001')).toBeInTheDocument()
    })

    const typeSelect = screen.getByLabelText('Filter by type')
    fireEvent.change(typeSelect, { target: { value: 'false_positive' } })

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 5')).toBeInTheDocument()
      expect(screen.getByText('sample-fp-001')).toBeInTheDocument()
      expect(screen.queryByText('sample-fn-001')).not.toBeInTheDocument()
    })
  })

  it('VR-012: search filter narrows results by sample ID', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('sample-fp-001')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText('Search non-conformities by sample ID')
    fireEvent.change(searchInput, { target: { value: 'fn-003' } })

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 5')).toBeInTheDocument()
      expect(screen.getByText('sample-fn-003')).toBeInTheDocument()
      expect(screen.queryByText('sample-fp-001')).not.toBeInTheDocument()
    })
  })
})

describe('ValidationManager — Traceability Viewer (K6.6)', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('VR-013: shows traceability chain toggle button', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /traceability chain/i })).toBeInTheDocument()
    })
  })

  it('VR-014: expanding traceability shows environment details', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /traceability chain/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/darwin/)).toBeInTheDocument()
      expect(screen.getByText(/20\.11\.0/)).toBeInTheDocument()
    })
  })

  it('VR-015: shows digital signature when present', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /traceability chain/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/abcdef0123456789/)).toBeInTheDocument()
    })
  })
})

describe('ValidationManager — Export Buttons (K6.7)', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('VR-016: shows JSON, CSV, Markdown export buttons in results viewer', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /download markdown/i })).toBeInTheDocument()
    })
  })

  it('VR-017: clicking Download JSON calls export API with json format', async () => {
    setupDefaultMocks()
    // Mock URL.createObjectURL and document.createElement — save originals for cleanup
    const origCreate = global.URL.createObjectURL
    const origRevoke = global.URL.revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:test')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    try {
      const { ValidationManager } = await import('@/components/admin/ValidationManager')
      render(<ValidationManager />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /view results/i }))
      })

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /download json/i }))
      })

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledWith(
          expect.stringContaining('/export/11111111-1111-1111-1111-111111111111?format=json'),
        )
      })
    } finally {
      global.URL.createObjectURL = origCreate
      global.URL.revokeObjectURL = origRevoke
    }
  })

  it('VR-018: shows export error alert on failed export', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: MOCK_RUNS, total: 1 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: MOCK_MODULES }),
        })
      }
      if (url.includes('/report/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_REPORT),
        })
      }
      if (url.includes('/export/')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Export rate limit exceeded' }),
        })
      }
      return Promise.resolve({ ok: false })
    })

    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /download json/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Export rate limit exceeded/)).toBeInTheDocument()
    })
  })

  it('VR-019: clicking View again hides results and clears state', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Non-Conformity Register/)).toBeInTheDocument()
    })

    // Click again to hide (button has aria-label "View results for run ...")
    fireEvent.click(screen.getByRole('button', { name: /view results/i }))

    await waitFor(() => {
      expect(screen.queryByText(/Non-Conformity Register/)).not.toBeInTheDocument()
    })
  })

  it('VR-020: report error shows error alert', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: MOCK_RUNS, total: 1 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: MOCK_MODULES }),
        })
      }
      if (url.includes('/report/')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Report not found' }),
        })
      }
      return Promise.resolve({ ok: false })
    })

    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('Report not found')).toBeInTheDocument()
    })
  })

  it('VR-021: run history table has 6 columns (Date, Status, Duration, Modules, NC, Actions)', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      const table = screen.getByRole('table', { name: /validation run history/i })
      const headers = within(table).getAllByRole('columnheader')
      expect(headers).toHaveLength(6)
      expect(headers[5]).toHaveTextContent('Actions')
    })
  })

  it('VR-022: selected run row is visually highlighted', async () => {
    setupDefaultMocks()
    const { ValidationManager } = await import('@/components/admin/ValidationManager')
    render(<ValidationManager />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /view results/i }))
    })

    await waitFor(() => {
      // The selected row should have the highlight class
      const rows = screen.getAllByRole('row')
      // Find the data row (not header)
      const dataRow = rows.find(r => r.textContent?.includes('prompt-injection'))
      expect(dataRow?.className).toContain('bg-muted/30')
    })
  })
})
