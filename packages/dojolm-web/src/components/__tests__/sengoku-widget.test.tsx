/**
 * File: sengoku-widget.test.tsx
 * Purpose: Unit tests for SengokuWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => new Proxy({}, { get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} /> }))
vi.mock('@/lib/NavigationContext', () => ({ useNavigation: () => ({ setActiveTab: vi.fn() }) }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))

import { SengokuWidget } from '../dashboard/widgets/SengokuWidget'

describe('SengokuWidget', () => {
  it('renders without crashing', () => { expect(render(<SengokuWidget />).container).toBeTruthy() })
  it('displays title', () => { render(<SengokuWidget />); expect(screen.getByText('Sengoku Campaigns')).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<SengokuWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
  it('shows campaign metrics', () => { render(<SengokuWidget />); expect(screen.getByText('3')).toBeInTheDocument() })
})
