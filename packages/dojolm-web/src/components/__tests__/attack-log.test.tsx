/**
 * File: attack-log.test.tsx
 * Purpose: Tests for AttackLog component — rendering, severity filter, log entries, a11y
 * Story: S73 - Atemi Lab Dashboard
 * Index:
 * - TC-ATKLOG-001: renders Attack Log heading
 * - TC-ATKLOG-002: renders entry count
 * - TC-ATKLOG-003: renders all severity filter buttons
 * - TC-ATKLOG-004: default filter is 'All'
 * - TC-ATKLOG-005: clicking Critical filter shows only critical entries
 * - TC-ATKLOG-006: clicking High filter shows only high entries
 * - TC-ATKLOG-007: clicking Medium filter shows only medium entries
 * - TC-ATKLOG-008: clicking Low filter shows only low entries
 * - TC-ATKLOG-009: log entries display as plain text (XSS prevention)
 * - TC-ATKLOG-010: log container has role="log" and aria-label
 * - TC-ATKLOG-011: filter buttons have aria-pressed attribute
 * - TC-ATKLOG-012: applies custom className
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock dependencies
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/CrossModuleActions', () => ({
  CrossModuleActions: () => <div data-testid="cross-module-actions" />,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ description }: { description: string }) => (
    <div data-testid="empty-state">{description}</div>
  ),
  emptyStatePresets: { noResults: { title: 'No results' } },
}))

vi.mock('@/lib/ecosystem-types', () => ({
  toEcosystemSeverity: (s: string) => s,
}))

import { AttackLog } from '@/components/adversarial/AttackLog'

describe('AttackLog', () => {
  it('TC-ATKLOG-001: renders Attack Log heading', () => {
    render(<AttackLog />)
    expect(screen.getByText('Attack Log')).toBeInTheDocument()
  })

  it('TC-ATKLOG-002: renders entry count', () => {
    render(<AttackLog />)
    // 12 mock entries total
    expect(screen.getByText('(12 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-003: renders all severity filter buttons', () => {
    render(<AttackLog />)
    expect(screen.getByRole('button', { name: /filter by all severity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by critical severity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by high severity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by medium severity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by low severity/i })).toBeInTheDocument()
  })

  it('TC-ATKLOG-004: default filter is All with all entries shown', () => {
    render(<AttackLog />)
    const allBtn = screen.getByRole('button', { name: /filter by all severity/i })
    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
    // Should show all 12 entries
    expect(screen.getByText('(12 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-005: clicking Critical filter shows only critical entries', () => {
    render(<AttackLog />)
    const criticalBtn = screen.getByRole('button', { name: /filter by critical severity/i })
    fireEvent.click(criticalBtn)
    // 2 critical entries in mock data
    expect(screen.getByText('(2 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-006: clicking High filter shows only high entries', () => {
    render(<AttackLog />)
    fireEvent.click(screen.getByRole('button', { name: /filter by high severity/i }))
    // 4 high entries in mock data
    expect(screen.getByText('(4 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-007: clicking Medium filter shows only medium entries', () => {
    render(<AttackLog />)
    fireEvent.click(screen.getByRole('button', { name: /filter by medium severity/i }))
    // 4 medium entries in mock data
    expect(screen.getByText('(4 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-008: clicking Low filter shows only low entries', () => {
    render(<AttackLog />)
    fireEvent.click(screen.getByRole('button', { name: /filter by low severity/i }))
    // 2 low entries in mock data
    expect(screen.getByText('(2 entries)')).toBeInTheDocument()
  })

  it('TC-ATKLOG-009: log entries display as plain text (XSS prevention)', () => {
    render(<AttackLog />)
    // Verify a message is rendered as text, not parsed as HTML
    const message = screen.getByText(/MCP capability spoofing attempt detected/i)
    expect(message.tagName).toBe('P')
  })

  it('TC-ATKLOG-010: log container has role="log" and aria-label', () => {
    render(<AttackLog />)
    const logContainer = screen.getByRole('log', { name: /attack event log/i })
    expect(logContainer).toBeInTheDocument()
  })

  it('TC-ATKLOG-011: filter buttons have aria-pressed attribute', () => {
    render(<AttackLog />)
    const allBtn = screen.getByRole('button', { name: /filter by all severity/i })
    const criticalBtn = screen.getByRole('button', { name: /filter by critical severity/i })

    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
    expect(criticalBtn).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(criticalBtn)
    expect(allBtn).toHaveAttribute('aria-pressed', 'false')
    expect(criticalBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('TC-ATKLOG-012: applies custom className', () => {
    const { container } = render(<AttackLog className="my-log-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-log-class')
  })
})
