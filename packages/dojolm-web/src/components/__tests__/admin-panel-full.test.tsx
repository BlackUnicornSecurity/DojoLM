/**
 * File: admin-panel-full.test.tsx
 * Purpose: Unit tests for AdminPanel component with tab navigation
 * Test IDs: AP-001 to AP-016
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks — stub Radix tabs for deterministic tab switching in jsdom
// ---------------------------------------------------------------------------

let currentTabValue = 'general'
let mockOnValueChange: (v: string) => void = () => {}

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => {
    currentTabValue = value
    mockOnValueChange = onValueChange
    return <div data-testid="tabs" data-value={value}>{children}</div>
  },
  TabsList: ({ children, ...props }: { children: React.ReactNode; 'aria-label'?: string; className?: string }) => (
    <div role="tablist" aria-label={props['aria-label']}>{children}</div>
  ),
  TabsTrigger: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <button
      role="tab"
      data-value={value}
      data-state={currentTabValue === value ? 'active' : 'inactive'}
      className={className}
      onClick={() => mockOnValueChange(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    currentTabValue === value ? <div role="tabpanel" data-tab={value}>{children}</div> : null
  ),
}))

// Stub child components to isolate AdminPanel logic
vi.mock('../admin/ApiKeyManager', () => ({
  ApiKeyManager: () => <div data-testid="api-key-manager">ApiKeyManager</div>,
}))

vi.mock('../admin/ScannerConfig', () => ({
  ScannerConfig: () => <div data-testid="scanner-config">ScannerConfig</div>,
}))

vi.mock('../admin/ExportSettings', () => ({
  ExportSettings: () => <div data-testid="export-settings">ExportSettings</div>,
}))

vi.mock('../admin/SystemHealth', () => ({
  SystemHealth: () => <div data-testid="system-health">SystemHealth</div>,
}))

vi.mock('../admin/UserManagement', () => ({
  UserManagement: () => <div data-testid="user-management">UserManagement</div>,
}))

vi.mock('../admin/Scoreboard', () => ({
  Scoreboard: () => <div data-testid="scoreboard">Scoreboard</div>,
}))

vi.mock('../admin/AdminSettings', () => ({
  AdminSettings: () => <div data-testid="admin-settings">AdminSettings</div>,
}))

vi.mock('../admin/ValidationManager', () => ({
  ValidationManager: () => <div data-testid="validation-manager">ValidationManager</div>,
}))

vi.mock('../tests/TestRunner', () => ({
  TestRunner: () => <div data-testid="test-runner">TestRunner</div>,
}))

vi.mock('@/components/layout/PageToolbar', () => ({
  PageToolbar: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-toolbar">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}))

import { AdminPanel } from '../admin/AdminPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminPanel', () => {
  beforeEach(() => {
    currentTabValue = 'general'
  })

  it('AP-001: renders the PageToolbar with correct title', () => {
    render(<AdminPanel />)
    expect(screen.getByText('Admin & Settings')).toBeInTheDocument()
  })

  it('AP-002: renders the subtitle', () => {
    render(<AdminPanel />)
    expect(screen.getByText('Settings, validation, and configuration')).toBeInTheDocument()
  })

  it('AP-003: renders the tablist', () => {
    render(<AdminPanel />)
    expect(screen.getByRole('tablist', { name: /admin sections/i })).toBeInTheDocument()
  })

  // Plugins tab removed; 12 → 11.
  it('AP-004: renders all 11 admin tabs', () => {
    render(<AdminPanel />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(11)
  })

  it('AP-005: General tab is selected by default', () => {
    render(<AdminPanel />)
    const generalTab = screen.getByRole('tab', { name: /General/i })
    expect(generalTab).toHaveAttribute('data-state', 'active')
  })

  it('AP-006: General tab content shows Platform Information heading', () => {
    render(<AdminPanel />)
    expect(screen.getByText('Platform Information')).toBeInTheDocument()
  })

  it('AP-007: clicking Users tab shows UserManagement', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Users/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('user-management')).toBeInTheDocument()
  })

  it('AP-008: clicking API Keys tab shows ApiKeyManager', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /API Keys/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('api-key-manager')).toBeInTheDocument()
  })

  it('AP-009: clicking System Health tab shows SystemHealth', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /System Health/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('system-health')).toBeInTheDocument()
  })

  it('AP-010: clicking Export tab shows ExportSettings', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Export/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('export-settings')).toBeInTheDocument()
  })

  it('AP-011: clicking Scoreboard tab shows Scoreboard', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Scoreboard/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument()
  })

  it('AP-012: clicking Scanner tab shows ScannerConfig', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Scanner.*Guard/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('scanner-config')).toBeInTheDocument()
  })

  it('AP-013: clicking Admin Settings tab shows AdminSettings', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Settings/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('admin-settings')).toBeInTheDocument()
  })

  it('AP-014: General Settings content shows Application and Theme info', () => {
    render(<AdminPanel />)
    expect(screen.getByText('Application')).toBeInTheDocument()
    expect(screen.getByText('NODA Platform')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Dark (default)')).toBeInTheDocument()
  })

  // Plugins tab removed (Plugin Registry was mock-only, no backend)
  it('AP-015: each tab has the expected data-value attributes', () => {
    render(<AdminPanel />)
    const tabs = screen.getAllByRole('tab')
    const values = tabs.map(t => t.getAttribute('data-value'))
    expect(values).toEqual([
      'general', 'users', 'scoreboard', 'apikeys', 'scanner', 'health', 'export', 'providers', 'settings', 'validation', 'test-runner',
    ])
  })

  it('AP-016: switching tabs updates the active state', () => {
    const { rerender } = render(<AdminPanel />)
    const usersTab = screen.getByRole('tab', { name: /Users/i })
    fireEvent.click(usersTab)
    rerender(<AdminPanel />)
    expect(screen.getByRole('tab', { name: /Users/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: /General/i })).toHaveAttribute('data-state', 'inactive')
  })

  it('AP-017: clicking Test Runner tab shows the internal test runner', () => {
    const { rerender } = render(<AdminPanel />)
    fireEvent.click(screen.getByRole('tab', { name: /Test Runner/i }))
    rerender(<AdminPanel />)
    expect(screen.getByTestId('test-runner')).toBeInTheDocument()
  })
})
