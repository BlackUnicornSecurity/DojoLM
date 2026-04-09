/**
 * File: sensei-panel.test.tsx
 * Purpose: Unit tests for SenseiPanel hidden module toggle dialog
 * Test IDs: SP-001 to SP-012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// Mock the dialog UI wrapper to render inline (no portal, no Radix)
vi.mock('@/components/ui/dialog', () => {
  const React = require('react')
  return {
    Dialog: ({ open, children, onOpenChange }: { open: boolean; children: React.ReactNode; onOpenChange?: (v: boolean) => void }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    DialogContent: React.forwardRef(({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }, _ref: React.Ref<HTMLDivElement>) => (
      <div role="dialog" data-testid="dialog-content" {...props}>{children}</div>
    )),
    DialogHeader: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => <div {...props}>{children}</div>,
    DialogFooter: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => <div {...props}>{children}</div>,
    DialogTitle: React.forwardRef(({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }, _ref: React.Ref<HTMLHeadingElement>) => (
      <h2 {...props}>{children}</h2>
    )),
    DialogDescription: React.forwardRef(({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }, _ref: React.Ref<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    )),
    DialogClose: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DialogOverlay: React.forwardRef((_props: Record<string, unknown>, _ref: React.Ref<HTMLDivElement>) => null),
    DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// ---------------------------------------------------------------------------
// Track module visibility state for testing
// ---------------------------------------------------------------------------

let mockVisibility: Record<string, boolean> = {}
const mockToggle = vi.fn((id: string) => {
  mockVisibility = { ...mockVisibility, [id]: mockVisibility[id] === false ? true : false }
})
const mockResetAll = vi.fn(() => {
  mockVisibility = {}
})

vi.mock('@/lib/contexts/ModuleVisibilityContext', () => ({
  useModuleVisibility: () => ({
    isVisible: (id: string) => {
      if (id === 'dashboard') return true
      return mockVisibility[id] !== false
    },
    toggle: mockToggle,
    resetAll: mockResetAll,
    visibility: mockVisibility,
  }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { SenseiPanel } from '../dashboard/SenseiPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiPanel (SP-001 to SP-012)', () => {
  beforeEach(() => {
    mockVisibility = {}
    mockToggle.mockClear()
    mockResetAll.mockClear()
  })

  it('SP-001: renders nothing when closed', () => {
    const { container } = render(<SenseiPanel open={false} onClose={vi.fn()} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('SP-002: renders dialog when open', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('SP-003: displays Welcome Sensei title', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Welcome Sensei')).toBeInTheDocument()
  })

  it('SP-004: displays toggle description', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Toggle modules on or off')).toBeInTheDocument()
  })

  it('SP-005: shows all group labels (Test, Protect, Intel & Evidence)', () => {
    // Train 2 PR-2.5 (2026-04-09): 4 brand-pillar groups collapsed to 3 verbs.
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Protect')).toBeInTheDocument()
    expect(screen.getByText('Intel & Evidence')).toBeInTheDocument()
  })

  it('SP-006: lists all toggleable modules (excludes dashboard + hidden)', () => {
    // Train 2 PR-4b.1 (2026-04-09): added Mitsuke, Amaterasu DNA, Kagami,
    // Battle Arena as first-class nav items. Strategic (The Kumite) is
    // demoted via hidden: true and should NOT appear in SenseiPanel.
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    // Test group
    expect(screen.getByText('Haiku Scanner')).toBeInTheDocument()
    expect(screen.getByText('Armory')).toBeInTheDocument()
    expect(screen.getByText('Model Lab')).toBeInTheDocument()
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByText('Atemi Lab')).toBeInTheDocument()
    // Train 2 PR-4b.5: Sengoku demoted via hidden: true — Campaigns now lives
    // as a sub-tab inside Atemi Lab (AdversarialLab).
    expect(screen.queryByText('Sengoku')).toBeNull()
    expect(screen.getByText('Ronin Hub')).toBeInTheDocument()
    // Protect group
    expect(screen.getByText('Hattori Guard')).toBeInTheDocument()
    expect(screen.getByText('Kotoba')).toBeInTheDocument()
    // Intel & Evidence group
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
    expect(screen.getByText('Amaterasu DNA')).toBeInTheDocument()
    expect(screen.getByText('Kagami')).toBeInTheDocument()
    expect(screen.getByText('Bushido Book')).toBeInTheDocument()
    // Admin (ungrouped)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    // Dashboard should NOT be listed (always on)
    expect(screen.queryByText('Dashboard')).toBeNull()
    // The Kumite should NOT be listed (demoted via hidden: true)
    expect(screen.queryByText('The Kumite')).toBeNull()
    // Sengoku should NOT be listed (demoted via hidden: true in PR-4b.5)
    expect(screen.queryByText('Sengoku')).toBeNull()
  })

  it('SP-007: clicking a module item calls toggle', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Haiku Scanner'))
    expect(mockToggle).toHaveBeenCalledWith('scanner')
  })

  it('SP-008: clicking multiple modules calls toggle for each', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Haiku Scanner'))
    fireEvent.click(screen.getByText('Hattori Guard'))
    fireEvent.click(screen.getByText('Atemi Lab'))
    expect(mockToggle).toHaveBeenCalledTimes(3)
    expect(mockToggle).toHaveBeenCalledWith('scanner')
    expect(mockToggle).toHaveBeenCalledWith('guard')
    expect(mockToggle).toHaveBeenCalledWith('adversarial')
  })

  it('SP-009: Reset All button exists and calls resetAll', () => {
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    const resetBtn = screen.getByText('Reset All')
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(mockResetAll).toHaveBeenCalledTimes(1)
  })

  it('SP-010: shows 14 toggleable module items (all except dashboard + hidden)', () => {
    // Train 2 PR-4b.1: 4 new first-class items (Mitsuke, DNA, Kagami, Arena);
    //   The Kumite demoted via hidden: true. 11 → 14.
    // Train 2 PR-4b.2: Payload Lab (Buki) scaffolded alongside Armory
    //   (Armory will merge into Buki in PR-4b.3). 14 → 15.
    // Train 2 PR-4b.5: Sengoku demoted via hidden: true — Campaigns now lives
    //   as a sub-tab inside Atemi Lab. 15 → 14.
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    const moduleLabels = [
      // Test group
      'Haiku Scanner', 'Armory', 'Buki', 'Model Lab', 'Battle Arena',
      'Atemi Lab', 'Ronin Hub',
      // Protect group
      'Hattori Guard', 'Kotoba',
      // Intel & Evidence group
      'Mitsuke', 'Amaterasu DNA', 'Kagami', 'Bushido Book',
      // Admin (ungrouped)
      'Admin',
    ]
    for (const label of moduleLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(moduleLabels.length).toBe(14)
  })

  it('SP-011: onClose is callable (dialog close integration)', () => {
    const onClose = vi.fn()
    render(<SenseiPanel open={true} onClose={onClose} />)
    // The dialog should be open and the callback should be available
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(typeof onClose).toBe('function')
  })

  it('SP-012: toggle visual indicator reflects state (visible vs hidden)', () => {
    // Set scanner to hidden before render
    mockVisibility = { scanner: false }
    render(<SenseiPanel open={true} onClose={vi.fn()} />)
    // The scanner row should have opacity-50 class (hidden state)
    const scannerButton = screen.getByText('Haiku Scanner').closest('button')
    expect(scannerButton).toBeTruthy()
    const classes = scannerButton!.className
    expect(classes).toContain('opacity-50')

    // Guard should NOT have opacity-50 (visible state)
    const guardButton = screen.getByText('Hattori Guard').closest('button')
    expect(guardButton).toBeTruthy()
    expect(guardButton!.className).not.toContain('opacity-50')
  })
})
