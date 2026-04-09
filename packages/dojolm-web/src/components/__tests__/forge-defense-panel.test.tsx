/**
 * File: forge-defense-panel.test.tsx
 * Purpose: Unit tests for ForgeDefensePanel component
 * Story: H22.3
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

import { ForgeDefensePanel } from '@/components/guard/ForgeDefensePanel'

describe('ForgeDefensePanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<ForgeDefensePanel />)
    expect(container).toBeTruthy()
  })

  it('displays the Forge Defense heading', () => {
    render(<ForgeDefensePanel />)
    expect(screen.getByText('Forge Defense')).toBeInTheDocument()
  })

  it('renders the All category filter button', () => {
    render(<ForgeDefensePanel />)
    expect(screen.getByText(/^All \(/)).toBeInTheDocument()
  })

  it('renders defense template cards', () => {
    render(<ForgeDefensePanel />)
    expect(screen.getByText('Strict Role Anchoring')).toBeInTheDocument()
    expect(screen.getByText('Input Sanitizer')).toBeInTheDocument()
  })

  it('wraps content in a GlowCard', () => {
    render(<ForgeDefensePanel />)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
  })
})
