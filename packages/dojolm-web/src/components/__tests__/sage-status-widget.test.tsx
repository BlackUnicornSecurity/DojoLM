/**
 * File: sage-status-widget.test.tsx
 * Purpose: Unit tests for SAGEStatusWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('@/lib/NavigationContext', () => ({ useNavigation: () => ({ setActiveTab: vi.fn() }) }))
vi.mock('@/components/ui/MetricCard', () => ({ MetricCard: ({ label, value }: { label: string; value: unknown }) => <div data-testid="metric-card">{label}: {String(value)}</div> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))

import { SAGEStatusWidget } from '../dashboard/widgets/SAGEStatusWidget'

describe('SAGEStatusWidget', () => {
  it('renders without crashing', () => { expect(render(<SAGEStatusWidget />).container).toBeTruthy() })
  it('displays SAGE title', () => { render(<SAGEStatusWidget />); expect(screen.getByText(/SAGE/i)).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<SAGEStatusWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
