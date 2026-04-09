/**
 * File: threat-radar.test.tsx
 * Purpose: Unit tests for ThreatRadar dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => mockLucideIcons('*'))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/lib/contexts/ActivityContext', () => ({ useActivityState: () => ({ events: [] }) }))
// Post-proxy-hang fix: ThreatRadar pulls useScannerMetrics which needs ScannerProvider.
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
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: vi.fn() }),
    NavigationContext: createContext(null as unknown),
  }
})

import { ThreatRadar } from '../dashboard/widgets/ThreatRadar'

describe('ThreatRadar', () => {
  it('renders without crashing', () => { expect(render(<ThreatRadar />).container).toBeTruthy() })
  it('displays title', () => { render(<ThreatRadar />); expect(screen.getAllByText(/Threat|Radar/i).length).toBeGreaterThan(0) })
  it('wraps in WidgetCard', () => { render(<ThreatRadar />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
