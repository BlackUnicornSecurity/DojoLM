/**
 * File: widget-empty-state.test.tsx
 * Purpose: Unit tests for WidgetEmptyState component
 * Test IDs: WE-001 to WE-010
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AlertCircle, Search, Inbox } from 'lucide-react'

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { WidgetEmptyState } from '../dashboard/WidgetEmptyState'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WidgetEmptyState', () => {
  it('WE-001: renders title text', () => {
    render(<WidgetEmptyState icon={Inbox} title="No data available" />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('WE-002: renders icon as aria-hidden', () => {
    const { container } = render(<WidgetEmptyState icon={Inbox} title="Empty" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('WE-003: renders description when provided', () => {
    render(
      <WidgetEmptyState
        icon={Inbox}
        title="Empty"
        description="Try adjusting your filters"
      />
    )
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('WE-004: does not render description when not provided', () => {
    const { container } = render(<WidgetEmptyState icon={Inbox} title="Empty" />)
    const paragraphs = container.querySelectorAll('p')
    // Only the title paragraph
    expect(paragraphs.length).toBe(1)
  })

  it('WE-005: renders action button when provided', () => {
    const onClick = vi.fn()
    render(
      <WidgetEmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: 'Refresh', onClick }}
      />
    )
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('WE-006: calls action onClick when button clicked', () => {
    const onClick = vi.fn()
    render(
      <WidgetEmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: 'Retry', onClick }}
      />
    )
    fireEvent.click(screen.getByText('Retry'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('WE-007: does not render action button when not provided', () => {
    const { container } = render(<WidgetEmptyState icon={Inbox} title="Empty" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('WE-008: renders with different icon components', () => {
    const { container: c1 } = render(<WidgetEmptyState icon={AlertCircle} title="Error" />)
    expect(c1.querySelector('svg')).toBeInTheDocument()

    const { container: c2 } = render(<WidgetEmptyState icon={Search} title="Search" />)
    expect(c2.querySelector('svg')).toBeInTheDocument()
  })

  it('WE-009: action button has type="button"', () => {
    render(
      <WidgetEmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: 'Click', onClick: vi.fn() }}
      />
    )
    const button = screen.getByText('Click')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('WE-010: renders with both description and action together', () => {
    const onClick = vi.fn()
    render(
      <WidgetEmptyState
        icon={Inbox}
        title="No results"
        description="Your search returned no results"
        action={{ label: 'Clear filters', onClick }}
      />
    )
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText('Your search returned no results')).toBeInTheDocument()
    expect(screen.getByText('Clear filters')).toBeInTheDocument()
  })
})
