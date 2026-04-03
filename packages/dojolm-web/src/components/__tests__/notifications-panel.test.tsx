/**
 * File: notifications-panel.test.tsx
 * Purpose: Unit tests for NotificationsPanel component
 * Story: TPI-UI-001-23
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { NotificationsPanel } from '@/components/layout/NotificationsPanel'

describe('NotificationsPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<NotificationsPanel />)
    expect(container).toBeTruthy()
  })

  it('renders the bell button with aria-label', () => {
    render(<NotificationsPanel />)
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
  })

  it('opens dropdown on click and shows Notifications heading', () => {
    render(<NotificationsPanel />)
    const button = screen.getByLabelText('Notifications')
    fireEvent.click(button)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('shows No notifications message when empty', () => {
    render(<NotificationsPanel />)
    const button = screen.getByLabelText('Notifications')
    fireEvent.click(button)
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('renders mark all read and clear all buttons when open', () => {
    render(<NotificationsPanel />)
    const button = screen.getByLabelText('Notifications')
    fireEvent.click(button)
    expect(screen.getByLabelText('Mark all as read')).toBeInTheDocument()
    expect(screen.getByLabelText('Clear all')).toBeInTheDocument()
  })
})
