/**
 * File: cross-module-actions.test.tsx
 * Purpose: Unit tests for CrossModuleActions component
 * Tests: rendering, dropdown, inline variant, action filtering, API calls, accessibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CrossModuleActions } from '@/components/ui/CrossModuleActions'

// Mock fetchWithAuth
const mockFetch = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetch(...args),
}))

describe('CrossModuleActions', () => {
  const baseProps = {
    sourceModule: 'scanner' as const,
    title: 'SQL Injection Found',
    description: 'A SQL injection vulnerability was detected',
    severity: 'CRITICAL' as const,
  }

  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })
  })

  // CMA-001: Renders dropdown trigger button by default
  it('CMA-001: renders "Send to..." dropdown trigger button', () => {
    render(<CrossModuleActions {...baseProps} />)
    expect(screen.getByRole('button', { name: /cross-module actions/i })).toBeInTheDocument()
    expect(screen.getByText('Send to...')).toBeInTheDocument()
  })

  // CMA-002: Trigger has aria-haspopup and aria-expanded
  it('CMA-002: trigger has correct ARIA attributes', () => {
    render(<CrossModuleActions {...baseProps} />)
    const btn = screen.getByRole('button', { name: /cross-module actions/i })
    expect(btn).toHaveAttribute('aria-haspopup', 'menu')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  // CMA-003: Clicking trigger opens dropdown menu
  it('CMA-003: clicking trigger opens the action menu', () => {
    render(<CrossModuleActions {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /cross-module actions/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  // CMA-004: Dropdown contains menu items
  it('CMA-004: opened dropdown displays action menu items', () => {
    render(<CrossModuleActions {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /cross-module actions/i }))
    const items = screen.getAllByRole('menuitem')
    expect(items.length).toBeGreaterThan(0)
  })

  // CMA-005: Scanner source excludes "Check in Bushido Book"
  it('CMA-005: scanner source excludes Bushido Book action', () => {
    render(<CrossModuleActions {...baseProps} sourceModule="scanner" />)
    fireEvent.click(screen.getByRole('button', { name: /cross-module actions/i }))
    expect(screen.queryByText('Check in Bushido Book')).not.toBeInTheDocument()
    expect(screen.getByText('Test in Atemi Lab')).toBeInTheDocument()
  })

  // CMA-006: Atemi source excludes self-referencing "Test in Atemi Lab"
  it('CMA-006: atemi source excludes self-referencing action', () => {
    render(<CrossModuleActions {...baseProps} sourceModule="atemi" />)
    fireEvent.click(screen.getByRole('button', { name: /cross-module actions/i }))
    expect(screen.queryByText('Test in Atemi Lab')).not.toBeInTheDocument()
    expect(screen.getByText('Add to SAGE Seeds')).toBeInTheDocument()
  })

  // CMA-007: Inline variant renders all action buttons without dropdown
  it('CMA-007: inline variant renders all buttons vertically', () => {
    render(<CrossModuleActions {...baseProps} variant="inline" />)
    // No dropdown trigger
    expect(screen.queryByText('Send to...')).not.toBeInTheDocument()
    // Action buttons should be visible directly
    expect(screen.getByText('Test in Atemi Lab')).toBeInTheDocument()
    expect(screen.getByText('Add to SAGE Seeds')).toBeInTheDocument()
  })

  // CMA-008: Clicking an action calls fetchWithAuth with correct payload
  it('CMA-008: action click posts finding via fetchWithAuth', async () => {
    render(<CrossModuleActions {...baseProps} variant="inline" />)
    fireEvent.click(screen.getByRole('button', { name: /test in atemi lab/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ecosystem/findings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  // CMA-009: Successful action shows "Sent" label
  it('CMA-009: shows "Sent" after successful action', async () => {
    render(<CrossModuleActions {...baseProps} variant="inline" />)
    fireEvent.click(screen.getByRole('button', { name: /test in atemi lab/i }))
    await waitFor(() => {
      expect(screen.getByText('Sent')).toBeInTheDocument()
    })
  })

  // CMA-010: Calls onActionComplete callback on success
  it('CMA-010: fires onActionComplete with true on success', async () => {
    const onComplete = vi.fn()
    render(<CrossModuleActions {...baseProps} variant="inline" onActionComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /test in atemi lab/i }))
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('test-atemi', true)
    })
  })

  // CMA-011: Calls onActionComplete with false on failure
  it('CMA-011: fires onActionComplete with false on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    const onComplete = vi.fn()
    render(<CrossModuleActions {...baseProps} variant="inline" onActionComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /test in atemi lab/i }))
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('test-atemi', false)
    })
  })

  // CMA-012: Applies custom className
  it('CMA-012: applies additional className', () => {
    const { container } = render(<CrossModuleActions {...baseProps} className="extra-cls" />)
    expect(container.firstChild).toHaveClass('extra-cls')
  })

  // CMA-013: Arena source shows all actions (no exclusions)
  it('CMA-013: arena source shows all available actions', () => {
    render(<CrossModuleActions {...baseProps} sourceModule="arena" />)
    fireEvent.click(screen.getByRole('button', { name: /cross-module actions/i }))
    expect(screen.getByText('Test in Atemi Lab')).toBeInTheDocument()
    expect(screen.getByText('Check in Bushido Book')).toBeInTheDocument()
    expect(screen.getByText('Create Mitsuke Alert')).toBeInTheDocument()
  })
})
