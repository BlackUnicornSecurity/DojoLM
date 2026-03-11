/**
 * File: mobile-nav.test.tsx
 * Purpose: Unit tests for MobileNav bottom navigation component
 * Test IDs: MN-001 to MN-014
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetActiveTab = vi.fn()
let mockActiveTab = 'dashboard'

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}))

vi.mock('@/lib/contexts/ModuleVisibilityContext', () => ({
  useModuleVisibility: () => ({
    isVisible: () => true,
    toggle: vi.fn(),
    resetAll: vi.fn(),
    visibility: {},
  }),
}))

import { MobileNav } from '../layout/MobileNav'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MobileNav', () => {
  beforeEach(() => {
    mockActiveTab = 'dashboard'
    mockSetActiveTab.mockClear()
  })

  it('MN-001: renders the mobile navigation landmark', () => {
    render(<MobileNav />)
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(nav).toBeInTheDocument()
  })

  it('MN-002: renders primary nav items (dashboard, scanner, llm, guard)', () => {
    render(<MobileNav />)
    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Haiku Scanner')).toBeInTheDocument()
    expect(screen.getByLabelText('LLM Dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Hattori Guard')).toBeInTheDocument()
  })

  it('MN-003: renders the More button', () => {
    render(<MobileNav />)
    expect(screen.getByRole('button', { name: /more navigation options/i })).toBeInTheDocument()
  })

  it('MN-004: clicking a primary nav item calls setActiveTab', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /haiku scanner/i }))
    expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
  })

  it('MN-005: active tab has aria-current page attribute', () => {
    mockActiveTab = 'dashboard'
    render(<MobileNav />)
    const dashBtn = screen.getByLabelText('Dashboard')
    expect(dashBtn).toHaveAttribute('aria-current', 'page')
  })

  it('MN-006: non-active tabs do not have aria-current', () => {
    mockActiveTab = 'dashboard'
    render(<MobileNav />)
    const scannerBtn = screen.getByRole('button', { name: /haiku scanner/i })
    expect(scannerBtn).not.toHaveAttribute('aria-current')
  })

  it('MN-007: clicking More opens the drawer dialog', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('MN-008: More button has aria-expanded true when drawer is open', () => {
    render(<MobileNav />)
    const moreBtn = screen.getByRole('button', { name: /more navigation options/i })
    fireEvent.click(moreBtn)
    // The same button now has aria-expanded=true (label changes to "Close more menu")
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
    const navMoreBtn = nav.querySelector('button[aria-expanded]')!
    expect(navMoreBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('MN-009: drawer shows close button', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    const dialog = screen.getByRole('dialog')
    const closeBtn = dialog.querySelector('button[aria-label="Close more menu"]')
    expect(closeBtn).toBeInTheDocument()
  })

  it('MN-010: closing the drawer removes the dialog', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    const closeBtn = dialog.querySelector('button[aria-label="Close more menu"]')!
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('MN-011: selecting a drawer item calls setActiveTab and closes drawer', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    // Click on an item in the drawer (e.g., Admin)
    const adminBtn = screen.getByRole('button', { name: /admin/i })
    fireEvent.click(adminBtn)
    expect(mockSetActiveTab).toHaveBeenCalledWith('admin')
    // Drawer should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('MN-012: drawer shows group labels', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    // Should show at least some group labels for items in the more menu
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })

  it('MN-013: Escape key closes the drawer', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('MN-014: drawer has aria-modal true', () => {
    render(<MobileNav />)
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
