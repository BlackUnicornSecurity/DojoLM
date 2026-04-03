/**
 * File: session-pulse.test.tsx
 * Purpose: Unit tests for SessionPulse dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/lib/contexts/ActivityContext', () => ({ useActivityState: () => ({ events: [] }) }))

import { SessionPulse } from '../dashboard/widgets/SessionPulse'

describe('SessionPulse', () => {
  it('renders without crashing', () => { expect(render(<SessionPulse />).container).toBeTruthy() })
  it('wraps in WidgetCard', () => { render(<SessionPulse />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
