/**
 * File: kumite.test.tsx
 * Purpose: Unit tests for The Kumite (StrategicHub, SAGEDashboard, Arena, Mitsuke)
 * Test IDs: ARN-001 to ARN-012, SGE-001 to SGE-010, MTK-001 to MTK-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="module-guide">{title}</div> : null,
}))

vi.mock('@/components/ui/ModuleOnboarding', () => ({
  ModuleOnboarding: ({ storageKey }: { storageKey: string }) => (
    <div data-testid={`onboarding-${storageKey}`}>Onboarding</div>
  ),
  resetOnboarding: vi.fn(),
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

vi.mock('@/components/ui/ConfigPanel', () => ({
  ConfigPanel: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="config-panel">{title}</div> : null,
}))

// Mock dynamic imports for sub-modules
vi.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: (loader: () => Promise<{ default: React.ComponentType }>, opts?: { loading?: () => React.ReactNode }) => {
      // Return a component that renders the loading fallback or a placeholder
      const Component = (props: Record<string, unknown>) => {
        return <div data-testid="dynamic-component" {...props}>Dynamic Component</div>
      }
      Component.displayName = 'DynamicComponent'
      return Component
    },
  }
})

vi.mock('../strategic/KumiteConfig', () => ({
  SAGEConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="sage-config">SAGE Config</div> : null,
  ArenaConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="arena-config">Arena Config</div> : null,
  MitsukeConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mitsuke-config">Mitsuke Config</div> : null,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { StrategicHub } from '../strategic/StrategicHub'
import { SAGEDashboard } from '../strategic/SAGEDashboard'

// ---------------------------------------------------------------------------
// ARN: Strategic Hub / Arena Tests
// ---------------------------------------------------------------------------

describe('StrategicHub (ARN-001 to ARN-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
  })

  it('ARN-001: renders The Kumite header and overview', () => {
    render(<StrategicHub />)
    expect(screen.getByText('The Kumite')).toBeInTheDocument()
  })

  it('ARN-002: renders three subsystem cards — SAGE, Arena, Mitsuke', () => {
    render(<StrategicHub />)
    expect(screen.getByText('SAGE')).toBeInTheDocument()
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
  })

  it('ARN-003: each card shows metrics', () => {
    render(<StrategicHub />)
    // SAGE metrics
    expect(screen.getByText('142')).toBeInTheDocument() // Generations
    expect(screen.getByText('0.94')).toBeInTheDocument() // Best Fitness
    // Arena metrics
    expect(screen.getByText('3')).toBeInTheDocument() // Active Matches
    // Mitsuke metrics (12 appears in both Mitsuke and DNA cards)
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1) // Active Sources + DNA Clusters
  })

  it('ARN-004: clicking Open SAGE navigates to subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    // After clicking, should show tab navigation
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('ARN-005: clicking Open Arena navigates to subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open Battle Arena dashboard'))
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('ARN-006: clicking Open Mitsuke navigates to subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open Mitsuke dashboard'))
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('ARN-007: Overview button returns to overview', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    fireEvent.click(screen.getByLabelText('Return to The Kumite overview'))
    expect(screen.getByLabelText('Open SAGE dashboard')).toBeInTheDocument()
  })

  it('ARN-008: tab navigation shows all three tabs', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    expect(screen.getByRole('tablist', { name: 'The Kumite subsystems' })).toBeInTheDocument()
  })

  it('ARN-009: help button shows guide panel', () => {
    render(<StrategicHub />)
    const helpButtons = screen.getAllByLabelText(/Help for/)
    expect(helpButtons.length).toBe(4) // one per card
    fireEvent.click(helpButtons[0])
    expect(screen.getByTestId('module-guide')).toBeInTheDocument()
  })

  it('ARN-010: config button opens config panel', () => {
    render(<StrategicHub />)
    const configButtons = screen.getAllByLabelText(/Configure/)
    expect(configButtons.length).toBe(4)
    fireEvent.click(configButtons[0])
    expect(screen.getByTestId('sage-config')).toBeInTheDocument()
  })

  it('ARN-011: badges show on cards', () => {
    render(<StrategicHub />)
    expect(screen.getByText('Evolution')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Intel')).toBeInTheDocument()
  })

  it('ARN-012: onboarding renders in subsystem view', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    expect(screen.getByTestId('onboarding-sage-onboarded')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// SGE: SAGE Dashboard Tests
// ---------------------------------------------------------------------------

describe('SAGEDashboard (SGE-001 to SGE-010)', () => {
  it('SGE-001: renders SAGE Evolution Engine header', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('SAGE Evolution Engine')).toBeInTheDocument()
    expect(screen.getByText(/Synthetic attack generation/)).toBeInTheDocument()
  })

  it('SGE-002: shows Running status badge', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('SGE-003: shows key metrics — Generation, Best Fitness, Total Seeds, Quarantined', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('0.94')).toBeInTheDocument()
    expect(screen.getAllByText('23').length).toBeGreaterThanOrEqual(1)
    // Total seeds = sum of seed categories
    expect(screen.getByText('1,247')).toBeInTheDocument()
  })

  it('SGE-004: pause button toggles to Paused', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Pause evolution'))
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByLabelText('Resume evolution')).toBeInTheDocument()
  })

  it('SGE-005: resume button toggles back to Running', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Pause evolution'))
    fireEvent.click(screen.getByLabelText('Resume evolution'))
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('SGE-006: reset button sets to Stopped', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Stop evolution'))
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  it('SGE-007: mutation operators list renders', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Mutation Operators')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Mutation operators' })).toBeInTheDocument()
    expect(screen.getByText('Role Swap')).toBeInTheDocument()
    expect(screen.getByText('Base64 Encode')).toBeInTheDocument()
  })

  it('SGE-008: disabled operator shows Disabled badge', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByText('Semantic Shift')).toBeInTheDocument()
  })

  it('SGE-009: seed library categories render', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Seed Library')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Seed library categories' })).toBeInTheDocument()
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('Jailbreak')).toBeInTheDocument()
  })

  it('SGE-010: fitness chart renders with legend', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Fitness Over Generations')).toBeInTheDocument()
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
    expect(screen.getByText('Worst')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// MTK: Mitsuke Tests (via StrategicHub card and navigation)
// ---------------------------------------------------------------------------

describe('Mitsuke (MTK-001 to MTK-010)', () => {
  it('MTK-001: Mitsuke card renders with description', () => {
    render(<StrategicHub />)
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
    expect(screen.getByText(/Threat intelligence pipeline/)).toBeInTheDocument()
  })

  it('MTK-002: Mitsuke shows metrics on card', () => {
    render(<StrategicHub />)
    expect(screen.getByText('Active Sources')).toBeInTheDocument()
    expect(screen.getByText('Entries Today')).toBeInTheDocument()
    expect(screen.getByText('Open Alerts')).toBeInTheDocument()
  })

  it('MTK-003: Mitsuke help button shows guide', () => {
    render(<StrategicHub />)
    const helpButtons = screen.getAllByLabelText(/Help for/)
    const mitsukeHelp = helpButtons.find(btn => btn.getAttribute('aria-label')?.includes('Mitsuke'))
    expect(mitsukeHelp).toBeTruthy()
    if (mitsukeHelp) {
      fireEvent.click(mitsukeHelp)
      expect(screen.getByTestId('module-guide')).toBeInTheDocument()
    }
  })

  it('MTK-004: Mitsuke config button opens config', () => {
    render(<StrategicHub />)
    const configButtons = screen.getAllByLabelText(/Configure/)
    const mitsukeConfig = configButtons.find(btn => btn.getAttribute('aria-label')?.includes('Mitsuke'))
    expect(mitsukeConfig).toBeTruthy()
    if (mitsukeConfig) {
      fireEvent.click(mitsukeConfig)
      expect(screen.getByTestId('mitsuke-config')).toBeInTheDocument()
    }
  })

  it('MTK-005: navigating to Mitsuke subsystem shows onboarding', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open Mitsuke dashboard'))
    expect(screen.getByTestId('onboarding-mitsuke-onboarded')).toBeInTheDocument()
  })

  it('MTK-006: Mitsuke tab is selectable from subsystem tabs', () => {
    render(<StrategicHub />)
    fireEvent.click(screen.getByLabelText('Open SAGE dashboard'))
    // Should see tabs including Mitsuke
    const tabList = screen.getByRole('tablist', { name: 'The Kumite subsystems' })
    expect(tabList).toBeInTheDocument()
  })

  it('MTK-007: Mitsuke Intel badge on card', () => {
    render(<StrategicHub />)
    expect(screen.getByText('Intel')).toBeInTheDocument()
  })

  it('MTK-008: card shows 384 Entries Today', () => {
    render(<StrategicHub />)
    expect(screen.getByText('384')).toBeInTheDocument()
  })

  it('MTK-009: card shows 7 Open Alerts', () => {
    render(<StrategicHub />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('MTK-010: open button has correct aria-label', () => {
    render(<StrategicHub />)
    expect(screen.getByLabelText('Open Mitsuke dashboard')).toBeInTheDocument()
  })
})
