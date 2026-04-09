/**
 * File: arena-rules-widget.test.tsx
 * Purpose: Unit tests for ArenaRulesWidget component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

import { ArenaRulesWidget } from '@/components/strategic/arena/ArenaRulesWidget'

describe('ArenaRulesWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<ArenaRulesWidget />)
    expect(container).toBeTruthy()
  })

  it('displays the Battle Rules title', () => {
    render(<ArenaRulesWidget />)
    expect(screen.getByText('Battle Rules')).toBeInTheDocument()
  })

  it('displays all three game mode names', () => {
    render(<ArenaRulesWidget />)
    expect(screen.getByText('Capture the Flag')).toBeInTheDocument()
    expect(screen.getByText('King of the Hill')).toBeInTheDocument()
    expect(screen.getByText('Red vs Blue')).toBeInTheDocument()
  })

  it('expands a rule section on click', () => {
    render(<ArenaRulesWidget />)
    fireEvent.click(screen.getByLabelText('Capture the Flag rules'))
    expect(screen.getByText('OBJECTIVE')).toBeInTheDocument()
    expect(screen.getByText('SCORING')).toBeInTheDocument()
  })

  it('displays the mode descriptions', () => {
    render(<ArenaRulesWidget />)
    expect(screen.getByText(/attacker attempts to inject/)).toBeInTheDocument()
  })
})
