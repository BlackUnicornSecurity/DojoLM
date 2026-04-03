/**
 * File: fixture-detail.test.tsx
 * Purpose: Unit tests for FixtureDetail component
 * Test IDs: FXD-001 to FXD-014
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
  formatDuration: (ms: number) => `${ms}ms`,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} disabled={disabled as boolean} aria-label={ariaLabel as string}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}))

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  FileText: () => <span data-testid="icon-filetext">FileText</span>,
  HardDrive: () => <span data-testid="icon-harddrive">HardDrive</span>,
  ScanEye: () => <span data-testid="icon-scaneye">ScanEye</span>,
  Image: () => <span data-testid="icon-image">Image</span>,
  Music: () => <span data-testid="icon-music">Music</span>,
  Film: () => <span data-testid="icon-film">Film</span>,
}))

vi.mock('../fixtures/MediaViewer', () => ({
  MediaViewer: ({ path, size }: { path: string; size: number }) => (
    <div data-testid="media-viewer" data-path={path} data-size={size} />
  ),
}))

import { FixtureDetail } from '../fixtures/FixtureDetail'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const textContent = {
  path: 'images/test.txt',
  content: 'Hello world test content',
  size: 24,
}

const binaryContent = {
  hex_preview: 'ff d8 ff e0 00 10',
  size: 1024,
  metadata: {
    format: 'JPEG',
    valid_jpeg: true,
    extracted_text: null,
    warning: null,
  },
}

const scanResult = {
  verdict: 'BLOCK' as const,
  counts: { critical: 2, warning: 1, info: 0 },
  findings: [
    { id: 'f1', severity: 'CRITICAL' as const, message: 'Injection found', engine: 'test', rule: 'r1' },
    { id: 'f2', severity: 'CRITICAL' as const, message: 'Another issue', engine: 'test', rule: 'r2' },
    { id: 'f3', severity: 'WARNING' as const, message: 'Warning issue', engine: 'test', rule: 'r3' },
  ],
  elapsed: 150,
  textLength: 0,
  normalizedLength: 0,
} as unknown as import('@/lib/types').ScanResult

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixtureDetail', () => {
  const defaultProps = {
    path: 'images/test.txt',
    content: textContent,
    scanResult: null,
    onClose: vi.fn(),
  }

  it('FXD-001: returns null when path is null', () => {
    const { container } = render(
      <FixtureDetail {...defaultProps} path={null} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('FXD-002: returns null when content is null', () => {
    const { container } = render(
      <FixtureDetail {...defaultProps} content={null} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('FXD-003: renders text file with path and content', () => {
    render(<FixtureDetail {...defaultProps} />)
    expect(screen.getByText('images/test.txt')).toBeInTheDocument()
    expect(screen.getByText('Hello world test content')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('FXD-004: displays file size for text content', () => {
    render(<FixtureDetail {...defaultProps} />)
    expect(screen.getByText('Size: 24 bytes')).toBeInTheDocument()
  })

  it('FXD-005: renders binary file with hex preview', () => {
    render(
      <FixtureDetail
        {...defaultProps}
        path="images/photo.dat"
        content={binaryContent as any}
      />
    )
    expect(screen.getByText('Hex Preview (first 256 bytes)')).toBeInTheDocument()
    expect(screen.getByText('ff d8 ff e0 00 10')).toBeInTheDocument()
  })

  it('FXD-006: shows binary metadata (format + JPEG validity)', () => {
    render(
      <FixtureDetail
        {...defaultProps}
        path="images/photo.dat"
        content={binaryContent as any}
      />
    )
    expect(screen.getByText('Format: JPEG')).toBeInTheDocument()
    expect(screen.getByText(/JPEG: Valid/)).toBeInTheDocument()
  })

  it('FXD-007: calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<FixtureDetail {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('FXD-008: renders Rescan button when onRescan is provided', () => {
    const onRescan = vi.fn()
    render(<FixtureDetail {...defaultProps} onRescan={onRescan} />)
    const rescanBtn = screen.getByText('Rescan')
    expect(rescanBtn).toBeInTheDocument()
    fireEvent.click(rescanBtn)
    expect(onRescan).toHaveBeenCalledOnce()
  })

  it('FXD-009: does not render Rescan button when onRescan is not provided', () => {
    render(<FixtureDetail {...defaultProps} />)
    expect(screen.queryByText('Rescan')).not.toBeInTheDocument()
  })

  it('FXD-010: disables Rescan button when isScanning is true', () => {
    render(
      <FixtureDetail {...defaultProps} onRescan={vi.fn()} isScanning={true} />
    )
    const rescanBtn = screen.getByText('Rescan').closest('button')
    expect(rescanBtn).toBeDisabled()
  })

  it('FXD-011: renders scan results when scanResult is provided', () => {
    render(<FixtureDetail {...defaultProps} scanResult={scanResult} />)
    expect(screen.getByText('Scan Results')).toBeInTheDocument()
    expect(screen.getByText('BLOCK')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // critical count
    expect(screen.getByText('Verdict')).toBeInTheDocument()
  })

  it('FXD-012: displays finding counts in scan results', () => {
    render(<FixtureDetail {...defaultProps} scanResult={scanResult} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getByText(/3 findings/)).toBeInTheDocument()
  })

  it('FXD-013: renders MediaViewer for media file extensions', () => {
    render(
      <FixtureDetail
        {...defaultProps}
        path="images/photo.png"
        content={binaryContent as any}
      />
    )
    const viewer = screen.getByTestId('media-viewer')
    expect(viewer).toBeInTheDocument()
    expect(viewer).toHaveAttribute('data-path', 'images/photo.png')
  })

  it('FXD-014: renders binary warning when metadata has warning', () => {
    const contentWithWarning = {
      ...binaryContent,
      metadata: { ...binaryContent.metadata, warning: 'Suspicious content detected' },
    }
    render(
      <FixtureDetail
        {...defaultProps}
        path="encoded/test.dat"
        content={contentWithWarning as any}
      />
    )
    expect(screen.getByText('Suspicious content detected')).toBeInTheDocument()
  })
})
