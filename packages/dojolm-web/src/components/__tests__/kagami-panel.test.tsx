/**
 * File: kagami-panel.test.tsx
 * Purpose: Unit tests for KagamiPanel component
 * Story: K5.1
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

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p></div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('./KagamiResults', () => ({
  KagamiResults: () => <div data-testid="kagami-results" />,
}))

vi.mock('./ProbeProgress', () => ({
  ProbeProgress: () => <div data-testid="probe-progress" />,
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

import { KagamiPanel } from '@/components/kagami/KagamiPanel'

describe('KagamiPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<KagamiPanel />)
    expect(container).toBeTruthy()
  })

  it('displays the Kagami header title', () => {
    render(<KagamiPanel />)
    expect(screen.getByText('Kagami — Model Mirror')).toBeInTheDocument()
  })

  it('displays Mode label', () => {
    render(<KagamiPanel />)
    expect(screen.getByText('Mode')).toBeInTheDocument()
  })

  it('renders the Run Fingerprint button', () => {
    render(<KagamiPanel />)
    expect(screen.getByText('Run Fingerprint')).toBeInTheDocument()
  })

  it('renders probe preset options', () => {
    render(<KagamiPanel />)
    expect(screen.getByText('Quick')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Full')).toBeInTheDocument()
  })
})
