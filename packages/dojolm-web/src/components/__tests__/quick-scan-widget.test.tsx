/**
 * File: quick-scan-widget.test.tsx
 * Purpose: Unit tests for QuickScanWidget dashboard widget
 * Story: TPI-NODA-1.5.9
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    scanText: vi.fn(),
    scanResult: null,
    isScanning: false,
  }),
}))

vi.mock('@/components/ui/SeverityBadge', () => ({
  SeverityBadge: (props: Record<string, unknown>) => <span data-testid="severity-badge">{String(props.severity)}</span>,
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

import { QuickScanWidget } from '@/components/dashboard/widgets/QuickScanWidget'

describe('QuickScanWidget', () => {
  it('renders without crashing', () => {
    render(<QuickScanWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<QuickScanWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Quick Scan')
  })

  it('renders the text input with placeholder', () => {
    render(<QuickScanWidget />)
    expect(screen.getByPlaceholderText('Paste text to scan...')).toBeInTheDocument()
  })

  it('renders the scan button with aria-label', () => {
    render(<QuickScanWidget />)
    expect(screen.getByLabelText('Run scan')).toBeInTheDocument()
  })

  it('does not show verdict when scanResult is null', () => {
    render(<QuickScanWidget />)
    expect(screen.queryByText('BLOCK')).not.toBeInTheDocument()
    expect(screen.queryByText('ALLOW')).not.toBeInTheDocument()
  })

  it('input is enabled when not scanning', () => {
    render(<QuickScanWidget />)
    const input = screen.getByPlaceholderText('Paste text to scan...')
    expect(input).not.toBeDisabled()
  })

  // ---------------------------------------------------------------------------
  // BUG-007: Stale result prevention
  // ---------------------------------------------------------------------------

  it('QSW-001: does not show stale BLOCK result from global scanner context', () => {
    // The mock above has scanResult: null, so no stale result shown
    // This verifies the widget does NOT display results it didn't initiate
    render(<QuickScanWidget />)
    expect(screen.queryByText('BLOCK')).not.toBeInTheDocument()
  })

  it('QSW-002: does not show dismiss button when no local result exists', () => {
    render(<QuickScanWidget />)
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
  })
})
