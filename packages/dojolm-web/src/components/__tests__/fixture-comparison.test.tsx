/**
 * File: fixture-comparison.test.tsx
 * Purpose: Unit tests for FixtureComparison component
 * Test IDs: FC-001 to FC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel }: {
    children: React.ReactNode; onClick?: () => void; 'aria-label'?: string
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { FixtureComparison, type ComparisonItem } from '../fixtures/FixtureComparison'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const makeTextItem = (path: string, content: string, scanResult: ComparisonItem['scanResult'] = null): ComparisonItem => ({
  path,
  content: { content, size: content.length, lines: content.split('\n').length },
  scanResult,
})

const makeBinaryItem = (path: string): ComparisonItem => ({
  path,
  content: { hex_preview: '00 01 02 03', size: 4, metadata: { mime_type: 'application/octet-stream', encoding: 'binary' } },
  scanResult: null,
})

const makeNullItem = (path: string): ComparisonItem => ({
  path,
  content: null,
  scanResult: null,
})

const makeScanResult = (verdict: 'ALLOW' | 'BLOCK', findings: Array<{ engine: string; description: string; severity: string; category: string; match: string; source: string }> = []) => ({
  verdict,
  findings,
  elapsed: 10,
  textLength: 100,
  normalizedLength: 100,
  counts: {
    critical: findings.filter(f => f.severity === 'CRITICAL').length,
    warning: findings.filter(f => f.severity === 'WARNING').length,
    info: findings.filter(f => f.severity === 'INFO').length,
  },
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixtureComparison', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FC-001: renders Fixture Comparison title', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('left.txt', 'left content'),
      makeTextItem('right.txt', 'right content'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('Fixture Comparison')).toBeInTheDocument()
  })

  it('FC-002: renders close button that calls onClose', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('left.txt', 'left'),
      makeTextItem('right.txt', 'right'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close comparison'))
    expect(onClose).toHaveBeenCalled()
  })

  it('FC-003: renders file paths for both panes', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('path/to/left.txt', 'left'),
      makeTextItem('path/to/right.txt', 'right'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('path/to/left.txt')).toBeInTheDocument()
    expect(screen.getByText('path/to/right.txt')).toBeInTheDocument()
  })

  it('FC-004: renders text content in pre element', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('a.txt', 'Hello left'),
      makeTextItem('b.txt', 'Hello right'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('Hello left')).toBeInTheDocument()
    expect(screen.getByText('Hello right')).toBeInTheDocument()
  })

  it('FC-005: renders binary content hex preview', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeBinaryItem('a.bin'),
      makeTextItem('b.txt', 'text'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('00 01 02 03')).toBeInTheDocument()
    expect(screen.getByText(/binary/)).toBeInTheDocument()
  })

  it('FC-006: shows loading state for null content', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeNullItem('loading.txt'),
      makeTextItem('b.txt', 'ready'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText(/Loading left fixture/)).toBeInTheDocument()
  })

  it('FC-007: renders scan result badges when present', () => {
    const scanResult = makeScanResult('BLOCK', [
      { engine: 'e1', description: 'd1', severity: 'CRITICAL', category: 'cat', match: 'm', source: 'current' },
    ])
    const items: [ComparisonItem, ComparisonItem] = [
      { ...makeTextItem('a.txt', 'content'), scanResult },
      makeTextItem('b.txt', 'content'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('BLOCK')).toBeInTheDocument()
    expect(screen.getByText('1 critical')).toBeInTheDocument()
  })

  it('FC-008: renders scan diff display when both items have scan results', () => {
    const leftScan = makeScanResult('BLOCK', [
      { engine: 'e1', description: 'found A', severity: 'CRITICAL', category: 'c', match: 'm', source: 's' },
    ])
    const rightScan = makeScanResult('ALLOW', [
      { engine: 'e2', description: 'found B', severity: 'WARNING', category: 'c', match: 'm', source: 's' },
    ])
    const items: [ComparisonItem, ComparisonItem] = [
      { ...makeTextItem('a.txt', 'c'), scanResult: leftScan },
      { ...makeTextItem('b.txt', 'c'), scanResult: rightScan },
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('Detection Differences')).toBeInTheDocument()
    expect(screen.getByTestId('separator')).toBeInTheDocument()
  })

  it('FC-009: shows shared count and unique finding counts in diff', () => {
    const sharedFinding = { engine: 'e1', description: 'shared', severity: 'INFO', category: 'c', match: 'm', source: 's' }
    const leftScan = makeScanResult('BLOCK', [
      sharedFinding,
      { engine: 'e2', description: 'only-left', severity: 'CRITICAL', category: 'c', match: 'm', source: 's' },
    ])
    const rightScan = makeScanResult('ALLOW', [sharedFinding])
    const items: [ComparisonItem, ComparisonItem] = [
      { ...makeTextItem('dir/a.txt', 'c'), scanResult: leftScan },
      { ...makeTextItem('dir/b.txt', 'c'), scanResult: rightScan },
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    // "Only in a.txt" appears in both summary row and unique findings list
    expect(screen.getAllByText(/Only in a\.txt/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Detection Differences')).toBeInTheDocument()
  })

  it('FC-010: shows identical message when no diff findings', () => {
    const finding = { engine: 'e1', description: 'same', severity: 'INFO', category: 'c', match: 'm', source: 's' }
    const scan = makeScanResult('ALLOW', [finding])
    const items: [ComparisonItem, ComparisonItem] = [
      { ...makeTextItem('a.txt', 'c'), scanResult: scan },
      { ...makeTextItem('b.txt', 'c'), scanResult: scan },
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('Both fixtures have identical detection results')).toBeInTheDocument()
  })

  it('FC-011: renders file size in bytes', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('a.txt', 'hello'),
      makeTextItem('b.txt', 'world!'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} />)
    expect(screen.getByText('5 bytes')).toBeInTheDocument()
    expect(screen.getByText('6 bytes')).toBeInTheDocument()
  })

  it('FC-012: accepts className prop', () => {
    const items: [ComparisonItem, ComparisonItem] = [
      makeTextItem('a.txt', 'a'),
      makeTextItem('b.txt', 'b'),
    ]
    render(<FixtureComparison items={items} onClose={onClose} className="extra-class" />)
    expect(screen.getByTestId('card').className).toContain('extra-class')
  })
})
