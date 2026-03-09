/**
 * File: data-source-selector.test.tsx
 * Purpose: Tests for DataSourceSelector component
 * Story: KASHIWA-13.9
 * Scope: 3 pills, Coming Soon, sync status, toggle, reset
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataSourceSelector } from '@/components/attackdna/DataSourceSelector'
import type { DataSourceTier } from 'bu-tpi/attackdna'

function renderSelector(overrides: Partial<Parameters<typeof DataSourceSelector>[0]> = {}) {
  const defaultProps = {
    activeTiers: new Set<DataSourceTier>(['dojo-local']),
    onToggle: vi.fn(),
    onReset: vi.fn(),
    masterSyncStatus: null,
    ...overrides,
  }
  return { ...render(<DataSourceSelector {...defaultProps} />), props: defaultProps }
}

describe('DataSourceSelector', () => {
  it('renders 3 tier pills', () => {
    renderSelector()
    expect(screen.getByRole('group', { name: /data source filter/i })).toBeInTheDocument()
    expect(screen.getByText('Dojo Local')).toBeInTheDocument()
    expect(screen.getByText('DojoLM Global')).toBeInTheDocument()
    expect(screen.getByText('Master')).toBeInTheDocument()
  })

  it('shows Coming Soon badge for unavailable tier', () => {
    renderSelector()
    expect(screen.getByText('Soon')).toBeInTheDocument()
    const globalButton = screen.getByRole('button', { name: /DojoLM Global.*Coming Soon/i })
    expect(globalButton).toBeDisabled()
  })

  it('marks active tier as pressed', () => {
    renderSelector({ activeTiers: new Set<DataSourceTier>(['dojo-local']) })
    const localButton = screen.getByRole('button', { name: /Dojo Local/i })
    expect(localButton).toHaveAttribute('aria-pressed', 'true')

    const masterButton = screen.getByRole('button', { name: /^Master$/i })
    expect(masterButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle when a tier pill is clicked', () => {
    const onToggle = vi.fn()
    renderSelector({ onToggle })

    fireEvent.click(screen.getByRole('button', { name: /^Master$/i }))
    expect(onToggle).toHaveBeenCalledWith('master')
  })

  it('does not call onToggle for disabled tier', () => {
    const onToggle = vi.fn()
    renderSelector({ onToggle })

    const globalButton = screen.getByRole('button', { name: /DojoLM Global/i })
    fireEvent.click(globalButton)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows reset button when not all available tiers are active', () => {
    const onReset = vi.fn()
    renderSelector({ activeTiers: new Set<DataSourceTier>(['dojo-local']), onReset })

    const resetBtn = screen.getByRole('button', { name: /reset data source filter/i })
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(onReset).toHaveBeenCalled()
  })

  it('hides reset button when all available tiers are active', () => {
    renderSelector({ activeTiers: new Set<DataSourceTier>(['dojo-local', 'master']) })
    expect(screen.queryByRole('button', { name: /reset data source filter/i })).not.toBeInTheDocument()
  })

  it('shows master sync status - never synced', () => {
    renderSelector({
      activeTiers: new Set<DataSourceTier>(['master']),
      masterSyncStatus: { lastSyncAt: null, syncInProgress: false },
    })
    expect(screen.getByText('Never synced')).toBeInTheDocument()
  })

  it('shows master sync status - syncing', () => {
    renderSelector({
      activeTiers: new Set<DataSourceTier>(['master']),
      masterSyncStatus: { lastSyncAt: null, syncInProgress: true },
    })
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('shows master sync status - recent sync with green dot', () => {
    const recentTime = new Date(Date.now() - 60_000).toISOString() // 1 min ago
    renderSelector({
      activeTiers: new Set<DataSourceTier>(['master']),
      masterSyncStatus: { lastSyncAt: recentTime, syncInProgress: false },
    })
    expect(screen.getByText('1m ago')).toBeInTheDocument()
  })

  it('shows master sync status - old sync', () => {
    const oldTime = new Date(Date.now() - 48 * 60 * 60_000).toISOString() // 2 days ago
    renderSelector({
      activeTiers: new Set<DataSourceTier>(['master']),
      masterSyncStatus: { lastSyncAt: oldTime, syncInProgress: false },
    })
    expect(screen.getByText('2d ago')).toBeInTheDocument()
  })
})
