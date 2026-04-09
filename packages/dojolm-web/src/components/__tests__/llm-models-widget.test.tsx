/**
 * File: llm-models-widget.test.tsx
 * Purpose: Unit tests for LLMModelsWidget dashboard widget
 * Story: TPI-NODA-1.5.9
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: vi.fn() }),
    // WidgetCard.tsx imports the React Context itself — must be a real Context
    // so useContext(NavigationContext) doesn't throw. Null default value exercises
    // the useSafeNavigation null-fallback path.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}))

import { LLMModelsWidget } from '@/components/dashboard/widgets/LLMModelsWidget'

describe('LLMModelsWidget', () => {
  it('renders without crashing', () => {
    render(<LLMModelsWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<LLMModelsWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('LLM Models')
  })

  it('renders the Manage action button', () => {
    render(<LLMModelsWidget />)
    expect(screen.getByLabelText('Manage LLM Models')).toBeInTheDocument()
  })

  it('shows loading spinner initially', () => {
    render(<LLMModelsWidget />)
    expect(screen.getByTestId('icon-Loader2')).toBeInTheDocument()
  })

  it('shows empty state after loading when no models', async () => {
    render(<LLMModelsWidget />)
    const emptyText = await screen.findByText('No models configured')
    expect(emptyText).toBeInTheDocument()
  })

  it('shows Configure link in empty state', async () => {
    render(<LLMModelsWidget />)
    const configLink = await screen.findByText('Configure in Model Lab')
    expect(configLink).toBeInTheDocument()
  })
})
