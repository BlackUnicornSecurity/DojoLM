/**
 * File: threat-radar.test.tsx
 * Purpose: Unit tests for ThreatRadar dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/lib/contexts/ActivityContext', () => ({ useActivityState: () => ({ events: [] }) }))

import { ThreatRadar } from '../dashboard/widgets/ThreatRadar'

describe('ThreatRadar', () => {
  it('renders without crashing', () => { expect(render(<ThreatRadar />).container).toBeTruthy() })
  it('displays title', () => { render(<ThreatRadar />); expect(screen.getByText(/Threat|Radar/i)).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<ThreatRadar />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
