/**
 * File: module-results.test.tsx
 * Purpose: Unit tests for ModuleResults component
 * Test IDs: MR-001 to MR-012
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span data-testid="badge" className={className} data-variant={variant}>{children}</span>
  ),
}))

vi.mock('../scanner/ModuleBadge', () => ({
  ModuleBadge: ({ moduleName }: { moduleName: string }) => (
    <span data-testid={`module-badge-${moduleName}`}>{moduleName}</span>
  ),
}))

vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="icon-chevron-down">v</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">&gt;</span>,
  ShieldAlert: () => <span data-testid="icon-shield-alert">!</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">W</span>,
  Info: () => <span data-testid="icon-info">i</span>,
}))

import { ModuleResults } from '../scanner/ModuleResults'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Record<string, unknown> = {}) {
  return {
    category: 'prompt-injection',
    severity: 'CRITICAL' as const,
    description: 'Test finding description',
    engine: 'enhanced-pi',
    match: 'ignore all',
    source: 'current' as const,
    pattern_name: 'system-override',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModuleResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('MR-001: returns null when findings array is empty', () => {
    const { container } = render(<ModuleResults findings={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('MR-002: renders "Results by Module" heading', () => {
    render(<ModuleResults findings={[makeFinding()]} />)
    expect(screen.getByText('Results by Module')).toBeInTheDocument()
  })

  it('MR-003: has region role with correct aria-label', () => {
    render(<ModuleResults findings={[makeFinding()]} />)
    expect(screen.getByRole('region', { name: 'Findings grouped by module' })).toBeInTheDocument()
  })

  it('MR-004: groups findings by engine', () => {
    const findings = [
      makeFinding({ engine: 'enhanced-pi' }),
      makeFinding({ engine: 'encoding-engine' }),
      makeFinding({ engine: 'enhanced-pi' }),
    ]
    render(<ModuleResults findings={findings} />)
    expect(screen.getByTestId('module-badge-enhanced-pi')).toBeInTheDocument()
    expect(screen.getByTestId('module-badge-encoding-engine')).toBeInTheDocument()
  })

  it('MR-005: critical section is expanded by default', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'CRITICAL' })]} />)
    const expandBtn = screen.getByRole('button')
    expect(expandBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('MR-006: non-critical section is collapsed by default', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'INFO' })]} />)
    const expandBtn = screen.getByRole('button')
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('MR-007: clicking section header toggles expansion', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'INFO' })]} />)
    const expandBtn = screen.getByRole('button')
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(expandBtn)
    expect(expandBtn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(expandBtn)
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('MR-008: displays severity count badges for critical findings', () => {
    const findings = [
      makeFinding({ severity: 'CRITICAL' }),
      makeFinding({ severity: 'CRITICAL' }),
    ]
    render(<ModuleResults findings={findings} />)
    expect(screen.getByText('2C')).toBeInTheDocument()
  })

  it('MR-009: shows finding description in expanded section', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'CRITICAL', description: 'Injection detected' })]} />)
    expect(screen.getByText('Injection detected')).toBeInTheDocument()
  })

  it('MR-010: shows match text in code block', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'CRITICAL', match: 'ignore all previous' })]} />)
    expect(screen.getByText('ignore all previous')).toBeInTheDocument()
  })

  it('MR-011: shows pattern name when present', () => {
    render(<ModuleResults findings={[makeFinding({ severity: 'CRITICAL', pattern_name: 'dan-override' })]} />)
    expect(screen.getByText(/dan-override/)).toBeInTheDocument()
  })

  it('MR-012: applies custom className', () => {
    const { container } = render(<ModuleResults findings={[makeFinding()]} className="my-class" />)
    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('my-class')
  })
})
