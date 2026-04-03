/**
 * File: time-chamber-widget.test.tsx
 * Purpose: Unit tests for TimeChamberWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('@/lib/NavigationContext', () => ({ useNavigation: () => ({ setActiveTab: vi.fn() }) }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))

import { TimeChamberWidget } from '../dashboard/widgets/TimeChamberWidget'

describe('TimeChamberWidget', () => {
  it('renders without crashing', () => { expect(render(<TimeChamberWidget />).container).toBeTruthy() })
  it('wraps in WidgetCard', () => { render(<TimeChamberWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
