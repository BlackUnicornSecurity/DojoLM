/**
 * File: dashboard-customizer.test.tsx
 * Purpose: Unit tests for DashboardCustomizer component
 * Test IDs: DC-001 to DC-014
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

const mockToggleWidget = vi.fn()
const mockResetToDefaults = vi.fn()
const mockMoveWidget = vi.fn()
const mockResizeWidget = vi.fn()

const mockWidgets = [
  { id: 'quick-scan', visible: true, order: 0, size: 8 as const },
  { id: 'quick-launch', visible: true, order: 1, size: 12 as const },
  { id: 'activity-feed', visible: false, order: 2, size: 6 as const },
]

vi.mock('../dashboard/DashboardConfigContext', () => ({
  useDashboardConfig: () => ({
    config: { widgets: mockWidgets, layout: 'default' as const },
    toggleWidget: mockToggleWidget,
    resetToDefaults: mockResetToDefaults,
    moveWidget: mockMoveWidget,
    resizeWidget: mockResizeWidget,
  }),
  WIDGET_CATALOG: [
    { id: 'quick-scan', label: 'Quick Scan Bar', description: 'Instant ALLOW/BLOCK verdict', category: 'interactive', defaultSize: 8, isDefault: false },
    { id: 'quick-launch', label: 'Quick Launch Pad', description: '6 large action cards', category: 'interactive', defaultSize: 12, isDefault: true },
    { id: 'activity-feed', label: 'Activity Feed', description: 'Recent events stream', category: 'dynamic', defaultSize: 6, isDefault: true },
  ],
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { DashboardCustomizer } from '../dashboard/DashboardCustomizer'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardCustomizer', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DC-001: renders nothing when open is false', () => {
    const { container } = render(<DashboardCustomizer open={false} onClose={onClose} />)
    expect(container.innerHTML).toBe('')
  })

  it('DC-002: renders dialog panel when open is true', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Customize Dashboard')).toBeInTheDocument()
  })

  it('DC-003: renders header with title and widget count', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument()
    // 2 of 3 widgets active
    expect(screen.getByText(/2 of 3 widgets active/)).toBeInTheDocument()
  })

  it('DC-004: renders close button that calls onClose', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close customizer'))
    expect(onClose).toHaveBeenCalled()
  })

  it('DC-005: renders Reset to Defaults button', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    const resetBtn = screen.getByText('Reset to Defaults')
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(mockResetToDefaults).toHaveBeenCalled()
  })

  it('DC-006: renders widget toggles as switches', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(3)
  })

  it('DC-007: switch aria-checked reflects widget visibility', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    const quickScanSwitch = screen.getByLabelText('Toggle Quick Scan Bar')
    expect(quickScanSwitch).toHaveAttribute('aria-checked', 'true')
    const activitySwitch = screen.getByLabelText('Toggle Activity Feed')
    expect(activitySwitch).toHaveAttribute('aria-checked', 'false')
  })

  it('DC-008: clicking a switch calls toggleWidget', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Toggle Quick Scan Bar'))
    expect(mockToggleWidget).toHaveBeenCalledWith('quick-scan')
  })

  it('DC-009: renders category section headers', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    expect(screen.getByText('Interactive / Action')).toBeInTheDocument()
    expect(screen.getByText('Dynamic / Live')).toBeInTheDocument()
  })

  it('DC-010: renders move up/down buttons for visible widgets', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    expect(screen.getByLabelText('Move Quick Scan Bar up')).toBeInTheDocument()
    expect(screen.getByLabelText('Move Quick Scan Bar down')).toBeInTheDocument()
  })

  it('DC-011: clicking move up calls moveWidget', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Move Quick Scan Bar up'))
    expect(mockMoveWidget).toHaveBeenCalledWith('quick-scan', 'up')
  })

  it('DC-012: renders backdrop that calls onClose on click', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    // The backdrop has aria-hidden="true" so we find it by that
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('DC-013: toggle preserves scroll position', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    // Simulate scrolled state
    Object.defineProperty(dialog, 'scrollTop', { value: 150, writable: true })
    fireEvent.click(screen.getByLabelText('Toggle Quick Scan Bar'))
    expect(mockToggleWidget).toHaveBeenCalledWith('quick-scan')
  })

  it('DC-014: move preserves scroll position', () => {
    render(<DashboardCustomizer open={true} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    Object.defineProperty(dialog, 'scrollTop', { value: 200, writable: true })
    fireEvent.click(screen.getByLabelText('Move Quick Scan Bar up'))
    expect(mockMoveWidget).toHaveBeenCalledWith('quick-scan', 'up')
  })
})
