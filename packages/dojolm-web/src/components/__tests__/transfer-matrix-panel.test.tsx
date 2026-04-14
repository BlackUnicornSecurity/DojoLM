/**
 * File: transfer-matrix-panel.test.tsx
 * Purpose: Unit tests for TransferMatrixPanel component
 * Story: H25.2 (initial) / 5.2.1 (mock data removed)
 * Test IDs: TMP-001 to TMP-006
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

import { TransferMatrixPanel } from '@/components/llm/TransferMatrixPanel'

describe('TransferMatrixPanel (TMP-001 to TMP-006)', () => {
  it('TMP-001: renders without crashing', () => {
    const { container } = render(<TransferMatrixPanel />)
    expect(container).toBeTruthy()
  })

  it('TMP-002: displays the Transfer Matrix heading', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getByText('Transfer Matrix')).toBeInTheDocument()
  })

  it('TMP-003: displays the description', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getByText('Cross-model vulnerability transfer analysis')).toBeInTheDocument()
  })

  it('TMP-004: shows not-yet-available notice with role="status"', () => {
    render(<TransferMatrixPanel />)
    const notice = screen.getByRole('status')
    expect(notice.textContent).toMatch(/not yet available/i)
  })

  it('TMP-005: notice mentions backend route', () => {
    render(<TransferMatrixPanel />)
    const notice = screen.getByRole('status')
    expect(notice.textContent).toMatch(/backend route/i)
  })

  it('TMP-006: no mock model names or table rendered', () => {
    render(<TransferMatrixPanel />)
    expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
    expect(screen.queryByText('Transfer rate:')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
