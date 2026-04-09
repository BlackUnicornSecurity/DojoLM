/**
 * File: system-prompt-hardener.test.tsx
 * Purpose: Unit tests for SystemPromptHardener component
 * Story: H22.4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

import { SystemPromptHardener } from '@/components/guard/SystemPromptHardener'

describe('SystemPromptHardener', () => {
  it('renders without crashing', () => {
    const { container } = render(<SystemPromptHardener />)
    expect(container).toBeTruthy()
  })

  it('displays the System Prompt Hardener heading', () => {
    render(<SystemPromptHardener />)
    expect(screen.getByText('System Prompt Hardener')).toBeInTheDocument()
  })

  it('renders the textarea with label', () => {
    render(<SystemPromptHardener />)
    expect(screen.getByLabelText('Input System Prompt')).toBeInTheDocument()
  })

  it('renders the Analyze & Harden button', () => {
    render(<SystemPromptHardener />)
    expect(screen.getByText('Analyze & Harden')).toBeInTheDocument()
  })

  it('wraps content in a GlowCard', () => {
    render(<SystemPromptHardener />)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
  })
})
