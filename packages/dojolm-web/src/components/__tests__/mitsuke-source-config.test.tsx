/**
 * File: mitsuke-source-config.test.tsx
 * Purpose: Unit tests for MitsukeSourceConfig component
 * Story: H15.1
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  safeUUID: () => 'mock-uuid-1234',
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

import { MitsukeSourceConfig } from '@/components/strategic/MitsukeSourceConfig'

describe('MitsukeSourceConfig', () => {
  it('renders without crashing', () => {
    const { container } = render(<MitsukeSourceConfig />)
    expect(container).toBeTruthy()
  })

  it('displays the Mitsuke Source Configuration title', () => {
    render(<MitsukeSourceConfig />)
    expect(screen.getByText('Mitsuke Source Configuration')).toBeInTheDocument()
  })

  it('displays the SSRF Protected badge', () => {
    render(<MitsukeSourceConfig />)
    expect(screen.getByText('SSRF Protected')).toBeInTheDocument()
  })

  it('displays empty state message when no sources', () => {
    render(<MitsukeSourceConfig />)
    expect(screen.getByText(/No custom sources configured/)).toBeInTheDocument()
  })

  it('renders the Add Source button', () => {
    render(<MitsukeSourceConfig />)
    expect(screen.getByText('Add Source')).toBeInTheDocument()
  })
})
