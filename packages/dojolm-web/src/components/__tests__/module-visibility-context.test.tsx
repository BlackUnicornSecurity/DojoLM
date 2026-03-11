/**
 * File: module-visibility-context.test.tsx
 * Purpose: Unit tests for ModuleVisibilityContext — module on/off state and persistence
 * Test IDs: MV-001 to MV-012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ModuleVisibilityProvider, useModuleVisibility } from '@/lib/contexts/ModuleVisibilityContext'

const STORAGE_KEY = 'noda-module-vis'

// ---------------------------------------------------------------------------
// Helper: Test component that exposes context
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { isVisible, toggle, resetAll, visibility } = useModuleVisibility()
  return (
    <div>
      <span data-testid="scanner-visible">{String(isVisible('scanner'))}</span>
      <span data-testid="guard-visible">{String(isVisible('guard'))}</span>
      <span data-testid="dashboard-visible">{String(isVisible('dashboard'))}</span>
      <span data-testid="admin-visible">{String(isVisible('admin'))}</span>
      <span data-testid="visibility-json">{JSON.stringify(visibility)}</span>
      <button data-testid="toggle-scanner" onClick={() => toggle('scanner')}>Toggle Scanner</button>
      <button data-testid="toggle-guard" onClick={() => toggle('guard')}>Toggle Guard</button>
      <button data-testid="toggle-dashboard" onClick={() => toggle('dashboard')}>Toggle Dashboard</button>
      <button data-testid="toggle-admin" onClick={() => toggle('admin')}>Toggle Admin</button>
      <button data-testid="reset-all" onClick={resetAll}>Reset All</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModuleVisibilityContext (MV-001 to MV-012)', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('MV-001: all modules visible by default', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    expect(screen.getByTestId('scanner-visible').textContent).toBe('true')
    expect(screen.getByTestId('guard-visible').textContent).toBe('true')
    expect(screen.getByTestId('dashboard-visible').textContent).toBe('true')
    expect(screen.getByTestId('admin-visible').textContent).toBe('true')
  })

  it('MV-002: toggle hides a module', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
  })

  it('MV-003: toggle twice restores module visibility', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('true')
  })

  it('MV-004: dashboard cannot be toggled off (always visible)', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-dashboard'))
    expect(screen.getByTestId('dashboard-visible').textContent).toBe('true')
  })

  it('MV-005: multiple modules can be toggled independently', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    fireEvent.click(screen.getByTestId('toggle-guard'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
    expect(screen.getByTestId('guard-visible').textContent).toBe('false')
    expect(screen.getByTestId('admin-visible').textContent).toBe('true')
  })

  it('MV-006: resetAll restores all modules to visible', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    fireEvent.click(screen.getByTestId('toggle-guard'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
    expect(screen.getByTestId('guard-visible').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('reset-all'))
    expect(screen.getByTestId('scanner-visible').textContent).toBe('true')
    expect(screen.getByTestId('guard-visible').textContent).toBe('true')
  })

  it('MV-007: persists state to localStorage on toggle', () => {
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('toggle-scanner'))
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.scanner).toBe(false)
  })

  it('MV-008: loads persisted state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scanner: false, guard: false }))
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
    expect(screen.getByTestId('guard-visible').textContent).toBe('false')
    expect(screen.getByTestId('admin-visible').textContent).toBe('true')
  })

  it('MV-009: resetAll clears localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scanner: false }))
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    fireEvent.click(screen.getByTestId('reset-all'))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('MV-010: useModuleVisibility throws outside provider', () => {
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useModuleVisibility must be used within ModuleVisibilityProvider')
  })

  it('MV-011: handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
    // Should not throw — falls back to empty state (all visible)
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    expect(screen.getByTestId('scanner-visible').textContent).toBe('true')
    expect(screen.getByTestId('guard-visible').textContent).toBe('true')
  })

  it('MV-012: prototype pollution prevention via JSON reviver', () => {
    const poisoned = '{"__proto__":{"polluted":true},"scanner":false}'
    localStorage.setItem(STORAGE_KEY, poisoned)
    render(
      <ModuleVisibilityProvider>
        <TestConsumer />
      </ModuleVisibilityProvider>
    )
    // Valid data loads correctly
    expect(screen.getByTestId('scanner-visible').textContent).toBe('false')
    // Critical: Object.prototype not polluted
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false)
  })
})
