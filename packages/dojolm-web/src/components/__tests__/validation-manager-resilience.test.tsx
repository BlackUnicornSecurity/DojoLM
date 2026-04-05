/**
 * File: validation-manager-resilience.test.tsx
 * Purpose: Tests for BUG-004 — ValidationManager crash resilience
 * Test IDs: VAL-031 to VAL-035
 *
 * Verifies that the ValidationManager component gracefully handles:
 * - Malformed JSON responses
 * - Non-OK HTTP responses
 * - Simultaneous fetch failures
 * - Null/undefined module entries in normalizeModuleCalibration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks (matching validation-manager.test.tsx pattern)
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

function mockFetchResult(ok: boolean, body?: unknown, jsonThrows = false) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: jsonThrows
      ? () => Promise.reject(new Error('Invalid JSON'))
      : () => Promise.resolve(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ValidationManager resilience (BUG-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // VAL-031: Renders error when runs endpoint returns malformed JSON
  it('VAL-031: shows error when runs endpoint returns malformed JSON', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) return mockFetchResult(true, null, true)
      if (url.includes('/modules')) return mockFetchResult(true, { modules: [] })
      return mockFetchResult(true, {})
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText(/invalid response/i)).toBeInTheDocument()
    })
  })

  // VAL-032: Renders gracefully when modules data is not an array
  it('VAL-032: handles non-array modules data without crashing', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) return mockFetchResult(true, { runs: [], total: 0 })
      if (url.includes('/modules')) return mockFetchResult(true, { modules: 'not-array' })
      return mockFetchResult(true, {})
    })

    const { container } = render(<ValidationManager />)

    // Should not crash — component mounts and renders
    await waitFor(() => {
      expect(container.querySelector('[data-testid="card"]')).toBeInTheDocument()
    })
  })

  // VAL-033: Both fetches fail simultaneously without crashing
  it('VAL-033: renders error messages when both fetches fail', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network failure'))

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText(/network error loading run history/i)).toBeInTheDocument()
      expect(screen.getByText(/network error loading calibration/i)).toBeInTheDocument()
    })
  })

  // VAL-034: Non-OK response from runs endpoint sets historyError
  it('VAL-034: non-OK runs response sets history error', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) return mockFetchResult(false)
      if (url.includes('/modules')) return mockFetchResult(true, { modules: [] })
      return mockFetchResult(true, {})
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load run history/i)).toBeInTheDocument()
    })
  })

  // VAL-035: Modules endpoint returns malformed JSON without crashing
  it('VAL-035: handles malformed JSON from modules endpoint gracefully', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) return mockFetchResult(true, { runs: [], total: 0 })
      if (url.includes('/modules')) return mockFetchResult(true, null, true)
      return mockFetchResult(true, {})
    })

    render(<ValidationManager />)

    await waitFor(() => {
      expect(screen.getByText(/invalid response from modules/i)).toBeInTheDocument()
    })
  })

  // VAL-036: Null entries in modules array don't crash normalizeModuleCalibration
  it('VAL-036: handles null entries in modules array without crashing', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/runs')) return mockFetchResult(true, { runs: [], total: 0 })
      if (url.includes('/modules')) {
        return mockFetchResult(true, {
          modules: [null, { name: 'valid-module', tier: 'critical', lastCalibration: '2025-06-01', status: 'valid' }],
        })
      }
      return mockFetchResult(true, {})
    })

    const { container } = render(<ValidationManager />)

    // Should render without crash — the valid module should appear
    await waitFor(() => {
      expect(container.querySelector('[data-testid="card"]')).toBeInTheDocument()
    })
  })
})
