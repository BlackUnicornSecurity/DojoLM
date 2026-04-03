/**
 * File: mitsuke-alert-widget.test.tsx
 * Purpose: Unit tests for MitsukeAlertWidget dashboard widget
 * Story: TPI-NODA-1.5.8
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

vi.mock('../WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

import { MitsukeAlertWidget } from '@/components/dashboard/widgets/MitsukeAlertWidget'

describe('MitsukeAlertWidget', () => {
  it('renders without crashing', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Mitsuke Alerts')
  })

  it('renders the View Mitsuke action button', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByLabelText('View Mitsuke alerts')).toBeInTheDocument()
  })

  it('displays all 4 mock alerts', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByText('Novel prompt injection variant detected')).toBeInTheDocument()
    expect(screen.getByText('Model extraction technique in MITRE feed')).toBeInTheDocument()
    expect(screen.getByText('Jailbreak bypass via multi-turn conversation')).toBeInTheDocument()
    expect(screen.getByText('Supply chain advisory: typosquatting package')).toBeInTheDocument()
  })

  it('displays severity badges in uppercase', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    expect(screen.getAllByText('HIGH')).toHaveLength(2)
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('shows unacknowledged alert count badge', () => {
    render(<MitsukeAlertWidget />)
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})
