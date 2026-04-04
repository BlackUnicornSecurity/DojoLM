/**
 * File: agentic-lab.test.tsx
 * Purpose: Unit tests for AgenticLab component
 * Test IDs: AL-001 to AL-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
  Play: (props: Record<string, unknown>) => <svg data-testid="play-icon" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="shield-icon" {...props} />,
  Target: (props: Record<string, unknown>) => <svg data-testid="target-icon" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Settings2: (props: Record<string, unknown>) => <svg data-testid="settings-icon" {...props} />,
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; [k: string]: unknown }) => (
    <button data-testid="button" disabled={disabled} onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glow-card">{children}</div>,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}))

vi.mock('../agentic/ScenarioRunner', () => ({
  ScenarioRunner: ({ scenarioName }: { scenarioName: string }) => (
    <div data-testid="scenario-runner">{scenarioName}</div>
  ),
}))

import { AgenticLab } from '../agentic/AgenticLab'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockModels = [
  { id: 'model-1', name: 'GPT-4' },
  { id: 'model-2', name: 'Claude' },
]

describe('AgenticLab (AL-001 to AL-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          environmentReady: true,
          message: 'Agentic environment initialized',
          scenario: {
            scenarioId: 'agentic-openai-functions',
            scenarioName: 'OpenAI Functions Scenario',
            utilityScore: 8.4,
            securityScore: 7.1,
            combinedScore: 7.75,
            taskCompleted: true,
            injectionFollowed: false,
          },
        },
      }),
    }))
  })

  it('AL-001: renders module header with title and subtitle', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByText('Agentic Security Lab')).toBeInTheDocument()
    expect(screen.getByText(/Test tool-calling agents/)).toBeInTheDocument()
  })

  it('AL-002: renders all 6 architecture selector buttons', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByText('OpenAI Functions')).toBeInTheDocument()
    expect(screen.getByText('LangChain Tools')).toBeInTheDocument()
    expect(screen.getByText('Code Interpreter')).toBeInTheDocument()
    expect(screen.getByText('ReAct Agent')).toBeInTheDocument()
    expect(screen.getByText('MCP Tools')).toBeInTheDocument()
    expect(screen.getByText('Custom Schema')).toBeInTheDocument()
  })

  it('AL-003: renders all 8 tool category pills', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByText('Filesystem')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Browser')).toBeInTheDocument()
  })

  it('AL-004: renders difficulty and model select dropdowns', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByText('Target Model')).toBeInTheDocument()
    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('Injection Objective')).toBeInTheDocument()
  })

  it('AL-005: renders model options from props', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('AL-006: renders empty state when no results', () => {
    render(<AgenticLab availableModels={mockModels} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No test results yet')).toBeInTheDocument()
  })

  it('AL-007: run button is disabled when no model is selected', () => {
    render(<AgenticLab availableModels={mockModels} />)
    const runButton = screen.getByText('Run Agentic Test').closest('button')
    expect(runButton).toBeDisabled()
  })

  it('AL-008: running a configured scenario renders a result card', async () => {
    render(<AgenticLab availableModels={mockModels} />)

    fireEvent.change(screen.getByDisplayValue('Select model...'), {
      target: { value: 'model-1' },
    })
    fireEvent.click(screen.getByText('Run Agentic Test'))

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument()
    })
    expect(screen.getByText('OpenAI Functions Scenario')).toBeInTheDocument()
    expect(screen.getByText('Agentic environment initialized')).toBeInTheDocument()
  })

  it('AL-009: exposes the guided scenario runner once a target model is selected', () => {
    render(<AgenticLab availableModels={mockModels} />)

    expect(screen.getByText('Select a target model to unlock the guided scenario runner.')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Select model...'), {
      target: { value: 'model-1' },
    })

    expect(screen.getByTestId('scenario-runner')).toBeInTheDocument()
    expect(screen.getByText('OpenAI Functions Guided Run')).toBeInTheDocument()
  })
})
