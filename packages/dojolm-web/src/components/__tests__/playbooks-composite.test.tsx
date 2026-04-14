/**
 * File: playbooks-composite.test.tsx
 * Purpose: Unit tests for PlaybooksComposite component
 * Test IDs: PBC-001 to PBC-008
 * Story: 4.3.2 — remove generateMockFindings / setTimeout mock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  BookOpen: (props: Record<string, unknown>) => <svg data-testid="book-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
  Globe: (props: Record<string, unknown>) => <svg data-testid="globe-icon" {...props} />,
  Swords: (props: Record<string, unknown>) => <svg data-testid="swords-icon" {...props} />,
  Activity: (props: Record<string, unknown>) => <svg data-testid="activity-icon" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: ReactNode; [k: string]: unknown }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, 'aria-disabled': ariaDisabled, onClick, ...props }: {
    children: ReactNode;
    disabled?: boolean;
    'aria-disabled'?: string;
    onClick?: () => void;
    [k: string]: unknown;
  }) => (
    <button disabled={disabled} aria-disabled={ariaDisabled} onClick={onClick} data-testid="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/adversarial/PlaybookRunner', () => ({
  PlaybookRunner: () => <div data-testid="playbook-runner">PlaybookRunner</div>,
}))

vi.mock('@/components/scanner/ProtocolFuzzPanel', () => ({
  ProtocolFuzzPanel: () => <div data-testid="protocol-fuzz-panel">ProtocolFuzzPanel</div>,
}))

vi.mock('@/components/agentic/AgenticLab', () => ({
  AgenticLab: () => <div data-testid="agentic-lab">AgenticLab</div>,
}))

// ---------------------------------------------------------------------------
// Import under test (relative since the file mocks use relative paths)
// ---------------------------------------------------------------------------

import { PlaybooksComposite } from '../adversarial/PlaybooksComposite'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function switchToWebMCP() {
  const btn = screen.getAllByRole('button').find((b) => b.textContent?.includes('WebMCP'))
  if (!btn) throw new Error('WebMCP tab not found')
  fireEvent.click(btn)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaybooksComposite (PBC-001 to PBC-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PBC-001: renders Custom, Protocol Fuzz, Agentic, WebMCP tabs', () => {
    render(<PlaybooksComposite />)
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Protocol Fuzz')).toBeInTheDocument()
    expect(screen.getByText('Agentic')).toBeInTheDocument()
    expect(screen.getByText('WebMCP')).toBeInTheDocument()
  })

  it('PBC-002: Custom tab active by default — renders PlaybookRunner', () => {
    render(<PlaybooksComposite />)
    expect(screen.getByTestId('playbook-runner')).toBeInTheDocument()
  })

  it('PBC-003: WebMCP tab shows "WebMCP Attack Testing" heading', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    expect(screen.getByText('WebMCP Attack Testing')).toBeInTheDocument()
  })

  it('PBC-004: WebMCP Execute Tests button is disabled', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    const btn = screen.getAllByTestId('button').find((b) => b.textContent?.includes('Execute Tests'))
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('PBC-005: WebMCP shows not-yet-available notice with role="status"', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    const notice = screen.getByRole('status')
    expect(notice.textContent).toMatch(/not yet available/i)
  })

  it('PBC-006: no results table or mock findings rendered', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    expect(screen.queryByText(/Findings \(/)).not.toBeInTheDocument()
  })

  it('PBC-007: no consent dialog rendered initially', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('PBC-008: WebMCP target URL input accepts text', () => {
    render(<PlaybooksComposite />)
    switchToWebMCP()
    const input = screen.getByLabelText('Target MCP server URL')
    fireEvent.change(input, { target: { value: 'https://example.com/mcp' } })
    expect(input).toHaveValue('https://example.com/mcp')
  })
})
