/**
 * File: llm-batch-progress.test.tsx
 * Purpose: Unit tests for LLMBatchProgress dashboard widget
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

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/EnhancedProgress', () => ({
  EnhancedProgress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value} />
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('../dashboard/WidgetEmptyState', () => ({
  WidgetEmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
}))

const mockCanAccessProtectedApi = vi.fn()
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccessProtectedApi(),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import { LLMBatchProgress } from '../dashboard/widgets/LLMBatchProgress'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMBatchProgress', () => {
  it('renders without crashing', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    const { container } = render(<LLMBatchProgress />)
    expect(container).toBeTruthy()
  })

  it('displays "LLM Batch Progress" title', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    render(<LLMBatchProgress />)
    expect(screen.getByText('LLM Batch Progress')).toBeInTheDocument()
  })

  it('shows empty state when no active batches', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ batches: [] }),
    })
    render(<LLMBatchProgress />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No active tests')).toBeInTheDocument()
    })
  })

  it('renders batch progress bars when batches exist', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        batches: [
          { id: 'b1', name: 'Batch Alpha', status: 'running', totalTests: 100, completedTests: 50, failedTests: 0 },
        ],
      }),
    })
    render(<LLMBatchProgress />)
    await waitFor(() => {
      expect(screen.getByText('Batch Alpha')).toBeInTheDocument()
      expect(screen.getByText('50/100')).toBeInTheDocument()
    })
  })

  it('shows empty state when not authorized', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    render(<LLMBatchProgress />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })
})
