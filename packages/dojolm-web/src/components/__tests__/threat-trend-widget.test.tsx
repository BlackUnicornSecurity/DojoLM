/**
 * File: threat-trend-widget.test.tsx
 * Purpose: Unit tests for ThreatTrendWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/components/charts/TrendChart', () => ({ TrendChart: () => <div data-testid="trend-chart" /> }))

import { ThreatTrendWidget } from '../dashboard/widgets/ThreatTrendWidget'

describe('ThreatTrendWidget', () => {
  it('renders without crashing', () => { expect(render(<ThreatTrendWidget />).container).toBeTruthy() })
  it('displays title', () => { render(<ThreatTrendWidget />); expect(screen.getByText(/Threat|Trend/i)).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<ThreatTrendWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
