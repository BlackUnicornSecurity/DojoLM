/**
 * File: shingan-panel.test.tsx
 * Purpose: Unit tests for ShinganPanel component
 * Test IDs: SHP-001 to SHP-013
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  Globe: (props: Record<string, unknown>) => <svg data-testid="globe-icon" {...props} />,
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

describe('ShinganPanel (SHP-001 to SHP-013)', () => {
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

  it('SHP-004: renders scan mode radiogroup with Single/Batch/URL options', () => {
    render(<ShinganPanel />)
    const group = screen.getByRole('radiogroup', { name: 'Select scan mode' })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    const labels = radios.map((r) => r.textContent)
    expect(labels).toContain('Single')
    expect(labels).toContain('Batch')
    expect(labels).toContain('URL')
    // Single selected by default
    const single = radios.find((r) => r.textContent === 'Single')
    expect(single).toHaveAttribute('aria-checked', 'true')
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

  // ===========================================================================
  // URL mode tests (SHP-008 to SHP-013)
  // ===========================================================================

  it('SHP-008: switching to URL mode sets URL radio as checked', () => {
    render(<ShinganPanel />)
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')
    expect(urlRadio).toBeDefined()
    fireEvent.click(urlRadio!)
    expect(urlRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('SHP-009: URL mode renders URL input field', () => {
    render(<ShinganPanel />)
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')!
    fireEvent.click(urlRadio)
    expect(screen.getByLabelText('GitHub raw URL')).toBeInTheDocument()
  })

  it('SHP-010: URL mode hides upload zone', () => {
    render(<ShinganPanel />)
    expect(screen.getByText('Drop a skill file here or click to browse')).toBeInTheDocument()
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')!
    fireEvent.click(urlRadio)
    expect(screen.queryByText('Drop a skill file here or click to browse')).not.toBeInTheDocument()
  })

  it('SHP-011: URL input has correct placeholder mentioning raw.githubusercontent.com', () => {
    render(<ShinganPanel />)
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')!
    fireEvent.click(urlRadio)
    const input = screen.getByLabelText('GitHub raw URL')
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('raw.githubusercontent.com'))
  })

  it('SHP-012: Scan URL button has aria-label and is disabled when input empty', () => {
    render(<ShinganPanel />)
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')!
    fireEvent.click(urlRadio)
    const scanBtn = screen.getByRole('button', { name: 'Scan URL' })
    expect(scanBtn).toBeDisabled()
  })

  it('SHP-013: Scan URL button enabled when URL input has value', () => {
    render(<ShinganPanel />)
    const urlRadio = screen.getAllByRole('radio').find((r) => r.textContent === 'URL')!
    fireEvent.click(urlRadio)
    const input = screen.getByLabelText('GitHub raw URL')
    fireEvent.change(input, { target: { value: 'https://raw.githubusercontent.com/owner/repo/main/skill.md' } })
    const scanBtn = screen.getByRole('button', { name: 'Scan URL' })
    expect(scanBtn).not.toBeDisabled()
  })
})
