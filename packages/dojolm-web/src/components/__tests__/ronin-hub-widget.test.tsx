/**
 * File: ronin-hub-widget.test.tsx
 * Purpose: Unit tests for RoninHubWidget dashboard widget
 * Story: NODA-3 Story 10.6
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: vi.fn() }),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => <span data-testid="badge" {...props}>{children}</span>,
}))

vi.mock('../WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}))

import { RoninHubWidget } from '@/components/dashboard/widgets/RoninHubWidget'

describe('RoninHubWidget', () => {
  it('renders without crashing', () => {
    render(<RoninHubWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<RoninHubWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Ronin Hub')
  })

  it('renders the Open action button', () => {
    render(<RoninHubWidget />)
    expect(screen.getByLabelText('Open Ronin Hub')).toBeInTheDocument()
  })

  it('displays metric labels', () => {
    render(<RoninHubWidget />)
    expect(screen.getByText('Submissions')).toBeInTheDocument()
    expect(screen.getByText('Subscribed')).toBeInTheDocument()
    expect(screen.getByText('Rewards')).toBeInTheDocument()
  })

  it('displays default zero values when localStorage is empty', () => {
    render(<RoninHubWidget />)
    const boldElements = screen.getAllByText('0')
    expect(boldElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renders metric icons', () => {
    render(<RoninHubWidget />)
    expect(screen.getByTestId('icon-Send')).toBeInTheDocument()
    expect(screen.getByTestId('icon-Star')).toBeInTheDocument()
    expect(screen.getByTestId('icon-DollarSign')).toBeInTheDocument()
  })
})
