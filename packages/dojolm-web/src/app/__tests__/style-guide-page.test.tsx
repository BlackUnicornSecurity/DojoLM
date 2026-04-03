/**
 * File: style-guide-page.test.tsx
 * Purpose: Unit tests for the Style Guide page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))

const mockNotFound = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => { mockNotFound(); throw new Error('NEXT_NOT_FOUND') },
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return {
    BrainCircuit: Icon,
    BookOpen: Icon,
    LayoutDashboard: Icon,
    Radar: Icon,
    ShieldHalf: Icon,
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
  emptyStatePresets: { noScans: { title: 'No scans', icon: undefined } },
}))

vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: ({ label, value }: { label: string; value: unknown }) => (
    <div data-testid="metric-card">{label}: {String(value)}</div>
  ),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title }: { title: string }) => <div data-testid="module-header">{title}</div>,
}))

vi.mock('@/components/ui/FilterPills', () => ({
  FilterPills: ({ filters }: { filters: { id: string; label: string }[] }) => (
    <div data-testid="filter-pills">{filters.map((f) => f.label).join(', ')}</div>
  ),
}))

import StyleGuidePage from '../style-guide/page'

describe('StyleGuidePage', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })

  it('renders without crashing in development mode', () => {
    expect(render(<StyleGuidePage />).container).toBeTruthy()
  })

  it('displays the page title', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('DojoLM Style Guide')).toBeInTheDocument()
  })

  it('contains Foundation Tokens section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Foundation Tokens')).toBeInTheDocument()
  })

  it('contains Typography section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Typography')).toBeInTheDocument()
  })

  it('contains Module Chrome section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Module Chrome')).toBeInTheDocument()
  })

  it('contains Actions And Status section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Actions And Status')).toBeInTheDocument()
  })

  it('contains Surface Tiers section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Surface Tiers')).toBeInTheDocument()
  })

  it('contains Data Presentation section', () => {
    render(<StyleGuidePage />)
    expect(screen.getByText('Data Presentation')).toBeInTheDocument()
  })

  it('renders metric cards', () => {
    render(<StyleGuidePage />)
    expect(screen.getAllByTestId('metric-card').length).toBeGreaterThan(0)
  })

  it('calls notFound in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => render(<StyleGuidePage />)).toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })
})
