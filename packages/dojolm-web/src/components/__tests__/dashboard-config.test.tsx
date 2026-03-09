/**
 * File: dashboard-config.test.tsx
 * Purpose: Smoke tests for DashboardConfigContext, WIDGET_CATALOG, and NODADashboard shell
 * Story: TPI-NODA-1.5.10
 */

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  DashboardConfigProvider,
  useDashboardConfig,
  WIDGET_CATALOG,
  type WidgetCatalogEntry,
} from '@/components/dashboard/DashboardConfigContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function wrapper({ children }: { children: ReactNode }) {
  return <DashboardConfigProvider>{children}</DashboardConfigProvider>
}

beforeEach(() => {
  localStorageMock.clear()
})

describe('WIDGET_CATALOG', () => {
  it('contains exactly 27 widgets', () => {
    expect(WIDGET_CATALOG).toHaveLength(27)
  })

  it('has unique widget IDs', () => {
    const ids = WIDGET_CATALOG.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has 8 default widgets', () => {
    const defaults = WIDGET_CATALOG.filter(w => w.isDefault)
    expect(defaults).toHaveLength(8)
  })

  it('covers all 5 categories', () => {
    const categories = new Set(WIDGET_CATALOG.map(w => w.category))
    expect(categories).toEqual(new Set(['interactive', 'dynamic', 'visual', 'strategic', 'reference']))
  })

  it('every widget has required fields', () => {
    for (const entry of WIDGET_CATALOG) {
      expect(entry.id).toBeTruthy()
      expect(entry.label).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect([3, 4, 6, 8, 12]).toContain(entry.defaultSize)
      expect(typeof entry.isDefault).toBe('boolean')
    }
  })
})

describe('DashboardConfigContext', () => {
  it('provides default config with 8 visible widgets', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    const visible = result.current.config.widgets.filter(w => w.visible)
    expect(visible).toHaveLength(8)
  })

  it('default config only includes the 8 default widgets', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    expect(result.current.config.widgets).toHaveLength(8)
    expect(result.current.config.widgets.every(w => w.visible)).toBe(true)
  })

  it('toggleWidget hides a visible widget', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    const firstVisible = result.current.config.widgets.find(w => w.visible)!
    act(() => {
      result.current.toggleWidget(firstVisible.id)
    })
    const updated = result.current.config.widgets.find(w => w.id === firstVisible.id)!
    expect(updated.visible).toBe(false)
  })

  it('toggleWidget adds and shows a non-default widget', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    // Find a widget in catalog that is NOT default
    const nonDefault = WIDGET_CATALOG.find(w => !w.isDefault)!
    act(() => {
      result.current.toggleWidget(nonDefault.id)
    })
    const added = result.current.config.widgets.find(w => w.id === nonDefault.id)!
    expect(added).toBeDefined()
    expect(added.visible).toBe(true)
    expect(result.current.config.widgets).toHaveLength(9)
  })

  it('moveWidget changes order', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    const visible = result.current.config.widgets.filter(w => w.visible).sort((a, b) => a.order - b.order)
    const firstId = visible[0].id
    act(() => {
      result.current.moveWidget(firstId, 'down')
    })
    const after = result.current.config.widgets.filter(w => w.visible).sort((a, b) => a.order - b.order)
    expect(after[0].id).not.toBe(firstId)
  })

  it('resetToDefaults restores original config', () => {
    const { result } = renderHook(() => useDashboardConfig(), { wrapper })
    // Toggle a widget off
    const firstVisible = result.current.config.widgets.find(w => w.visible)!
    act(() => {
      result.current.toggleWidget(firstVisible.id)
    })
    expect(result.current.config.widgets.filter(w => w.visible)).toHaveLength(7)
    // Reset
    act(() => {
      result.current.resetToDefaults()
    })
    expect(result.current.config.widgets.filter(w => w.visible)).toHaveLength(8)
  })

  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useDashboardConfig())
    }).toThrow()
    consoleSpy.mockRestore()
  })
})
