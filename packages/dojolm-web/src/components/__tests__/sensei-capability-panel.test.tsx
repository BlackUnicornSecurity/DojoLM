/**
 * File: sensei-capability-panel.test.tsx
 * Purpose: Unit tests for SenseiCapabilityPanel component
 * Test IDs: SCP-001 to SCP-007
 * Story: 6.1.1 — registry-backed capability summary
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

vi.mock('lucide-react', () => ({
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
}))

// Controlled mock with 6 tools: 2 query, 1 write, 1 confirm, 2 navigate
vi.mock('@/lib/sensei/tool-definitions', () => ({
  SENSEI_TOOLS: [
    { name: 'list_models', endpoint: '/api/llm/models', mutating: false, requiresConfirmation: false },
    { name: 'get_stats',   endpoint: '/api/stats',      mutating: false, requiresConfirmation: false },
    { name: 'run_test',    endpoint: '/api/llm/execute', mutating: true,  requiresConfirmation: true  },
    { name: 'fingerprint', endpoint: '/api/llm/fingerprint', mutating: false, requiresConfirmation: true },
    { name: 'navigate_to',    endpoint: '__client__', mutating: false, requiresConfirmation: false },
    { name: 'explain_feature', endpoint: '__client__', mutating: false, requiresConfirmation: false },
  ],
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { SenseiCapabilityPanel } from '@/components/sensei/SenseiCapabilityPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiCapabilityPanel (SCP-001 to SCP-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SCP-001: renders root element with data-testid capability-panel', () => {
    render(<SenseiCapabilityPanel />)
    expect(screen.getByTestId('capability-panel')).toBeInTheDocument()
  })

  it('SCP-002: shows total capability count derived from SENSEI_TOOLS', () => {
    render(<SenseiCapabilityPanel />)
    // Mock has 6 tools
    expect(screen.getByText('6 capabilities')).toBeInTheDocument()
  })

  it('SCP-003: collapsed by default — expanded section not present', () => {
    render(<SenseiCapabilityPanel />)
    expect(screen.queryByTestId('capability-panel-expanded')).not.toBeInTheDocument()
  })

  it('SCP-004: toggle button has aria-expanded=false when collapsed', () => {
    render(<SenseiCapabilityPanel />)
    const btn = screen.getByLabelText('Toggle capability summary')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('SCP-005: clicking toggle expands the panel', () => {
    render(<SenseiCapabilityPanel />)
    fireEvent.click(screen.getByLabelText('Toggle capability summary'))
    expect(screen.getByTestId('capability-panel-expanded')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle capability summary')).toHaveAttribute('aria-expanded', 'true')
  })

  it('SCP-006: expanded view shows all 4 group labels', () => {
    render(<SenseiCapabilityPanel />)
    fireEvent.click(screen.getByLabelText('Toggle capability summary'))
    expect(screen.getByTestId('group-query')).toBeInTheDocument()
    expect(screen.getByTestId('group-write')).toBeInTheDocument()
    expect(screen.getByTestId('group-confirm')).toBeInTheDocument()
    expect(screen.getByTestId('group-navigate')).toBeInTheDocument()
  })

  it('SCP-007: navigate group contains navigate_to and explain_feature tool names', () => {
    render(<SenseiCapabilityPanel />)
    fireEvent.click(screen.getByLabelText('Toggle capability summary'))
    const navigateGroup = screen.getByTestId('group-navigate')
    expect(navigateGroup).toHaveTextContent('navigate_to')
    expect(navigateGroup).toHaveTextContent('explain_feature')
  })
})
