/**
 * File: session-pulse.test.tsx
 * Purpose: Unit tests for SessionPulse dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => mockLucideIcons('*'))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/lib/contexts/ActivityContext', () => ({ useActivityState: () => ({ events: [] }) }))
// Post-proxy-hang fix: SessionPulse uses useScannerMetrics which needs ScannerProvider.
vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    scanText: () => {},
    scanResult: null,
    isScanning: false,
    engineFilters: [],
    toggleFilter: () => {},
    resetFilters: () => {},
  }),
}))

import { SessionPulse } from '../dashboard/widgets/SessionPulse'

describe('SessionPulse', () => {
  it('renders without crashing', () => { expect(render(<SessionPulse />).container).toBeTruthy() })
  it('wraps in WidgetCard', () => { render(<SessionPulse />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
