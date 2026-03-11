/**
 * File: playbook-runner.test.tsx
 * Purpose: Tests for PlaybookRunner component
 * Test IDs: PBR-001 to PBR-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
    <div className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, title }: { children: ReactNode; className?: string; title?: string }) => (
    <span className={className} title={title}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

vi.mock('@/lib/adversarial-skills-types', () => ({}))

vi.mock('@/lib/adversarial-skills-extended', () => ({
  getAnySkillById: (id: string) => {
    const skills: Record<string, { name: string }> = {
      'recon-system-prompt-extraction': { name: 'System Prompt Extraction' },
      'recon-guardrail-boundary-mapping': { name: 'Guardrail Boundary Mapping' },
      'recon-available-tool-enumeration': { name: 'Available Tool Enumeration' },
      'recon-context-window-probing': { name: 'Context Window Probing' },
    }
    return skills[id] ?? null
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { PlaybookRunner } from '../adversarial/PlaybookRunner'

// ===========================================================================
// PBR-001: Renders playbook list heading
// ===========================================================================
describe('PBR-001: Renders playbook list heading', () => {
  it('shows Red Team Playbooks heading', () => {
    render(<PlaybookRunner />)
    expect(screen.getByText('Red Team Playbooks')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-002: Shows guidance text
// ===========================================================================
describe('PBR-002: Shows guidance text', () => {
  it('shows instruction text to select a playbook', () => {
    render(<PlaybookRunner />)
    expect(screen.getByText(/Guided multi-step adversarial workflows/)).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-003: Renders all 4 playbook cards
// ===========================================================================
describe('PBR-003: Renders all playbook cards', () => {
  it('shows all playbook names', () => {
    render(<PlaybookRunner />)
    expect(screen.getByText('Full Reconnaissance Sweep')).toBeInTheDocument()
    expect(screen.getByText('Injection Escalation Chain')).toBeInTheDocument()
    expect(screen.getByText('Data Exfiltration Audit')).toBeInTheDocument()
    expect(screen.getByText('Evasion Techniques Toolkit')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-004: Playbook card shows difficulty badge
// ===========================================================================
describe('PBR-004: Playbook card shows difficulty badge', () => {
  it('renders difficulty and category badges on cards', () => {
    render(<PlaybookRunner />)
    expect(screen.getByText('intermediate')).toBeInTheDocument()
    expect(screen.getAllByText('advanced').length).toBeGreaterThan(0)
    expect(screen.getByText('expert')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-005: Playbook card shows estimated time and steps
// ===========================================================================
describe('PBR-005: Playbook card shows estimated time and steps', () => {
  it('renders estimated time and step count', () => {
    render(<PlaybookRunner />)
    expect(screen.getAllByText('~15 min').length).toBeGreaterThan(0)
    expect(screen.getAllByText('4 steps').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// PBR-006: Playbook card shows OWASP mappings
// ===========================================================================
describe('PBR-006: Playbook card shows OWASP mappings', () => {
  it('renders OWASP badges on playbook cards', () => {
    render(<PlaybookRunner />)
    expect(screen.getAllByText('LLM06').length).toBeGreaterThan(0)
    expect(screen.getAllByText('LLM01').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// PBR-007: Clicking playbook opens executor
// ===========================================================================
describe('PBR-007: Clicking playbook opens executor', () => {
  it('navigates to PlaybookExecutor when card is clicked', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    // Should show executor view with Back button and playbook name
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Full Reconnaissance Sweep')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-008: Executor shows objectives
// ===========================================================================
describe('PBR-008: Executor shows objectives', () => {
  it('displays playbook objectives in executor view', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    expect(screen.getByText('Objectives')).toBeInTheDocument()
    expect(screen.getByText('Extract system prompt')).toBeInTheDocument()
    expect(screen.getByText('Map guardrail boundaries')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-009: Executor shows step timeline
// ===========================================================================
describe('PBR-009: Executor shows step timeline', () => {
  it('displays numbered steps in the timeline', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    expect(screen.getByText('1. System Prompt Extraction')).toBeInTheDocument()
    expect(screen.getByText('2. Guardrail Boundary Mapping')).toBeInTheDocument()
    expect(screen.getByText('3. Tool Enumeration')).toBeInTheDocument()
    expect(screen.getByText('4. Context Window Probing')).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-010: Active step shows guidance
// ===========================================================================
describe('PBR-010: Active step shows guidance', () => {
  it('shows guidance text for the currently active step', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    expect(screen.getByText('Guidance')).toBeInTheDocument()
    expect(screen.getByText(/Start with direct requests/)).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-011: Mark Complete advances to next step
// ===========================================================================
describe('PBR-011: Mark Complete advances step', () => {
  it('advances to next step when Mark Complete is clicked', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    expect(screen.getByText(/0\/4 steps/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Mark Complete'))
    expect(screen.getByText(/1\/4 steps/)).toBeInTheDocument()
    // Should now show step 2 guidance
    expect(screen.getByText(/Escalate gradually/)).toBeInTheDocument()
  })
})

// ===========================================================================
// PBR-012: Back button returns to playbook list
// ===========================================================================
describe('PBR-012: Back button returns to list', () => {
  it('returns to playbook list when Back is clicked', () => {
    render(<PlaybookRunner />)
    fireEvent.click(screen.getByText('Full Reconnaissance Sweep'))
    fireEvent.click(screen.getByText('Back'))
    // Should be back to the list
    expect(screen.getByText('Red Team Playbooks')).toBeInTheDocument()
    expect(screen.getByText('Injection Escalation Chain')).toBeInTheDocument()
  })
})
