/**
 * File: llm-jutsu-widget.test.tsx
 * Purpose: Unit tests for LLMJutsuWidget dashboard widget
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

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
}))

const mockCanAccessProtectedApi = vi.fn()
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccessProtectedApi(),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/components/ui/BeltBadge', () => ({
  getBeltRank: (score: number) => {
    if (score >= 90) return { short: 'Black' }
    if (score >= 75) return { short: 'Brown' }
    if (score >= 60) return { short: 'Blue' }
    return { short: 'White' }
  },
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

import { LLMJutsuWidget } from '../dashboard/widgets/LLMJutsuWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMJutsuWidget', () => {
  it('renders without crashing', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    mockFetchWithAuth.mockRejectedValue(new Error('no auth'))
    const { container } = render(<LLMJutsuWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "LLM Jutsu" title', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    mockFetchWithAuth.mockRejectedValue(new Error('no auth'))
    render(<LLMJutsuWidget />)
    expect(screen.getByText('LLM Jutsu')).toBeInTheDocument()
  })

  it('renders "Open" action link', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    mockFetchWithAuth.mockRejectedValue(new Error('no auth'))
    render(<LLMJutsuWidget />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows model count after loading fallback data', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    mockFetchWithAuth.mockRejectedValue(new Error('no auth'))
    render(<LLMJutsuWidget />)
    await waitFor(() => {
      expect(screen.getByText('Models Tested')).toBeInTheDocument()
      // Fallback data has 5 models
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('renders belt distribution when models exist', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { modelName: 'GPT-4', resilienceScore: 92 },
          { modelName: 'Claude', resilienceScore: 78 },
        ],
      }),
    })
    render(<LLMJutsuWidget />)
    await waitFor(() => {
      expect(screen.getByText('Belt Distribution')).toBeInTheDocument()
    })
  })

  it('renders models tested metric with API data', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { modelName: 'GPT-4', resilienceScore: 92 },
          { modelName: 'Claude', resilienceScore: 78 },
          { modelName: 'Gemini', resilienceScore: 65 },
        ],
      }),
    })
    render(<LLMJutsuWidget />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })
})
