/**
 * File: strategic-hub.test.tsx
 * Purpose: Unit tests for StrategicHub component
 * Test IDs: SH-001 to SH-012
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

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, 'aria-label': ariaLabel }: { children: React.ReactNode; 'aria-label'?: string }) => (
    <div role="tablist" aria-label={ariaLabel}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, ...props }: { children: React.ReactNode; onClick?: () => void; 'aria-label'?: string; [k: string]: unknown }) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="module-guide">{title}</div> : null,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) => (
    <div data-testid="module-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {actions && <div data-testid="header-actions">{actions}</div>}
    </div>
  ),
}))

vi.mock('@/components/ui/ModuleOnboarding', () => ({
  ModuleOnboarding: ({ storageKey }: { storageKey: string }) => (
    <div data-testid={`onboarding-${storageKey}`}>Onboarding</div>
  ),
  resetOnboarding: vi.fn(),
}))

vi.mock('../strategic/KumiteConfig', () => ({
  SAGEConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="sage-config">SAGE Config</div> : null,
  ArenaConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="arena-config">Arena Config</div> : null,
  MitsukeConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mitsuke-config">Mitsuke Config</div> : null,
}))

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Component = () => <div data-testid="dynamic-component">Dynamic Component</div>
    Component.displayName = 'DynamicComponent'
    return Component
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { StrategicHub } from '../strategic/StrategicHub'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StrategicHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SH-001: renders The Kumite header on overview', () => {
    render(<StrategicHub />)
    expect(screen.getByText('The Kumite')).toBeInTheDocument()
  })

  it('SH-002: renders all three subsystem cards in overview', () => {
    render(<StrategicHub />)
    expect(screen.getByText('SAGE')).toBeInTheDocument()
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
  })

  it('SH-003: displays metrics for each subsystem card', () => {
    render(<StrategicHub />)
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('0.94')).toBeInTheDocument()
    expect(screen.getByText('1,247')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('8,421')).toBeInTheDocument()
  })

  it('SH-004: displays badge labels for each subsystem', () => {
    render(<StrategicHub />)
    expect(screen.getByText('Evolution')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Intel')).toBeInTheDocument()
  })

  it('SH-005: navigates to SAGE subsystem when Open SAGE is clicked', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    // Should show sub-tab navigation and Overview button
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('SH-006: navigates to Arena subsystem when Open Battle Arena is clicked', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open Battle Arena dashboard'))
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content-arena')).toBeInTheDocument()
  })

  it('SH-007: navigates to Mitsuke subsystem when Open Mitsuke is clicked', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open Mitsuke dashboard'))
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content-threatfeed')).toBeInTheDocument()
  })

  it('SH-008: returns to overview when Overview button is clicked', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    expect(screen.getByText('Overview')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Return to The Kumite overview'))
    // Back to overview with all three cards
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
  })

  it('SH-009: opens guide panel via help button on card', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Help for SAGE'))
    expect(screen.getByTestId('module-guide')).toBeInTheDocument()
    expect(screen.getByText('SAGE Guide')).toBeInTheDocument()
  })

  it('SH-010: opens config panel via configure button on card', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Configure SAGE'))
    expect(screen.getByTestId('sage-config')).toBeInTheDocument()
  })

  it('SH-011: shows header actions (help, config, overview) in subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    const actions = screen.getByTestId('header-actions')
    expect(actions).toBeInTheDocument()
    expect(screen.getByLabelText('Open SAGE Guide')).toBeInTheDocument()
    expect(screen.getByLabelText('Open sage configuration')).toBeInTheDocument()
  })

  it('SH-012: renders all six tab triggers in subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(6)
  })
})
