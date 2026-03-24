/**
 * File: report-generator.test.tsx
 * Purpose: Tests for ReportGenerator component
 * Test IDs: RG-001 to RG-012
 * Source: src/components/llm/ReportGenerator.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
  ),
}))
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <input
        data-testid="select-hidden-input"
        type="hidden"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  ),
  SelectTrigger: ({ children, className }: { children: ReactNode; className?: string }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="icon-download" />,
  FileJson: () => <span data-testid="icon-json" />,
  FileText: () => <span data-testid="icon-pdf" />,
  FileSpreadsheet: () => <span data-testid="icon-csv" />,
  Shield: () => <span data-testid="icon-sarif" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-url')
const mockRevokeObjectURL = vi.fn()
const mockAnchorClick = vi.fn()
const originalCreateElement = document.createElement.bind(document)
Object.defineProperty(globalThis, 'URL', {
  value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
  writable: true,
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ReportGenerator } from '../llm/ReportGenerator'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options)
    if (tagName.toLowerCase() === 'a') {
      Object.defineProperty(element, 'click', {
        configurable: true,
        value: mockAnchorClick,
      })
    }
    return element
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===========================================================================
// RG-001: Renders default (non-compact) mode with Download Report button
// ===========================================================================
describe('RG-001: Default rendering', () => {
  it('renders Download Report button', () => {
    render(<ReportGenerator />)
    expect(screen.getByText('Download Report')).toBeInTheDocument()
  })
})

// ===========================================================================
// RG-002: Renders compact mode with Export button
// ===========================================================================
describe('RG-002: Compact mode', () => {
  it('renders Export button in compact mode', () => {
    render(<ReportGenerator compact />)
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.queryByText('Download Report')).not.toBeInTheDocument()
  })
})

// ===========================================================================
// RG-003: Shows format description text in default mode
// ===========================================================================
describe('RG-003: Format description', () => {
  it('displays format description text', () => {
    render(<ReportGenerator />)
    expect(screen.getByText('Raw results data')).toBeInTheDocument()
  })
})

// ===========================================================================
// RG-004: Renders all 4 format options
// ===========================================================================
describe('RG-004: Format options', () => {
  it('renders JSON, CSV, SARIF, and PDF format items', () => {
    render(<ReportGenerator />)
    expect(screen.getByTestId('select-item-json')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-csv')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-sarif')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-pdf')).toBeInTheDocument()
  })
})

// ===========================================================================
// RG-005: Downloads JSON format
// ===========================================================================
describe('RG-005: JSON download', () => {
  it('calls fetchWithAuth for JSON export', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
    render(<ReportGenerator />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('format=json')
      )
    })
  })
})

// ===========================================================================
// RG-006: Shows error on download failure
// ===========================================================================
describe('RG-006: Download error', () => {
  it('displays error message on failed download', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValueOnce({ ok: false })
    render(<ReportGenerator />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// RG-007: Shows error for invalid batchId format
// ===========================================================================
describe('RG-007: Invalid batchId format', () => {
  it('shows error when batchId fails pattern validation', async () => {
    const user = userEvent.setup()
    render(<ReportGenerator batchId="invalid-id" />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid batch ID format')
    })
  })
})

// ===========================================================================
// RG-008: Sends batchId param when provided with valid format
// ===========================================================================
describe('RG-008: batchId param in URL', () => {
  it('includes batchId in fetch URL when valid', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
    render(<ReportGenerator batchId="batch-123-abc" />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('batchId=batch-123-abc')
      )
    })
  })
})

// ===========================================================================
// RG-009: Sends mode=all when no batchId
// ===========================================================================
describe('RG-009: mode=all param', () => {
  it('includes mode=all when no batchId is provided', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
    render(<ReportGenerator />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('mode=all')
      )
    })
  })
})

// ===========================================================================
// RG-010: Button is disabled during download
// ===========================================================================
describe('RG-010: Disabled during download', () => {
  it('disables the button while downloading', async () => {
    const user = userEvent.setup()
    let resolvePromise!: (v: unknown) => void
    mockFetchWithAuth.mockReturnValueOnce(
      new Promise((res) => { resolvePromise = res })
    )
    render(<ReportGenerator />)
    const btn = screen.getByText('Download Report').closest('button')!
    await user.click(btn)
    await waitFor(() => {
      expect(btn).toBeDisabled()
    })
    resolvePromise({ ok: true, json: () => Promise.resolve({}) })
    await waitFor(() => {
      expect(btn).not.toBeDisabled()
    })
  })
})

// ===========================================================================
// RG-011: Error has role="alert" and aria-live
// ===========================================================================
describe('RG-011: Error accessibility', () => {
  it('error message has role=alert and aria-live=assertive', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValueOnce({ ok: false })
    render(<ReportGenerator />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })
  })
})

// ===========================================================================
// RG-012: Shows "Generating..." text during download in non-compact mode
// ===========================================================================
describe('RG-012: Generating text', () => {
  it('shows "Generating..." while downloading in default mode', async () => {
    const user = userEvent.setup()
    let resolvePromise!: (v: unknown) => void
    mockFetchWithAuth.mockReturnValueOnce(
      new Promise((res) => { resolvePromise = res })
    )
    render(<ReportGenerator />)
    await user.click(screen.getByText('Download Report'))
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
    resolvePromise({ ok: true, json: () => Promise.resolve({}) })
    await waitFor(() => {
      expect(screen.getByText('Download Report')).toBeInTheDocument()
    })
  })
})
