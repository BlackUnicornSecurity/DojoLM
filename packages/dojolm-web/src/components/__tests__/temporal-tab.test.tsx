/**
 * File: temporal-tab.test.tsx
 * Purpose: Unit tests for TemporalTab component (Sengoku temporal attack plans)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return {
    ChevronRight: Icon, ChevronDown: Icon, Zap: Icon, Clock: Icon,
    Layers: Icon, MessageSquare: Icon, Brain: Icon, RefreshCw: Icon, Timer: Icon,
    User: Icon, Bot: Icon,
  }
})

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glow-card">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}))

vi.mock('../sengoku/TemporalConversation', () => ({
  TemporalConversation: ({ turns }: { turns: { content: string }[] }) => (
    <div data-testid="temporal-conversation">{turns.length} turns</div>
  ),
}))

import { TemporalTab } from '../sengoku/TemporalTab'

describe('TemporalTab', () => {
  it('renders without crashing', () => {
    expect(render(<TemporalTab />).container).toBeTruthy()
  })

  it('renders plan list with demo plans', () => {
    render(<TemporalTab />)
    expect(screen.getByText('Gradual Jailbreak Escalation')).toBeInTheDocument()
    expect(screen.getByText('Sleeper Prompt Activation')).toBeInTheDocument()
    expect(screen.getByText('Persistent Role Override')).toBeInTheDocument()
    expect(screen.getByText('Identity Erosion via Drift')).toBeInTheDocument()
  })

  it('shows attack type badges', () => {
    render(<TemporalTab />)
    expect(screen.getByText('Accumulation')).toBeInTheDocument()
    expect(screen.getByText('Delayed Activation')).toBeInTheDocument()
    expect(screen.getByText('Session Persistence')).toBeInTheDocument()
    expect(screen.getByText('Persona Drift')).toBeInTheDocument()
  })

  it('shows turn counts', () => {
    render(<TemporalTab />)
    expect(screen.getAllByText('5 turns').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('4 turns')).toBeInTheDocument()
    expect(screen.getByText('6 turns')).toBeInTheDocument()
  })

  it('expands a plan when clicked', () => {
    render(<TemporalTab />)
    const planButton = screen.getByLabelText(/Plan: Gradual Jailbreak Escalation/i)
    fireEvent.click(planButton)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
    expect(screen.getByTestId('temporal-conversation')).toBeInTheDocument()
  })

  it('collapses expanded plan when clicked again', () => {
    render(<TemporalTab />)
    const planButton = screen.getByLabelText(/Plan: Gradual Jailbreak Escalation/i)
    fireEvent.click(planButton)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
    fireEvent.click(planButton)
    expect(screen.queryByTestId('glow-card')).not.toBeInTheDocument()
  })

  it('shows plan description in each row', () => {
    render(<TemporalTab />)
    expect(screen.getByText(/Incrementally escalates requests/i)).toBeInTheDocument()
  })

  it('renders plan detail header when expanded', () => {
    render(<TemporalTab />)
    const planButton = screen.getByLabelText(/Plan: Gradual Jailbreak Escalation/i)
    fireEvent.click(planButton)
    expect(screen.getAllByText('Gradual Jailbreak Escalation').length).toBeGreaterThanOrEqual(2)
  })
})
