/**
 * File: sensei-suggestions.test.tsx
 * Purpose: Unit tests for SenseiSuggestions component
 * Test IDs: SSG-001 to SSG-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { SenseiSuggestions } from '../sensei/SenseiSuggestions'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiSuggestions (SSG-001 to SSG-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SSG-001: renders a list with aria-label "Suggested prompts"', () => {
    render(<SenseiSuggestions activeModule="dashboard" onSend={vi.fn()} />)
    expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Suggested prompts')
  })

  it('SSG-002: renders dashboard-specific suggestions', () => {
    render(<SenseiSuggestions activeModule="dashboard" onSend={vi.fn()} />)
    expect(screen.getByText('Show platform stats')).toBeInTheDocument()
    expect(screen.getByText('Check guard status')).toBeInTheDocument()
    expect(screen.getByText('Show leaderboard')).toBeInTheDocument()
  })

  it('SSG-003: renders scanner-specific suggestions', () => {
    render(<SenseiSuggestions activeModule="scanner" onSend={vi.fn()} />)
    expect(screen.getByText('Scan a prompt')).toBeInTheDocument()
    expect(screen.getByText('Explain findings')).toBeInTheDocument()
  })

  it('SSG-004: renders default suggestions for unknown module', () => {
    render(<SenseiSuggestions activeModule={'unknown-module' as never} onSend={vi.fn()} />)
    expect(screen.getByText('What can I do?')).toBeInTheDocument()
  })

  it('SSG-005: calls onSend with suggestion text when clicked', () => {
    const onSend = vi.fn()
    render(<SenseiSuggestions activeModule="dashboard" onSend={onSend} />)
    fireEvent.click(screen.getByText('Show platform stats'))
    expect(onSend).toHaveBeenCalledWith('Show platform stats')
  })

  it('SSG-006: renders correct number of suggestion buttons for guard module', () => {
    render(<SenseiSuggestions activeModule="guard" onSend={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(screen.getByText('Check guard status')).toBeInTheDocument()
    expect(screen.getByText('Show guard audit log')).toBeInTheDocument()
    expect(screen.getByText('Explain guard modes')).toBeInTheDocument()
  })
})
