/**
 * File: sensei-tool-result.test.tsx
 * Purpose: Unit tests for SenseiToolResultCard component
 * Test IDs: STR-001 to STR-008
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="shield-icon" {...props} />,
  Eye: (props: Record<string, unknown>) => <svg data-testid="eye-icon" {...props} />,
  ShieldAlert: (props: Record<string, unknown>) => <svg data-testid="shield-alert-icon" {...props} />,
  ShieldCheck: (props: Record<string, unknown>) => <svg data-testid="shield-check-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { SenseiToolResultCard } from '../sensei/SenseiToolResult'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiToolResultCard (STR-001 to STR-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('STR-001: renders formatted tool name in header', () => {
    render(
      <SenseiToolResultCard tool="scan_text" success={true} data={{}} durationMs={150} />,
    )
    expect(screen.getByText('Scan Text')).toBeInTheDocument()
  })

  it('STR-002: renders duration in milliseconds', () => {
    render(
      <SenseiToolResultCard tool="scan_text" success={true} data={{}} durationMs={250} />,
    )
    expect(screen.getByText('250ms')).toBeInTheDocument()
  })

  it('STR-003: renders success icon for successful results', () => {
    render(
      <SenseiToolResultCard tool="scan_text" success={true} data={{}} durationMs={100} />,
    )
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  it('STR-004: renders error icon and message for failed results', () => {
    render(
      <SenseiToolResultCard tool="scan_text" success={false} data={null} error="Scan timed out" durationMs={5000} />,
    )
    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    expect(screen.getByText('Scan timed out')).toBeInTheDocument()
  })

  it('STR-005: toggles raw data display on button click', () => {
    render(
      <SenseiToolResultCard tool="get_stats" success={true} data={{ total: 42 }} durationMs={50} />,
    )
    expect(screen.getByText('Show raw data')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show raw data'))
    expect(screen.getByText('Hide raw data')).toBeInTheDocument()
    expect(screen.getByText(/"total": 42/)).toBeInTheDocument()
  })

  it('STR-006: renders scan result with verdict and findings count', () => {
    render(
      <SenseiToolResultCard
        tool="scan_text"
        success={true}
        data={{ verdict: 'BLOCK', findings: [{ severity: 'CRITICAL' }, { severity: 'HIGH' }] }}
        durationMs={200}
      />,
    )
    expect(screen.getByText('BLOCK')).toBeInTheDocument()
    expect(screen.getByText('2 findings')).toBeInTheDocument()
  })

  it('STR-007: renders guard status with mode and enabled badge', () => {
    render(
      <SenseiToolResultCard
        tool="get_guard_status"
        success={true}
        data={{ mode: 'samurai', enabled: true }}
        durationMs={30}
      />,
    )
    expect(screen.getByText('samurai')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('STR-008: renders "No data returned" for null data', () => {
    render(
      <SenseiToolResultCard tool="unknown_tool" success={true} data={null} durationMs={10} />,
    )
    expect(screen.getByText('No data returned')).toBeInTheDocument()
  })
})
