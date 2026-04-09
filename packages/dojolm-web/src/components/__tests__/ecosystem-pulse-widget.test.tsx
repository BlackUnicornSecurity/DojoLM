/**
 * File: ecosystem-pulse-widget.test.tsx
 * Purpose: Unit tests for EcosystemPulseWidget dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>{label}: {value}</div>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid={`badge-${variant ?? 'default'}`}>{children}</span>
  ),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import { EcosystemPulseWidget } from '../dashboard/widgets/EcosystemPulseWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EcosystemPulseWidget', () => {
  it('renders without crashing', () => {
    mockFetchWithAuth.mockResolvedValue({ ok: false })
    const { container } = render(<EcosystemPulseWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Ecosystem Pulse" title', () => {
    mockFetchWithAuth.mockResolvedValue({ ok: false })
    render(<EcosystemPulseWidget />)
    expect(screen.getByText('Ecosystem Pulse')).toBeInTheDocument()
  })

  it('shows loading skeleton initially', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {})) // Never resolves
    render(<EcosystemPulseWidget />)
    const loading = screen.getByRole('status')
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })

  it('shows empty state when no ecosystem data', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { totalFindings: 0 } }),
    })
    render(<EcosystemPulseWidget />)
    await waitFor(() => {
      expect(screen.getByText('No ecosystem data yet')).toBeInTheDocument()
    })
  })

  it('renders metrics when data is available', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          totalFindings: 15,
          findings24h: 3,
          bySeverity: { CRITICAL: 1, WARNING: 5, INFO: 9 },
          byModule: { scanner: 5, atemi: 3 },
          byType: { prompt_injection: 8, data_leak: 7 },
          activeModules: ['scanner', 'atemi'],
        },
      }),
    })
    render(<EcosystemPulseWidget />)
    await waitFor(() => {
      expect(screen.getByTestId('metric-total-findings')).toBeInTheDocument()
      expect(screen.getByTestId('metric-last-24h')).toBeInTheDocument()
    })
  })

  it('renders module labels for active modules', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          totalFindings: 10,
          findings24h: 2,
          bySeverity: { CRITICAL: 0, WARNING: 3, INFO: 7 },
          byModule: { scanner: 4, atemi: 6 },
          byType: { prompt_injection: 10 },
          activeModules: ['scanner', 'atemi'],
        },
      }),
    })
    render(<EcosystemPulseWidget />)
    await waitFor(() => {
      expect(screen.getByText('Haiku Scanner')).toBeInTheDocument()
      expect(screen.getByText('Atemi Lab')).toBeInTheDocument()
    })
  })
})
