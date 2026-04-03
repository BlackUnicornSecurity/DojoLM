/**
 * File: compliance-bars-widget.test.tsx
 * Purpose: Unit tests for ComplianceBarsWidget dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
}))

vi.mock('@/components/ui/EnhancedProgress', () => ({
  EnhancedProgress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value} />
  ),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      {children}
    </div>
  ),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import { ComplianceBarsWidget } from '../dashboard/widgets/ComplianceBarsWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComplianceBarsWidget', () => {
  it('renders without crashing', () => {
    mockFetchWithAuth.mockResolvedValue({ ok: false })
    const { container } = render(<ComplianceBarsWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Compliance Coverage" title', () => {
    mockFetchWithAuth.mockResolvedValue({ ok: false })
    render(<ComplianceBarsWidget />)
    expect(screen.getByText('Compliance Coverage')).toBeInTheDocument()
  })

  it('shows loading text initially', () => {
    mockFetchWithAuth.mockResolvedValue(new Promise(() => {})) // Never resolves
    render(<ComplianceBarsWidget />)
    expect(screen.getByText('Loading compliance data...')).toBeInTheDocument()
  })

  it('shows "No compliance data available" when API returns empty', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ frameworks: [] }),
    })
    render(<ComplianceBarsWidget />)
    await waitFor(() => {
      expect(screen.getByText('No compliance data available')).toBeInTheDocument()
    })
  })

  it('renders framework bars when data is available', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        frameworks: [
          { name: 'OWASP', avgCoverage: 85 },
          { name: 'NIST', avgCoverage: 60 },
        ],
      }),
    })
    render(<ComplianceBarsWidget />)
    await waitFor(() => {
      expect(screen.getByText('OWASP')).toBeInTheDocument()
      expect(screen.getByText('NIST')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
    })
  })

  it('renders "Bushido Book" action link', () => {
    mockFetchWithAuth.mockResolvedValue({ ok: false })
    render(<ComplianceBarsWidget />)
    expect(screen.getByText('Bushido Book')).toBeInTheDocument()
  })
})
