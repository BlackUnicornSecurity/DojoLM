/**
 * File: threat-trend-widget.test.tsx
 * Purpose: Unit tests for ThreatTrendWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => mockLucideIcons('*'))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))
vi.mock('@/components/charts/TrendChart', () => ({ TrendChart: () => <div data-testid="trend-chart" /> }))
// Post-proxy-hang fix: ThreatTrendWidget uses useScannerMetrics which needs ScannerProvider.
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

import { ThreatTrendWidget } from '../dashboard/widgets/ThreatTrendWidget'

describe('ThreatTrendWidget', () => {
  it('renders without crashing', () => { expect(render(<ThreatTrendWidget />).container).toBeTruthy() })
  it('displays title', () => { render(<ThreatTrendWidget />); expect(screen.getByText(/Threat|Trend/i)).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<ThreatTrendWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
