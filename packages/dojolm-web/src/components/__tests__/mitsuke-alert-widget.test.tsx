/**
 * File: mitsuke-alert-widget.test.tsx
 * Purpose: Unit tests for MitsukeAlertWidget dashboard widget
 * Story: TPI-NODA-1.5.8; Story 2.1.3 — wired to /api/mitsuke/entries (no mock data)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions, className }: { title: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) => (
    <div data-testid="widget-card" className={className}>
      <div data-testid="widget-title">{title}</div>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

import { MitsukeAlertWidget } from '@/components/dashboard/widgets/MitsukeAlertWidget'

describe('MitsukeAlertWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<MitsukeAlertWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<MitsukeAlertWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Mitsuke Alerts')
  })

  it('renders the View Mitsuke action button', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<MitsukeAlertWidget />)
    expect(screen.getByLabelText('View Mitsuke alerts')).toBeInTheDocument()
  })

  it('"View Mitsuke" button navigates to mitsuke', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<MitsukeAlertWidget />)
    fireEvent.click(screen.getByLabelText('View Mitsuke alerts'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('mitsuke')
  })

  it('shows empty state on network error', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<MitsukeAlertWidget />)
    await waitFor(() => {
      expect(screen.getByText('No alerts')).toBeInTheDocument()
    })
  })

  it('shows empty state when entries array is empty', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [], total: 0, limit: 4, offset: 0, hasMore: false }),
    })
    render(<MitsukeAlertWidget />)
    await waitFor(() => {
      expect(screen.getByText('No alerts')).toBeInTheDocument()
      expect(screen.getByText('Threat feed is clear')).toBeInTheDocument()
    })
  })

  it('renders API-provided alerts with severity badges', async () => {
    const now = new Date().toISOString()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          { id: 'e1', severity: 'CRITICAL', title: 'Novel injection detected', firstSeen: now, source: 'feed', threatType: 'injection', description: '', indicators: [], confidence: 90, lastSeen: now, createdAt: now },
          { id: 'e2', severity: 'HIGH', title: 'Extraction in MITRE feed', firstSeen: now, source: 'feed', threatType: 'extraction', description: '', indicators: [], confidence: 80, lastSeen: now, createdAt: now },
        ],
        total: 2, limit: 4, offset: 0, hasMore: false,
      }),
    })
    render(<MitsukeAlertWidget />)
    await waitFor(() => {
      expect(screen.getByText('Novel injection detected')).toBeInTheDocument()
      expect(screen.getByText('Extraction in MITRE feed')).toBeInTheDocument()
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
    })
  })

  it('shows critical count badge when CRITICAL entries present', async () => {
    const now = new Date().toISOString()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          { id: 'e1', severity: 'CRITICAL', title: 'Critical threat', firstSeen: now, source: 'feed', threatType: 'injection', description: '', indicators: [], confidence: 90, lastSeen: now, createdAt: now },
        ],
        total: 1, limit: 4, offset: 0, hasMore: false,
      }),
    })
    render(<MitsukeAlertWidget />)
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1')
    })
  })

  it('does not show count badge when no CRITICAL entries', async () => {
    const now = new Date().toISOString()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          { id: 'e1', severity: 'HIGH', title: 'High severity threat', firstSeen: now, source: 'feed', threatType: 'injection', description: '', indicators: [], confidence: 80, lastSeen: now, createdAt: now },
        ],
        total: 1, limit: 4, offset: 0, hasMore: false,
      }),
    })
    render(<MitsukeAlertWidget />)
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})
