/**
 * File: quick-llm-test-widget.test.tsx
 * Purpose: Unit tests for QuickLLMTestWidget dashboard widget
 * Story: TPI-NODA-1.5.9
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}))

vi.mock('../WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

vi.mock('@/components/ui/EnhancedProgress', () => ({
  EnhancedProgress: (props: Record<string, unknown>) => <div data-testid="progress-bar" data-value={props.value} />,
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}))

import { QuickLLMTestWidget } from '@/components/dashboard/widgets/QuickLLMTestWidget'

describe('QuickLLMTestWidget', () => {
  it('renders without crashing', () => {
    render(<QuickLLMTestWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<QuickLLMTestWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Quick LLM Test')
  })

  it('renders the model dropdown', () => {
    render(<QuickLLMTestWidget />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
  })

  it('shows "No models available" when no models loaded', () => {
    render(<QuickLLMTestWidget />)
    expect(screen.getByText('No models available')).toBeInTheDocument()
  })

  it('renders three preset buttons', () => {
    render(<QuickLLMTestWidget />)
    expect(screen.getByText('Quick (20)')).toBeInTheDocument()
    expect(screen.getByText('Bushido (8)')).toBeInTheDocument()
    expect(screen.getByText('Full (132)')).toBeInTheDocument()
  })

  it('renders the Run Test button', () => {
    render(<QuickLLMTestWidget />)
    expect(screen.getByText('Run Test')).toBeInTheDocument()
  })
})
