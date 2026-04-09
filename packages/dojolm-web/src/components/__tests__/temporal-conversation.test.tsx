/**
 * File: temporal-conversation.test.tsx
 * Purpose: Unit tests for TemporalConversation component
 * Story: DAITENGUYAMA M2.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { TemporalConversation } from '@/components/sengoku/TemporalConversation'

const mockTurns = [
  { role: 'user' as const, content: 'Hello there', turnNumber: 1 },
  { role: 'assistant' as const, content: 'Hi! How can I help?', turnNumber: 2 },
]

describe('TemporalConversation', () => {
  it('renders without crashing', () => {
    const { container } = render(<TemporalConversation turns={mockTurns} />)
    expect(container).toBeTruthy()
  })

  it('displays empty state when no turns', () => {
    render(<TemporalConversation turns={[]} />)
    expect(screen.getByText('No turns to display.')).toBeInTheDocument()
  })

  it('displays turn content in full mode', () => {
    render(<TemporalConversation turns={mockTurns} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Hi! How can I help?')).toBeInTheDocument()
  })

  it('displays User and Assistant role labels', () => {
    render(<TemporalConversation turns={mockTurns} />)
    expect(screen.getAllByText('User').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Assistant').length).toBeGreaterThan(0)
  })

  it('renders compact mode with truncated content', () => {
    render(<TemporalConversation turns={mockTurns} compact />)
    expect(screen.getByText('T1')).toBeInTheDocument()
    expect(screen.getByText('T2')).toBeInTheDocument()
  })
})
