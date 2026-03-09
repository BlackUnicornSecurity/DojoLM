/**
 * File: attackdna-explorer-tiers.test.tsx
 * Purpose: Tests for AttackDNAExplorer tier integration
 * Story: KASHIWA-13.10
 * Scope: Tier toggling, API fetch with tier params, stats display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock fetch-with-auth before component import
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

// Mock next/dynamic to just render the fallback or nothing
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockComponent = () => <div data-testid="mock-sub-view" />
    MockComponent.displayName = 'MockDynamic'
    return MockComponent
  },
}))

// Mock sub-components to avoid deep renders
vi.mock('@/components/attackdna/AmaterasuGuide', () => ({
  AmaterasuGuide: () => null,
  resetAmaterasuGuide: vi.fn(),
  TabHelpButton: () => null,
}))

vi.mock('@/components/attackdna/AmaterasuConfig', () => ({
  AmaterasuConfig: () => null,
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: () => null,
}))

import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { AttackDNAExplorer } from '@/components/attackdna/AttackDNAExplorer'

const mockFetchWithAuth = vi.mocked(fetchWithAuth)

function createMockResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
    status: ok ? 200 : 500,
  } as unknown as Response
}

describe('AttackDNAExplorer — Tier Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: all API calls return empty data
    mockFetchWithAuth.mockImplementation(async (url: URL | RequestInfo) => {
      const urlStr = String(url)
      if (urlStr.includes('type=stats')) {
        return createMockResponse({
          stats: {
            totalNodes: 42,
            totalEdges: 18,
            totalFamilies: 3,
            totalClusters: 2,
            byCategory: {},
            bySeverity: {},
            bySource: {},
          },
        })
      }
      if (urlStr.includes('type=families')) {
        return createMockResponse({ families: [] })
      }
      if (urlStr.includes('type=clusters')) {
        return createMockResponse({ clusters: [] })
      }
      if (urlStr.includes('type=timeline')) {
        return createMockResponse({ timeline: [] })
      }
      if (urlStr.includes('/api/attackdna/sync')) {
        return createMockResponse({
          config: { lastSyncAt: null, autoSyncEnabled: false },
          syncInProgress: false,
        })
      }
      return createMockResponse({})
    })
  })

  it('renders the DataSourceSelector', async () => {
    render(<AttackDNAExplorer />)

    expect(screen.getByRole('group', { name: /data source filter/i })).toBeInTheDocument()
    expect(screen.getByText('Dojo Local')).toBeInTheDocument()
    expect(screen.getByText('Master')).toBeInTheDocument()
  })

  it('fetches data with dojo-local tier by default', async () => {
    render(<AttackDNAExplorer />)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('sourceTier=dojo-local'),
        expect.anything()
      )
    })
  })

  it('displays stats from API', async () => {
    render(<AttackDNAExplorer />)

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('toggles master tier and fetches with both tiers', async () => {
    render(<AttackDNAExplorer />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    // Click master tier pill
    const masterButton = screen.getByRole('button', { name: /^Master$/i })
    fireEvent.click(masterButton)

    await waitFor(() => {
      // Should have calls for master tier now
      const calls = mockFetchWithAuth.mock.calls.map((c) => c[0])
      expect(calls.some((url) => typeof url === 'string' && url.includes('sourceTier=master'))).toBe(true)
    })
  })

  it('shows loading state while fetching', () => {
    // Make fetch hang
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}))
    render(<AttackDNAExplorer />)

    // Stats show "—" while loading
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  it('renders search input', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByRole('searchbox', { name: /search attacks/i })).toBeInTheDocument()
  })

  it('renders 4 tabs', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByRole('tab', { name: /family tree/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /clusters/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /analysis/i })).toBeInTheDocument()
  })
})
