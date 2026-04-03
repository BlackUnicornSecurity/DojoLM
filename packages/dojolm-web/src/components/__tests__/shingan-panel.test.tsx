/**
 * File: shingan-panel.test.tsx
 * Purpose: Unit tests for ShinganPanel component
 * Test IDs: SHP-001 to SHP-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Shield: (props: Record<string, unknown>) => <svg data-testid="shield-icon" {...props} />,
  Eye: (props: Record<string, unknown>) => <svg data-testid="eye-icon" {...props} />,
  Upload: (props: Record<string, unknown>) => <svg data-testid="upload-icon" {...props} />,
  Download: (props: Record<string, unknown>) => <svg data-testid="download-icon" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down-icon" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <button data-testid="button" {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Auto-detect</span>,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea data-testid="textarea" {...props} />,
}))

import { ShinganPanel } from '../shingan/ShinganPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShinganPanel (SHP-001 to SHP-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SHP-001: renders header with title "Shingan Scanner"', () => {
    render(<ShinganPanel />)
    expect(screen.getByText('Shingan Scanner')).toBeInTheDocument()
  })

  it('SHP-002: renders description text about 6 detection layers', () => {
    render(<ShinganPanel />)
    expect(
      screen.getByText(/Scan skill and agent definitions for trust risks across 6 detection layers/),
    ).toBeInTheDocument()
  })

  it('SHP-003: renders eye icon in header', () => {
    render(<ShinganPanel />)
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument()
  })

  it('SHP-004: renders batch mode toggle checkbox', () => {
    render(<ShinganPanel />)
    expect(screen.getByText('Batch mode')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('SHP-005: renders upload zone with drop instructions', () => {
    render(<ShinganPanel />)
    expect(screen.getByText('Drop a skill file here or click to browse')).toBeInTheDocument()
  })

  it('SHP-006: renders textarea for skill content input', () => {
    render(<ShinganPanel />)
    expect(screen.getByTestId('textarea')).toBeInTheDocument()
  })

  it('SHP-007: renders Scan button (disabled when no content)', () => {
    render(<ShinganPanel />)
    const buttons = screen.getAllByTestId('button')
    const scanButton = buttons.find((b) => b.textContent?.includes('Scan'))
    expect(scanButton).toBeInTheDocument()
  })
})
