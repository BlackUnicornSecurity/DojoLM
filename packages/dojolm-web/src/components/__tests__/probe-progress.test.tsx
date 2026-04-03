/**
 * File: probe-progress.test.tsx
 * Purpose: Unit tests for ProbeProgress component
 * Story: K5.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

vi.mock('@/lib/authenticated-event-stream', () => ({
  connectAuthenticatedEventStream: vi.fn(() => ({
    addEventListener: vi.fn(),
    close: vi.fn(),
  })),
}))

import { ProbeProgress } from '@/components/kagami/ProbeProgress'

describe('ProbeProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProbeProgress streamId="test-stream-1" />)
    expect(container).toBeTruthy()
  })

  it('displays the phase labels', () => {
    render(<ProbeProgress streamId="test-stream-1" />)
    expect(screen.getByText('Probing')).toBeInTheDocument()
    expect(screen.getByText('Analyzing')).toBeInTheDocument()
    expect(screen.getByText('Matching')).toBeInTheDocument()
  })

  it('displays a progress bar', () => {
    render(<ProbeProgress streamId="test-stream-1" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays initial probe count as 0 / 0', () => {
    render(<ProbeProgress streamId="test-stream-1" />)
    expect(screen.getByText('Probe 0 / 0')).toBeInTheDocument()
  })

  it('displays Initializing text', () => {
    render(<ProbeProgress streamId="test-stream-1" />)
    expect(screen.getByText('Initializing...')).toBeInTheDocument()
  })
})
