/**
 * File: sengoku-widget.test.tsx
 * Purpose: Unit tests for SengokuWidget dashboard widget
 * Story 2.1.3: Wired to /api/sengoku/campaigns — no mock data
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
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

vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{actions && <div data-testid="widget-actions">{actions}</div>}{children}</div> }))

import { SengokuWidget } from '../dashboard/widgets/SengokuWidget'

describe('SengokuWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    expect(render(<SengokuWidget />).container).toBeTruthy()
  })

  it('displays title', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<SengokuWidget />)
    expect(screen.getByText('Sengoku Campaigns')).toBeInTheDocument()
  })

  it('wraps in WidgetCard', () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<SengokuWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('shows empty state when no campaigns returned', async () => {
    mockFetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ campaigns: [] }) })
    render(<SengokuWidget />)
    await waitFor(() => {
      expect(screen.getByText('No campaigns yet')).toBeInTheDocument()
    })
  })

  it('shows campaign count from API', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        campaigns: [
          { id: 'c1', name: 'Campaign 1', status: 'active', targetUrl: 'https://a.com', authConfig: {}, selectedSkillIds: [], schedule: null, webhookUrl: null, createdAt: '', updatedAt: '' },
          { id: 'c2', name: 'Campaign 2', status: 'draft', targetUrl: 'https://b.com', authConfig: {}, selectedSkillIds: [], schedule: null, webhookUrl: null, createdAt: '', updatedAt: '' },
        ],
      }),
    })
    render(<SengokuWidget />)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('campaigns')).toBeInTheDocument()
      expect(screen.getByText('1 ACTIVE')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  it('"Open" button navigates to sengoku', async () => {
    mockFetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ campaigns: [] }) })
    render(<SengokuWidget />)
    fireEvent.click(screen.getByLabelText('Open Sengoku Campaigns'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('sengoku')
  })

  it('shows empty state on network error', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('network'))
    render(<SengokuWidget />)
    await waitFor(() => {
      expect(screen.getByText('No campaigns yet')).toBeInTheDocument()
    })
  })
})
