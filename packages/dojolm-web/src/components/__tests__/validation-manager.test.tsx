/**
 * File: validation-manager.test.tsx
 * Purpose: Unit tests for ValidationManager admin component
 * Test IDs: VM-001 to VM-012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  CardContent: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: { children: React.ReactNode }) => <h3 {...props}>{children}</h3>,
}))

import { ValidationManager } from '../admin/ValidationManager'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRuns = [
  {
    id: 'run-1',
    date: '2025-06-01T10:00:00Z',
    status: 'PASS' as const,
    durationMs: 45000,
    modules: ['prompt-injection', 'jailbreak'],
    nonConformities: 0,
  },
  {
    id: 'run-2',
    date: '2025-05-28T14:30:00Z',
    status: 'FAIL' as const,
    durationMs: 62000,
    modules: ['toxicity', 'bias-detection'],
    nonConformities: 3,
  },
]

const mockModules = [
  {
    name: 'prompt-injection',
    tier: 'critical',
    lastCalibration: '2025-06-01T00:00:00Z',
    status: 'valid' as const,
  },
  {
    name: 'jailbreak',
    tier: 'high',
    lastCalibration: '2025-04-15T00:00:00Z',
    status: 'expired' as const,
  },
]

function setupDefaultMocks() {
  mockFetchWithAuth.mockImplementation((url: string) => {
    if (url.includes('/runs')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ runs: mockRuns, total: 2 }),
      })
    }
    if (url.includes('/modules')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ modules: mockModules }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })
}

function setupErrorMocks() {
  mockFetchWithAuth.mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: 'Server error' }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ValidationManager', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // VM-001: Renders run buttons
  it('VM-001: renders Run Full Validation and Run Calibration Only buttons', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /run calibration only/i })).toBeInTheDocument()
    })
  })

  // VM-002: Run Full Validation triggers POST
  it('VM-002: clicking Run Full Validation sends POST to /api/admin/validation/run', async () => {
    setupDefaultMocks()
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/run' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runId: 'run-new' }),
        })
      }
      if (url.includes('/status/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              runId: 'run-new',
              status: 'completed',
              progress: 100,
              currentModule: '',
              samplesProcessed: 100,
              samplesTotal: 100,
              nonConformities: 2,
              elapsedMs: 5000,
              etaMs: 0,
            }),
        })
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: mockRuns, total: 2 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: mockModules }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run full validation/i }))

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/admin/validation/run',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  // VM-003: Run Calibration Only triggers POST
  it('VM-003: clicking Run Calibration Only sends POST to /api/admin/validation/calibrate', async () => {
    setupDefaultMocks()
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/calibrate' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'ok' }),
        })
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: mockRuns, total: 2 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: mockModules }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run calibration only/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run calibration only/i }))

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/admin/validation/calibrate',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  // VM-004: Buttons disabled during active run
  it('VM-004: buttons are disabled while a run is in progress', async () => {
    setupDefaultMocks()
    // Make the run endpoint return a runId so polling starts
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/run' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runId: 'run-active' }),
        })
      }
      if (url.includes('/status/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              runId: 'run-active',
              status: 'running',
              progress: 50,
              currentModule: 'jailbreak',
              samplesProcessed: 50,
              samplesTotal: 100,
              nonConformities: 1,
              elapsedMs: 3000,
              etaMs: 3000,
            }),
        })
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: mockRuns, total: 2 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: mockModules }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run full validation/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /run calibration only/i })).toBeDisabled()
    })
  })

  // VM-005: Progress section shows during active run
  it('VM-005: progress section displays during an active run', async () => {
    setupDefaultMocks()
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/run' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runId: 'run-progress' }),
        })
      }
      if (url.includes('/status/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              runId: 'run-progress',
              status: 'running',
              progress: 42,
              currentModule: 'toxicity',
              samplesProcessed: 42,
              samplesTotal: 100,
              nonConformities: 2,
              elapsedMs: 5000,
              etaMs: 7000,
            }),
        })
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: mockRuns, total: 2 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: mockModules }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run full validation/i }))

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('42%')).toBeInTheDocument()
      expect(screen.getByText('42 / 100')).toBeInTheDocument()
    })
  })

  // VM-006: Run history table renders
  it('VM-006: run history table renders with data', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText('PASS')).toBeInTheDocument()
      expect(screen.getByText('FAIL')).toBeInTheDocument()
    })

    // Check table headers
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Non-Conformities')).toBeInTheDocument()
  })

  // VM-007: Calibration status table renders
  it('VM-007: calibration status table renders module data', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      // Calibration table has tier and status columns — unique to the calibration section
      expect(screen.getByText('critical')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
      expect(screen.getByText('valid')).toBeInTheDocument()
      expect(screen.getByText('expired')).toBeInTheDocument()
    })
  })

  // VM-008: Recalibrate All button exists and is clickable
  it('VM-008: Recalibrate All button triggers recalibration', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /recalibrate all/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /recalibrate all/i }))

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/admin/validation/calibrate',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  // VM-009: Error handling for failed run request
  it('VM-009: shows error alert when run request fails', async () => {
    setupDefaultMocks()
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/run' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation engine unavailable' }),
        })
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: [], total: 0 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run full validation/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Validation engine unavailable')).toBeInTheDocument()
    })
  })

  // VM-010: Error handling for network failure
  it('VM-010: shows network error on fetch exception', async () => {
    setupDefaultMocks()
    mockFetchWithAuth.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/admin/validation/run' && opts?.method === 'POST') {
        return Promise.reject(new Error('Network failure'))
      }
      if (url.includes('/runs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ runs: [], total: 0 }),
        })
      }
      if (url.includes('/modules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modules: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run full validation/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /run full validation/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  // VM-011: Module checkboxes render and toggle
  it('VM-011: module checkboxes render and can be toggled', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText('prompt-injection')).toBeInTheDocument()
    })

    const checkbox = screen.getAllByRole('checkbox').find((cb) => {
      const label = cb.closest('label')
      return label?.textContent?.includes('prompt-injection')
    })

    expect(checkbox).toBeDefined()
    expect(checkbox).not.toBeChecked()

    if (checkbox) {
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    }
  })

  // VM-012: Include Holdout Set toggle
  it('VM-012: Include Holdout Set toggle works', async () => {
    setupDefaultMocks()
    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText('Include Holdout Set')).toBeInTheDocument()
    })

    const holdoutCheckbox = screen.getAllByRole('checkbox').find((cb) => {
      const label = cb.closest('label')
      return label?.textContent?.includes('Include Holdout Set')
    })

    expect(holdoutCheckbox).toBeDefined()
    expect(holdoutCheckbox).not.toBeChecked()

    if (holdoutCheckbox) {
      fireEvent.click(holdoutCheckbox)
      expect(holdoutCheckbox).toBeChecked()
    }
  })
})
