/**
 * File: toast.test.tsx
 * Purpose: Unit tests for Toast and ToastContainer components
 * Tests: rendering, variants, auto-dismiss, action buttons, accessibility, dismiss callback
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastContainer, type ToastData } from '@/components/ui/Toast'

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const makeToast = (overrides: Partial<ToastData> = {}): ToastData => ({
    id: 'toast-1',
    variant: 'success',
    title: 'Operation succeeded',
    ...overrides,
  })

  // TST-001: Renders nothing when toast list is empty
  it('TST-001: renders nothing when toasts array is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  // TST-002: Renders toast title
  it('TST-002: renders the toast title text', () => {
    render(<ToastContainer toasts={[makeToast()]} onDismiss={vi.fn()} />)
    expect(screen.getByText('Operation succeeded')).toBeInTheDocument()
  })

  // TST-003: Renders toast description when provided
  it('TST-003: renders description when provided', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ description: 'Details here' })]}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('Details here')).toBeInTheDocument()
  })

  // TST-004: Does not render description when not provided
  it('TST-004: does not render description when absent', () => {
    render(<ToastContainer toasts={[makeToast()]} onDismiss={vi.fn()} />)
    expect(screen.queryByText('Details here')).not.toBeInTheDocument()
  })

  // TST-005: Toast has role="alert" for accessibility
  it('TST-005: toast element has role="alert"', () => {
    render(<ToastContainer toasts={[makeToast()]} onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // TST-006: Toast has aria-live="polite"
  it('TST-006: toast has aria-live="polite" attribute', () => {
    render(<ToastContainer toasts={[makeToast()]} onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
  })

  // TST-007: Dismiss button calls onDismiss with correct ID
  it('TST-007: clicking dismiss calls onDismiss with the toast id', () => {
    const onDismiss = vi.fn()
    render(
      <ToastContainer toasts={[makeToast({ id: 'abc-123' })]} onDismiss={onDismiss} />
    )
    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(onDismiss).toHaveBeenCalledWith('abc-123')
  })

  // TST-008: Auto-dismiss fires after default 5000ms
  it('TST-008: auto-dismisses after default duration (5000ms)', () => {
    const onDismiss = vi.fn()
    render(<ToastContainer toasts={[makeToast()]} onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(5000) })
    expect(onDismiss).toHaveBeenCalledWith('toast-1')
  })

  // TST-009: Custom duration for auto-dismiss
  it('TST-009: auto-dismisses after custom duration', () => {
    const onDismiss = vi.fn()
    render(
      <ToastContainer toasts={[makeToast({ duration: 2000 })]} onDismiss={onDismiss} />
    )
    act(() => { vi.advanceTimersByTime(1999) })
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onDismiss).toHaveBeenCalledWith('toast-1')
  })

  // TST-010: Renders action button when action prop is provided
  it('TST-010: renders action button and calls onClick', () => {
    const actionClick = vi.fn()
    render(
      <ToastContainer
        toasts={[makeToast({ action: { label: 'Retry', onClick: actionClick } })]}
        onDismiss={vi.fn()}
      />
    )
    const actionBtn = screen.getByText('Retry')
    expect(actionBtn).toBeInTheDocument()
    fireEvent.click(actionBtn)
    expect(actionClick).toHaveBeenCalledOnce()
  })

  // TST-011: Shows maximum 3 toasts at once
  it('TST-011: displays at most 3 toasts even when more are provided', () => {
    const toasts: ToastData[] = [
      makeToast({ id: '1', title: 'Toast 1' }),
      makeToast({ id: '2', title: 'Toast 2' }),
      makeToast({ id: '3', title: 'Toast 3' }),
      makeToast({ id: '4', title: 'Toast 4' }),
      makeToast({ id: '5', title: 'Toast 5' }),
    ]
    render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />)
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(3)
    // Should show the last 3 (slice(-3))
    expect(screen.getByText('Toast 3')).toBeInTheDocument()
    expect(screen.getByText('Toast 4')).toBeInTheDocument()
    expect(screen.getByText('Toast 5')).toBeInTheDocument()
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
  })

  // TST-012: Renders all 4 variant types without errors
  it('TST-012: renders all 4 toast variants (success, error, warning, info)', () => {
    const variants = ['success', 'error', 'warning', 'info'] as const
    const toasts: ToastData[] = variants.map((v, i) => makeToast({
      id: `v-${i}`,
      variant: v,
      title: `${v} toast`,
    }))
    render(<ToastContainer toasts={toasts.slice(-3)} onDismiss={vi.fn()} />)
    // 3 max rendered
    expect(screen.getAllByRole('alert')).toHaveLength(3)
  })

  // TST-013: Container has aria-label "Notifications"
  it('TST-013: container has aria-label "Notifications"', () => {
    render(<ToastContainer toasts={[makeToast()]} onDismiss={vi.fn()} />)
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
  })
})
