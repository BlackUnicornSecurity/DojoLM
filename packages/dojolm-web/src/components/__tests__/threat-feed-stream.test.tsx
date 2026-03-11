/**
 * File: threat-feed-stream.test.tsx
 * Purpose: Unit tests for ThreatFeedStream component
 * Test IDs: TF-001 to TF-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/lib/ecosystem-types', () => ({
  toEcosystemSeverity: (s: string) => s,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, ...props }: {
    children: React.ReactNode; onClick?: () => void; 'aria-label'?: string; [k: string]: unknown
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}))

vi.mock('@/components/ui/CrossModuleActions', () => ({
  CrossModuleActions: () => <div data-testid="cross-module-actions" />,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ThreatFeedStream } from '../strategic/ThreatFeedStream'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThreatFeedStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TF-001: renders Mitsuke header', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
  })

  it('TF-002: shows active source count in subtitle', () => {
    render(<ThreatFeedStream />)
    // 6 active sources from mock data
    expect(screen.getByText(/6 active sources/)).toBeInTheDocument()
  })

  it('TF-003: renders Alerts button with unacknowledged count', () => {
    render(<ThreatFeedStream />)
    const alertBtn = screen.getByLabelText('Hide alert panel')
    expect(alertBtn).toBeInTheDocument()
    // 5 unacknowledged alerts in mock data
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('TF-004: renders search input', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByLabelText('Search threat entries and indicators')).toBeInTheDocument()
  })

  it('TF-005: renders severity filter buttons', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByLabelText('Filter by all severities')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by critical severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by high severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by medium severity')).toBeInTheDocument()
  })

  it('TF-006: renders Sources card with source count', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByLabelText('Threat intelligence sources')).toBeInTheDocument()
  })

  it('TF-007: renders Threat Stream card with entries', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByText('Threat Stream')).toBeInTheDocument()
    expect(screen.getByLabelText('Threat intelligence entries')).toBeInTheDocument()
  })

  it('TF-008: renders Alerts card with alerts list', () => {
    render(<ThreatFeedStream />)
    // The Alerts button text and the Alerts card title both render "Alerts"
    expect(screen.getAllByText('Alerts').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByLabelText('Active threat alerts')).toBeInTheDocument()
  })

  it('TF-009: renders Indicators table', () => {
    render(<ThreatFeedStream />)
    expect(screen.getByText('Indicators')).toBeInTheDocument()
    expect(screen.getByLabelText('Threat indicators')).toBeInTheDocument()
  })

  it('TF-010: hides alert panel when toggle is clicked', () => {
    render(<ThreatFeedStream />)
    fireEvent.click(screen.getByLabelText('Hide alert panel'))
    // After toggling, the label changes to "Show"
    expect(screen.getByLabelText('Show alert panel')).toBeInTheDocument()
  })

  it('TF-011: filters entries by severity when filter button is clicked', () => {
    render(<ThreatFeedStream />)
    // Click critical filter
    fireEvent.click(screen.getByLabelText('Filter by critical severity'))
    // Should show "2 entries" (2 critical entries in mock data)
    expect(screen.getByText('2 entries')).toBeInTheDocument()
  })

  it('TF-012: renders source status indicators for all sources', () => {
    render(<ThreatFeedStream />)
    // Source names may appear in both sources list and entry metadata
    expect(screen.getAllByText('NIST NVD').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('MITRE ATT&CK Feed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('OWASP LLM Feed').length).toBeGreaterThanOrEqual(1)
  })
})
