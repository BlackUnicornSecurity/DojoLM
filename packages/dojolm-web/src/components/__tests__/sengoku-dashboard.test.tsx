// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

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

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button role="tab">{children}</button>,
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

vi.mock('../sengoku/OrchestratorBuilder', () => ({
  OrchestratorBuilder: () => <div>Orchestrator Builder</div>,
}))

vi.mock('../sengoku/OrchestratorVisualization', () => ({
  OrchestratorVisualization: () => <div>Orchestrator Visualization</div>,
}))

vi.mock('../sengoku/CampaignGraphBuilder', () => ({
  CampaignGraphBuilder: () => <div>Campaign Graph Builder</div>,
}))

import { SengokuDashboard } from '../sengoku/SengokuDashboard'
describe('SengokuDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockImplementation(async (url: string) => {
      if (url === '/api/llm/models?enabled=true') {
        return {
          ok: true,
          json: async () => ({ models: [{ id: 'model-1', name: 'GPT-4o' }] }),
        }
      }

      return {
        ok: true,
        json: async () => ({ campaigns: [] }),
      }
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
      expect(screen.getByText('Authentication required')).toBeInTheDocument()
    })

    expect(mockFetchWithAuth).not.toHaveBeenCalled()
  })

  it('does not crash when a selected campaign becomes deselected', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        campaigns: [
          {
            id: 'camp-1',
            name: 'Nightly',
            targetUrl: 'https://example.com',
            schedule: 'daily',
            status: 'draft',
            updatedAt: '2026-03-24T00:00:00Z',
            createdAt: '2026-03-24T00:00:00Z',
          },
        ],
      }),
    })

    render(<SengokuDashboard />)

    const initialButton = await screen.findByLabelText('Campaign: Nightly, Status: Draft')
    fireEvent.click(initialButton)

    const rerenderedButton = await screen.findByLabelText('Campaign: Nightly, Status: Draft')
    fireEvent.click(rerenderedButton)

    expect(screen.queryByText('Run Now')).not.toBeInTheDocument()
  })

  it('surfaces the orchestrator workbench and Sensei helper tools', async () => {
    render(<SengokuDashboard />)

    expect(screen.getByRole('tab', { name: /Workbench/i })).toBeInTheDocument()
    expect(screen.getByText('Orchestrator Builder')).toBeInTheDocument()
    expect(screen.getByText('Orchestrator Visualization')).toBeInTheDocument()
    expect(screen.getByText('Campaign Graph Builder')).toBeInTheDocument()
    expect(screen.getByText('run_orchestrator')).toBeInTheDocument()
    expect(screen.getByText('sensei_plan')).toBeInTheDocument()
  })
})
