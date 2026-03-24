// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockCanAccessProtectedApi = vi.fn()
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: (...args: unknown[]) => mockCanAccessProtectedApi(...args),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (value: unknown) => String(value ?? ''),
}))

vi.mock('lucide-react', () => {
  const Icon = () => <span data-testid="icon" />
  return {
    Swords: Icon,
    Plus: Icon,
    Play: Icon,
    Pause: Icon,
    RefreshCw: Icon,
    FileText: Icon,
    AlertTriangle: Icon,
    CheckCircle2: Icon,
    Clock: Icon,
    XCircle: Icon,
    ChevronRight: Icon,
    Timer: Icon,
    Loader2: Icon,
  }
})

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}))

vi.mock('../sengoku/TemporalTab', () => ({
  TemporalTab: () => <div>Temporal Tab</div>,
}))

vi.mock('../sengoku/SengokuCampaignBuilder', () => ({
  SengokuCampaignBuilder: () => <div>Campaign Builder</div>,
}))

import { SengokuDashboard } from '../sengoku/SengokuDashboard'
describe('SengokuDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ campaigns: [] }),
    })
  })

  it('loads campaigns through fetchWithAuth when protected access is available', async () => {
    render(<SengokuDashboard />)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/sengoku/campaigns')
    })
  })

  it('skips campaign fetch and shows the empty state when protected access is unavailable', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)

    render(<SengokuDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No campaigns yet')).toBeInTheDocument()
    })

    expect(mockFetchWithAuth).not.toHaveBeenCalled()
  })
})
