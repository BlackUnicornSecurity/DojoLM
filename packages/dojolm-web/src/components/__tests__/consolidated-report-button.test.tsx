/**
 * File: consolidated-report-button.test.tsx
 * Purpose: Unit tests for ConsolidatedReportButton component
 * Story: D3.4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

import { ConsolidatedReportButton } from '@/components/reports/ConsolidatedReportButton'

describe('ConsolidatedReportButton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConsolidatedReportButton />)
    expect(container).toBeTruthy()
  })

  it('displays the Download Report text', () => {
    render(<ConsolidatedReportButton />)
    expect(screen.getByText('Download Report')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<ConsolidatedReportButton />)
    expect(screen.getByLabelText('Download consolidated report')).toBeInTheDocument()
  })

  it('opens dropdown on click showing format options', () => {
    render(<ConsolidatedReportButton />)
    fireEvent.click(screen.getByLabelText('Download consolidated report'))
    expect(screen.getByText('PDF Report')).toBeInTheDocument()
    expect(screen.getByText('Markdown')).toBeInTheDocument()
    expect(screen.getByText('JSON Data')).toBeInTheDocument()
  })

  it('respects disabled prop', () => {
    render(<ConsolidatedReportButton disabled />)
    expect(screen.getByLabelText('Download consolidated report')).toBeDisabled()
  })
})
