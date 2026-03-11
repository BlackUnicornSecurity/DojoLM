/**
 * File: mutation-timeline.test.tsx
 * Purpose: Tests for MutationTimeline component — rendering, date filter, legend, a11y
 * Story: S76 - AttackDNA Explorer
 * Index:
 * - TC-MTTL-001: renders mutation types legend
 * - TC-MTTL-002: renders date range filter inputs
 * - TC-MTTL-003: renders entry count summary
 * - TC-MTTL-004: renders timeline entries with mutation type badges
 * - TC-MTTL-005: renders timeline entries with category badges
 * - TC-MTTL-006: renders similarity percentage
 * - TC-MTTL-007: renders edge references (from -> to node)
 * - TC-MTTL-008: date filter narrows entries
 * - TC-MTTL-009: clear button resets date filter
 * - TC-MTTL-010: entries are grouped by date
 * - TC-MTTL-011: empty timeline prop shows no-data message
 * - TC-MTTL-012: applies custom className
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MutationTimeline } from '@/components/attackdna/MutationTimeline'

describe('MutationTimeline', () => {
  it('TC-MTTL-001: renders mutation types legend', () => {
    render(<MutationTimeline />)
    expect(screen.getByText('Mutation Types')).toBeInTheDocument()
    const legendList = screen.getByRole('list', { name: /mutation type color legend/i })
    expect(legendList).toBeInTheDocument()
    // Legend renders 6 mutation types as list items
    const items = legendList.querySelectorAll('[role="listitem"]')
    expect(items.length).toBe(6)
    // Verify specific types present in the legend (scoped to avoid duplication with timeline)
    const legendScope = within(legendList)
    expect(legendScope.getByText('substitution')).toBeInTheDocument()
    expect(legendScope.getByText('deletion')).toBeInTheDocument()
  })

  it('TC-MTTL-002: renders date range filter inputs', () => {
    render(<MutationTimeline />)
    expect(screen.getByLabelText('Filter start date')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter end date')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
  })

  it('TC-MTTL-003: renders entry count summary', () => {
    render(<MutationTimeline />)
    // 10 mock entries
    expect(screen.getByText('10 of 10 entries')).toBeInTheDocument()
  })

  it('TC-MTTL-004: renders timeline entries with mutation type badges', () => {
    render(<MutationTimeline />)
    // The mock data has multiple substitution entries, so getAllByText
    const substitutionBadges = screen.getAllByText('substitution')
    // 1 in legend + 2 in timeline entries
    expect(substitutionBadges.length).toBeGreaterThanOrEqual(2)
  })

  it('TC-MTTL-005: renders timeline entries with category badges', () => {
    render(<MutationTimeline />)
    // The mock data includes prompt-injection, encoded, social-engineering, jailbreak categories
    const promptInjectionBadges = screen.getAllByText('prompt-injection')
    expect(promptInjectionBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('TC-MTTL-006: renders similarity percentage', () => {
    render(<MutationTimeline />)
    // tl-001 has similarity 0.87 -> "87% sim"
    expect(screen.getByText('87% sim')).toBeInTheDocument()
    // tl-002 has similarity 0.92 -> "92% sim"
    expect(screen.getByText('92% sim')).toBeInTheDocument()
  })

  it('TC-MTTL-007: renders edge references (from -> to node)', () => {
    render(<MutationTimeline />)
    // tl-001: node-001 -> node-002
    expect(screen.getByText(/node-001 → node-002/)).toBeInTheDocument()
    // tl-005: node-012 -> node-013
    expect(screen.getByText(/node-012 → node-013/)).toBeInTheDocument()
  })

  it('TC-MTTL-008: date filter narrows entries', () => {
    render(<MutationTimeline />)
    // Filter to only show entries on 2026-03-01
    const startInput = screen.getByLabelText('Filter start date')
    const endInput = screen.getByLabelText('Filter end date')

    fireEvent.change(startInput, { target: { value: '2026-03-01' } })
    fireEvent.change(endInput, { target: { value: '2026-03-01' } })

    // Only tl-009 and tl-010 are on 2026-03-01
    expect(screen.getByText('2 of 10 entries')).toBeInTheDocument()
  })

  it('TC-MTTL-009: clear button resets date filter', () => {
    render(<MutationTimeline />)
    // Set a filter first
    const startInput = screen.getByLabelText('Filter start date')
    fireEvent.change(startInput, { target: { value: '2026-03-01' } })

    // Clear button should appear
    const clearBtn = screen.getByRole('button', { name: /clear date filter/i })
    fireEvent.click(clearBtn)

    // Back to all 10 entries
    expect(screen.getByText('10 of 10 entries')).toBeInTheDocument()
  })

  it('TC-MTTL-010: entries are grouped by date with section headings', () => {
    render(<MutationTimeline />)
    // Mock data has entries on Feb 28 and Mar 1
    // The exact format depends on locale, but both date sections should exist
    const sections = screen.getAllByRole('region')
    // Should have at least 2 date groups
    expect(sections.length).toBeGreaterThanOrEqual(2)
  })

  it('TC-MTTL-011: date filter with no matching range shows empty message', () => {
    render(<MutationTimeline />)
    // Set a date range that excludes all entries (all mock data is Feb 28 - Mar 1, 2026)
    const startInput = screen.getByLabelText('Filter start date')
    const endInput = screen.getByLabelText('Filter end date')
    fireEvent.change(startInput, { target: { value: '2099-01-01' } })
    fireEvent.change(endInput, { target: { value: '2099-01-02' } })

    expect(screen.getByText('0 of 10 entries')).toBeInTheDocument()
    expect(screen.getByText(/no timeline entries match the selected date range/i)).toBeInTheDocument()
  })

  it('TC-MTTL-012: applies custom className', () => {
    const { container } = render(<MutationTimeline className="my-timeline-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-timeline-class')
  })
})
