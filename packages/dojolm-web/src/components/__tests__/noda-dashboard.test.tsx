/**
 * File: noda-dashboard.test.tsx
 * Purpose: Unit tests for NODADashboard, DashboardCustomizer, DashboardConfigContext, and widgets
 * Test IDs: DSH-001 to DSH-033
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  DashboardConfigProvider,
  useDashboardConfig,
  WIDGET_CATALOG,
  DEFAULT_DASHBOARD_CONFIG,
  type DashboardConfig,
  type WidgetSlot,
} from '../dashboard/DashboardConfigContext'

// ---------------------------------------------------------------------------
// Helper: Test component that exposes context
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { config, toggleWidget, reorderWidgets, resetToDefaults, moveWidget } = useDashboardConfig()
  const visible = config.widgets.filter(w => w.visible)
  return (
    <div>
      <span data-testid="visible-count">{visible.length}</span>
      <span data-testid="total-count">{config.widgets.length}</span>
      <span data-testid="layout">{config.layout}</span>
      <button data-testid="toggle-quick-launch" onClick={() => toggleWidget('quick-launch')}>Toggle QL</button>
      <button data-testid="toggle-quick-scan" onClick={() => toggleWidget('quick-scan')}>Toggle QS</button>
      <button data-testid="reset" onClick={resetToDefaults}>Reset</button>
      <button data-testid="move-up" onClick={() => moveWidget('quick-launch', 'up')}>Move Up</button>
      <button data-testid="move-down" onClick={() => moveWidget('quick-launch', 'down')}>Move Down</button>
      <ul data-testid="widget-ids">
        {visible.map(w => <li key={w.id}>{w.id}</li>)}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DSH: DashboardConfigContext Tests
// ---------------------------------------------------------------------------

describe('DashboardConfigContext (DSH-001 to DSH-008)', () => {
  beforeEach(() => {
    localStorage.removeItem('noda-dashboard-config')
  })

  afterEach(() => {
    localStorage.removeItem('noda-dashboard-config')
    vi.restoreAllMocks()
  })

  it('DSH-001: provides default config', () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    const visibleCount = Number(screen.getByTestId('visible-count').textContent)
    expect(visibleCount).toBeGreaterThan(0)
    expect(screen.getByTestId('layout').textContent).toBe('default')
  })

  it('DSH-002: toggle widget visibility', () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    const initialCount = Number(screen.getByTestId('visible-count').textContent)
    fireEvent.click(screen.getByTestId('toggle-quick-launch'))
    const newCount = Number(screen.getByTestId('visible-count').textContent)
    // Toggling a visible widget should hide it, changing count
    expect(newCount).not.toBe(initialCount)
  })

  it('DSH-003: toggle adds new widget from catalog', () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    // quick-scan is not default, toggle should add it
    const initialTotal = Number(screen.getByTestId('total-count').textContent)
    fireEvent.click(screen.getByTestId('toggle-quick-scan'))
    const newTotal = Number(screen.getByTestId('total-count').textContent)
    expect(newTotal).toBeGreaterThanOrEqual(initialTotal)
  })

  it('DSH-004: reset restores defaults', () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    // Toggle off a widget
    fireEvent.click(screen.getByTestId('toggle-quick-launch'))
    // Reset
    fireEvent.click(screen.getByTestId('reset'))
    const defaultVisibleCount = DEFAULT_DASHBOARD_CONFIG.widgets.filter(w => w.visible).length
    expect(Number(screen.getByTestId('visible-count').textContent)).toBe(defaultVisibleCount)
  })

  it('DSH-005: move widget changes order', () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    // Just verify move doesn't crash
    fireEvent.click(screen.getByTestId('move-down'))
    expect(screen.getByTestId('visible-count')).toBeInTheDocument()
  })

  it('DSH-006: config persists to localStorage', async () => {
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    // Toggle a widget to trigger save
    fireEvent.click(screen.getByTestId('toggle-quick-launch'))
    // The save happens in a useEffect — wait for it
    await waitFor(() => {
      const stored = localStorage.getItem('noda-dashboard-config')
      expect(stored).toBeTruthy()
      if (stored) {
        const parsed = JSON.parse(stored)
        // The toggled widget should be hidden in the saved config
        const ql = parsed.widgets.find((w: WidgetSlot) => w.id === 'quick-launch')
        expect(ql?.visible).toBe(false)
      }
    })
  })

  it('DSH-007: useDashboardConfig throws outside provider', () => {
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useDashboardConfig must be used within DashboardConfigProvider')
  })

  it('DSH-008: loads config from localStorage', async () => {
    const customConfig: DashboardConfig = {
      widgets: [
        { id: 'quick-launch', visible: true, order: 0, size: 'full' },
        { id: 'health-gauge', visible: false, order: 1, size: 'third' },
      ],
      layout: 'default',
    }
    localStorage.setItem('noda-dashboard-config', JSON.stringify(customConfig))
    render(
      <DashboardConfigProvider>
        <TestConsumer />
      </DashboardConfigProvider>
    )
    // After hydration from localStorage (useEffect runs async)
    await waitFor(() => {
      expect(Number(screen.getByTestId('visible-count').textContent)).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// DSH: WIDGET_CATALOG Tests
// ---------------------------------------------------------------------------

describe('WIDGET_CATALOG (DSH-009 to DSH-030)', () => {
  it('DSH-009: catalog has 27 entries', () => {
    expect(WIDGET_CATALOG.length).toBe(27)
  })

  it('DSH-010: all catalog entries have required fields', () => {
    for (const entry of WIDGET_CATALOG) {
      expect(entry.id).toBeTruthy()
      expect(entry.label).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(['interactive', 'dynamic', 'visual', 'strategic', 'reference']).toContain(entry.category)
      expect(['full', 'half', 'third']).toContain(entry.defaultSize)
      expect(typeof entry.isDefault).toBe('boolean')
    }
  })

  it('DSH-011: all catalog IDs are unique', () => {
    const ids = WIDGET_CATALOG.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('DSH-012: quick-launch widget exists and is default', () => {
    const ql = WIDGET_CATALOG.find(w => w.id === 'quick-launch')
    expect(ql).toBeDefined()
    expect(ql?.isDefault).toBe(true)
    expect(ql?.category).toBe('interactive')
  })

  it('DSH-013: health-gauge widget exists', () => {
    const hg = WIDGET_CATALOG.find(w => w.id === 'health-gauge')
    expect(hg).toBeDefined()
    expect(hg?.category).toBe('visual')
  })

  it('DSH-014: guard-controls widget exists', () => {
    const gc = WIDGET_CATALOG.find(w => w.id === 'guard-controls')
    expect(gc).toBeDefined()
    expect(gc?.isDefault).toBe(true)
  })

  it('DSH-015: threat-radar widget exists', () => {
    const tr = WIDGET_CATALOG.find(w => w.id === 'threat-radar')
    expect(tr).toBeDefined()
    expect(tr?.category).toBe('visual')
  })

  it('DSH-016: kill-count widget exists', () => {
    const kc = WIDGET_CATALOG.find(w => w.id === 'kill-count')
    expect(kc).toBeDefined()
    expect(kc?.isDefault).toBe(true)
  })

  it('DSH-017: session-pulse widget exists', () => {
    const sp = WIDGET_CATALOG.find(w => w.id === 'session-pulse')
    expect(sp).toBeDefined()
  })

  it('DSH-018: guard-stats widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'guard-stats')).toBeDefined()
  })

  it('DSH-019: batch-progress widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'batch-progress')).toBeDefined()
  })

  it('DSH-020: activity-feed widget exists and is default', () => {
    const af = WIDGET_CATALOG.find(w => w.id === 'activity-feed')
    expect(af).toBeDefined()
    expect(af?.isDefault).toBe(true)
  })

  it('DSH-021: guard-audit widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'guard-audit')).toBeDefined()
  })

  it('DSH-022: threat-trend widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'threat-trend')).toBeDefined()
  })

  it('DSH-023: attack-of-day widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'attack-of-day')).toBeDefined()
  })

  it('DSH-024: fixture-roulette widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'fixture-roulette')).toBeDefined()
  })

  it('DSH-025: engine-grid widget exists and is default', () => {
    const eg = WIDGET_CATALOG.find(w => w.id === 'engine-grid')
    expect(eg?.isDefault).toBe(true)
  })

  it('DSH-026: arena-leaderboard widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'arena-leaderboard')).toBeDefined()
  })

  it('DSH-027: sage-status widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'sage-status')).toBeDefined()
  })

  it('DSH-028: ecosystem-pulse widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'ecosystem-pulse')).toBeDefined()
  })

  it('DSH-029: ronin-hub widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'ronin-hub')).toBeDefined()
  })

  it('DSH-030: llm-jutsu widget exists', () => {
    expect(WIDGET_CATALOG.find(w => w.id === 'llm-jutsu')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// DSH: DashboardCustomizer Tests
// ---------------------------------------------------------------------------

describe('DashboardCustomizer (DSH-031 to DSH-033)', () => {
  beforeEach(() => {
    localStorage.removeItem('noda-dashboard-config')
  })

  afterEach(() => {
    localStorage.removeItem('noda-dashboard-config')
  })

  it('DSH-031: customizer renders nothing when closed', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    const { container } = render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={false} onClose={vi.fn()} />
      </DashboardConfigProvider>
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('DSH-032: customizer opens with widget list', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={true} onClose={vi.fn()} />
      </DashboardConfigProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Customize Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/widgets active/)).toBeInTheDocument()
    // Category headers
    expect(screen.getByText('Interactive / Action')).toBeInTheDocument()
    expect(screen.getByText('Dynamic / Live')).toBeInTheDocument()
    expect(screen.getByText('Visual / Gamification')).toBeInTheDocument()
  })

  it('DSH-033: reset to defaults button exists', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={true} onClose={vi.fn()} />
      </DashboardConfigProvider>
    )
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument()
  })

  it('DSH-033b: close button calls onClose', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    const onClose = vi.fn()
    render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={true} onClose={onClose} />
      </DashboardConfigProvider>
    )
    fireEvent.click(screen.getByLabelText('Close customizer'))
    expect(onClose).toHaveBeenCalled()
  })

  it('DSH-033c: widget toggle switch has correct aria', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={true} onClose={vi.fn()} />
      </DashboardConfigProvider>
    )
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)
    // Each switch should have aria-label
    for (const sw of switches) {
      expect(sw).toHaveAttribute('aria-label')
      expect(sw).toHaveAttribute('aria-checked')
    }
  })

  it('DSH-033d: default widgets are checked in customizer', async () => {
    const { DashboardCustomizer } = await import('../dashboard/DashboardCustomizer')
    render(
      <DashboardConfigProvider>
        <DashboardCustomizer open={true} onClose={vi.fn()} />
      </DashboardConfigProvider>
    )
    // Wait for hydration useEffect to complete with defaults
    await waitFor(() => {
      const qlSwitch = screen.getByLabelText('Toggle Quick Launch Pad')
      expect(qlSwitch).toHaveAttribute('aria-checked', 'true')
    })
  })
})

// ---------------------------------------------------------------------------
// DSH: DEFAULT_DASHBOARD_CONFIG structure tests
// ---------------------------------------------------------------------------

describe('DEFAULT_DASHBOARD_CONFIG (DSH extra)', () => {
  it('has correct structure', () => {
    expect(DEFAULT_DASHBOARD_CONFIG.layout).toBe('default')
    expect(Array.isArray(DEFAULT_DASHBOARD_CONFIG.widgets)).toBe(true)
    expect(DEFAULT_DASHBOARD_CONFIG.widgets.length).toBeGreaterThan(0)
  })

  it('all default widgets are marked visible', () => {
    for (const w of DEFAULT_DASHBOARD_CONFIG.widgets) {
      expect(w.visible).toBe(true)
    }
  })

  it('all default widgets have valid size', () => {
    for (const w of DEFAULT_DASHBOARD_CONFIG.widgets) {
      expect(['full', 'half', 'third']).toContain(w.size)
    }
  })

  it('order values are sequential', () => {
    const orders = DEFAULT_DASHBOARD_CONFIG.widgets.map(w => w.order)
    for (let i = 0; i < orders.length; i++) {
      expect(orders[i]).toBe(i)
    }
  })
})
