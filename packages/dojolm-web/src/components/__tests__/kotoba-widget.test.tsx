/**
 * File: kotoba-widget.test.tsx
 * Purpose: Unit tests for KotobaWidget dashboard widget
 * Story 2.1.3: Mock data removed — shows "not yet available" state
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      {children}
    </div>
  ),
}))

import { KotobaWidget } from '../dashboard/widgets/KotobaWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KotobaWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<KotobaWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Kotoba Studio" title', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Kotoba Studio')).toBeInTheDocument()
  })

  it('shows not-yet-available state (no mock data)', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Not yet available')).toBeInTheDocument()
    expect(screen.getByText(/Kotoba backend/)).toBeInTheDocument()
  })

  it('does not render old mock data values', () => {
    render(<KotobaWidget />)
    expect(screen.queryByText('24')).not.toBeInTheDocument()
    expect(screen.queryByText('B+')).not.toBeInTheDocument()
    expect(screen.queryByText('78%')).not.toBeInTheDocument()
  })

  it('renders "Open" action button', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('"Open" button navigates to kotoba', () => {
    render(<KotobaWidget />)
    fireEvent.click(screen.getByLabelText('Open Kotoba Studio'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('kotoba')
  })
})
