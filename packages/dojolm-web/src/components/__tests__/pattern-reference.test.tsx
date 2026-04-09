/**
 * File: pattern-reference.test.tsx
 * Purpose: Unit tests for PatternReference component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  escHtml: (s: string) => s,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

import { PatternReference } from '@/components/reference/PatternReference'

const mockGroups = [
  {
    name: 'Injection Patterns',
    type: 'current' as const,
    patterns: [
      { name: 'pi-direct-001', cat: 'prompt-injection', sev: 'CRITICAL', desc: 'Direct prompt injection' },
    ],
  },
]

describe('PatternReference', () => {
  it('renders without crashing', () => {
    const { container } = render(<PatternReference patternGroups={mockGroups} />)
    expect(container).toBeTruthy()
  })

  it('displays the Pattern Reference title', () => {
    render(<PatternReference patternGroups={mockGroups} />)
    expect(screen.getByText('Pattern Reference')).toBeInTheDocument()
  })

  it('displays group names', () => {
    render(<PatternReference patternGroups={mockGroups} />)
    expect(screen.getByText('Injection Patterns')).toBeInTheDocument()
  })

  it('displays pattern descriptions', () => {
    render(<PatternReference patternGroups={mockGroups} />)
    expect(screen.getByText('Direct prompt injection')).toBeInTheDocument()
  })

  it('renders the search input', () => {
    render(<PatternReference patternGroups={mockGroups} />)
    expect(screen.getByPlaceholderText('Search patterns...')).toBeInTheDocument()
  })
})
