/**
 * File: fixture-list.test.tsx
 * Purpose: Unit tests for FixtureList component
 * Test IDs: FXL-001 to FXL-012
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} aria-label={ariaLabel as string}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}))

vi.mock('lucide-react', () => ({
  ScanEye: () => <span data-testid="icon-scan">Scan</span>,
  FileText: () => <span data-testid="icon-file">File</span>,
  AlertCircle: () => <span data-testid="icon-alert">Alert</span>,
  CheckCircle2: () => <span data-testid="icon-check">Check</span>,
}))

import { FixtureList } from '../fixtures/FixtureList'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const manifest = {
  version: '1.0.0',
  description: 'Test fixture collection',
  categories: {
    images: {
      desc: 'Image-based attack fixtures',
      story: 'S-01',
      files: [
        { file: 'clean.png', attack: null, severity: null, clean: true },
        { file: 'malicious.png', attack: 'Steganography', severity: 'CRITICAL', clean: false },
      ],
    },
    audio: {
      desc: 'Audio-based fixtures',
      story: 'S-02',
      files: [
        { file: 'clean.mp3', attack: null, severity: null, clean: true },
        { file: 'attack.wav', attack: 'Hidden command', severity: 'WARNING', clean: false },
        { file: 'info.ogg', attack: 'Metadata leak', severity: 'INFO', clean: false },
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixtureList', () => {
  const defaultProps = {
    manifest: manifest as any,
    onScanFixture: vi.fn(),
    onViewFixture: vi.fn(),
  }

  it('FXL-001: shows loading state when isLoading is true', () => {
    render(<FixtureList {...defaultProps} isLoading={true} />)
    expect(screen.getByText('Loading fixtures...')).toBeInTheDocument()
  })

  it('FXL-002: shows error state when manifest is null', () => {
    render(<FixtureList {...defaultProps} manifest={null} />)
    expect(screen.getByText('Failed to load fixtures')).toBeInTheDocument()
  })

  it('FXL-003: renders manifest description and version', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText(/Test fixture collection/)).toBeInTheDocument()
    expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument()
  })

  it('FXL-004: renders heading "Test Fixtures"', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText('Test Fixtures')).toBeInTheDocument()
  })

  it('FXL-005: renders all categories', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText('images')).toBeInTheDocument()
    expect(screen.getByText('audio')).toBeInTheDocument()
  })

  it('FXL-006: renders category description and story', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText(/Image-based attack fixtures/)).toBeInTheDocument()
    expect(screen.getByText(/Stories: S-01/)).toBeInTheDocument()
  })

  it('FXL-007: displays clean and attack badge counts per category', () => {
    render(<FixtureList {...defaultProps} />)
    // images: 1 clean, 1 attack; audio: 1 clean, 2 attack
    const cleanBadges = screen.getAllByText('1 Clean')
    expect(cleanBadges).toHaveLength(2) // both categories have 1 clean file
    expect(screen.getByText('1 Attack')).toBeInTheDocument() // images
    expect(screen.getByText('2 Attack')).toBeInTheDocument() // audio
  })

  it('FXL-008: renders file names in table rows', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText('clean.png')).toBeInTheDocument()
    expect(screen.getByText('malicious.png')).toBeInTheDocument()
    expect(screen.getByText('clean.mp3')).toBeInTheDocument()
  })

  it('FXL-009: shows Clean badge for clean files and Malicious for attack files', () => {
    render(<FixtureList {...defaultProps} />)
    const cleanBadges = screen.getAllByText('Clean')
    const maliciousBadges = screen.getAllByText('Malicious')
    // 2 clean files + 2 category "Clean" badges = 4 total "Clean" texts
    expect(cleanBadges.length).toBeGreaterThanOrEqual(2)
    expect(maliciousBadges.length).toBeGreaterThanOrEqual(3)
  })

  it('FXL-010: calls onViewFixture when view button is clicked', () => {
    const onViewFixture = vi.fn()
    render(<FixtureList {...defaultProps} onViewFixture={onViewFixture} />)
    const viewBtns = screen.getAllByLabelText(/View fixture/)
    fireEvent.click(viewBtns[0])
    expect(onViewFixture).toHaveBeenCalledWith('images', 'clean.png')
  })

  it('FXL-011: calls onScanFixture when scan button is clicked', () => {
    const onScanFixture = vi.fn()
    render(<FixtureList {...defaultProps} onScanFixture={onScanFixture} />)
    const scanBtns = screen.getAllByLabelText(/Scan fixture/)
    fireEvent.click(scanBtns[1])
    expect(onScanFixture).toHaveBeenCalledWith('images', 'malicious.png')
  })

  it('FXL-012: renders severity badges for files with severity', () => {
    render(<FixtureList {...defaultProps} />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    expect(screen.getByText('WARNING')).toBeInTheDocument()
    expect(screen.getByText('INFO')).toBeInTheDocument()
  })
})
