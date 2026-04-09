/**
 * File: sidebar.test.tsx
 * Purpose: Unit tests for Sidebar layout component
 * Test IDs: SB-001 to SB-012
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

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityState: () => ({
    events: [
      { id: '1', type: 'scan_complete', description: 'Scan done', timestamp: '2024-01-01T00:00:00Z', read: false },
      { id: '2', type: 'threat_detected', description: 'Threat!', timestamp: '2024-01-01T01:00:00Z', read: true },
      { id: '3', type: 'test_passed', description: 'Pass', timestamp: '2024-01-01T02:00:00Z', read: false },
    ],
  }),
  useActivityDispatch: () => vi.fn(),
}))

vi.mock('@/lib/contexts/ModuleVisibilityContext', () => ({
  useModuleVisibility: () => ({
    isVisible: () => true,
    toggle: vi.fn(),
    resetAll: vi.fn(),
    visibility: {},
  }),
}))

vi.mock('../layout/SidebarHeader', () => ({
  SidebarHeader: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="sidebar-header" data-collapsed={collapsed}>SidebarHeader</div>
  ),
}))

vi.mock('@/components/ui/ActivityFeed', () => ({
  ActivityFeed: ({ maxVisible }: { maxVisible: number }) => (
    <div data-testid="activity-feed" data-max={maxVisible}>ActivityFeed</div>
  ),
}))

import { Sidebar } from '../layout/Sidebar'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sidebar', () => {
  beforeEach(() => {
    mockActiveTab = 'dashboard'
    mockSetActiveTab.mockClear()
    // Clean up BUG-006 CSS variable between tests
    document.documentElement.style.removeProperty('--sidebar-current')
  })

  it('SB-001: renders the sidebar aside element', () => {
    render(<Sidebar />)
    const aside = screen.getByRole('complementary')
    expect(aside).toBeInTheDocument()
  })

  it('SB-002: renders SidebarHeader', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
  })

  it('SB-003: renders main navigation landmark', () => {
    render(<Sidebar />)
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeInTheDocument()
  })

  it('SB-004: renders Dashboard nav item with aria-current when active', () => {
    mockActiveTab = 'dashboard'
    render(<Sidebar />)
    const dashBtn = screen.getByLabelText('Dashboard')
    expect(dashBtn).toHaveAttribute('aria-current', 'page')
  })

  it('SB-005: clicking a nav item calls setActiveTab with the item id', () => {
    render(<Sidebar />)
    const scannerBtn = screen.getByRole('button', { name: /haiku scanner/i })
    fireEvent.click(scannerBtn)
    expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
  })

  it('SB-006: renders Admin button at the bottom', () => {
    render(<Sidebar />)
    const adminBtn = screen.getByRole('button', { name: 'Admin' })
    expect(adminBtn).toBeInTheDocument()
  })

  it('SB-007: clicking Admin calls setActiveTab with admin', () => {
    render(<Sidebar />)
    const adminBtn = screen.getByRole('button', { name: 'Admin' })
    fireEvent.click(adminBtn)
    expect(mockSetActiveTab).toHaveBeenCalledWith('admin')
  })

  it('SB-008: renders the collapse toggle button', () => {
    render(<Sidebar />)
    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i })
    expect(collapseBtn).toBeInTheDocument()
  })

  it('SB-009: toggling collapse changes the button label to Expand sidebar', () => {
    render(<Sidebar />)
    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i })
    fireEvent.click(collapseBtn)
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
  })

  // SB-010..SB-012: Activity feed behavior removed from Sidebar and relocated to
  // TopBar drawer in Train 1 PR-2. New coverage lives in topbar.test.tsx.

  it('SB-013: renders grouped navigation sections', () => {
    render(<Sidebar />)
    // Train 2 PR-2.5 (2026-04-09): 4 brand-pillar groups (Attack/Defense/
    // Red Team/Analysis) collapsed to 3 verb-groups (Test/Protect/Intel).
    // Red Team merged into Test. Labels updated below.
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Protect')).toBeInTheDocument()
    expect(screen.getByText('Intel & Evidence')).toBeInTheDocument()
  })

  it('SB-014: non-active nav items do not have aria-current', () => {
    mockActiveTab = 'dashboard'
    render(<Sidebar />)
    const scannerBtn = screen.getByRole('button', { name: /haiku scanner/i })
    expect(scannerBtn).not.toHaveAttribute('aria-current')
  })

  // SB-015..SB-016: BUG-006 --sidebar-current runtime CSS variable workaround
  // removed in Train 1 PR-2 per stakeholder decision. New shell uses fixed
  // var(--sidebar-width) for content padding, no runtime sync needed.
})
