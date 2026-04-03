/**
 * File: system-health-gauge.test.tsx
 * Purpose: Unit tests for SystemHealthGauge dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('@/components/ui/EnsoGauge', () => ({ EnsoGauge: ({ value }: { value: number }) => <div data-testid="enso-gauge">{value}</div> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/lib/client-data-cache', () => ({ getCachedFixtureManifest: vi.fn().mockReturnValue(null), getCachedScannerStats: vi.fn().mockReturnValue(null) }))
vi.mock('@/lib/contexts/GuardContext', () => ({ useGuardMode: () => ({ mode: 'shinobi', enabled: true }) }))

import { SystemHealthGauge } from '../dashboard/widgets/SystemHealthGauge'

describe('SystemHealthGauge', () => {
  it('renders without crashing', () => { expect(render(<SystemHealthGauge />).container).toBeTruthy() })
  it('displays title', () => { render(<SystemHealthGauge />); expect(screen.getByText(/System Health|Health/i)).toBeInTheDocument() })
  it('renders enso gauge', () => { render(<SystemHealthGauge />); expect(screen.getByTestId('enso-gauge')).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<SystemHealthGauge />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
