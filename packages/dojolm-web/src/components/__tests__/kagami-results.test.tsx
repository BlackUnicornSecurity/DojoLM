/**
 * File: kagami-results.test.tsx
 * Purpose: Unit tests for KagamiResults component
 * Story: K5.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

import { KagamiResults } from '@/components/kagami/KagamiResults'

describe('KagamiResults', () => {
  it('renders nothing when no result or verification provided', () => {
    const { container } = render(<KagamiResults />)
    expect(container.firstChild).toBeNull()
  })

  it('renders identification results header when result is provided', () => {
    const mockResult = {
      candidates: [
        {
          modelId: 'gpt-4',
          provider: 'OpenAI',
          modelFamily: 'GPT',
          confidence: 0.92,
          matchedFeatures: ['style'],
          divergentFeatures: [],
          distance: 0.08,
        },
      ],
      totalProbes: 76,
      elapsed: 5000,
    }
    render(<KagamiResults result={mockResult as never} />)
    expect(screen.getByText('Identification Results')).toBeInTheDocument()
  })

  it('renders Export JSON button when results exist', () => {
    const mockResult = {
      candidates: [],
      totalProbes: 10,
      elapsed: 1000,
    }
    render(<KagamiResults result={mockResult as never} />)
    expect(screen.getByText('Export JSON')).toBeInTheDocument()
  })

  it('renders verification header when verification is provided', () => {
    const mockVerification = {
      match: true,
      expectedSignature: { modelId: 'gpt-4', provider: 'OpenAI' },
      driftScore: 0.05,
      divergentFeatures: [],
    }
    render(<KagamiResults verification={mockVerification as never} />)
    expect(screen.getByText('Verification Result')).toBeInTheDocument()
  })
})
