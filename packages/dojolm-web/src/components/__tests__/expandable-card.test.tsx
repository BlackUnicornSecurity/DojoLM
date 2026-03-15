/**
 * File: expandable-card.test.tsx
 * Purpose: Unit tests for ExpandableCard shared component
 * Test IDs: EC-001 to EC-008
 * Story: HAKONE H5.1
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ExpandableCard } from '../ui/ExpandableCard'

describe('ExpandableCard', () => {
  it('EC-001: renders the title text', () => {
    render(<ExpandableCard title="Test Title">Content</ExpandableCard>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('EC-002: renders subtitle when provided', () => {
    render(<ExpandableCard title="Title" subtitle="Sub">Content</ExpandableCard>)
    expect(screen.getByText('Sub')).toBeInTheDocument()
  })

  it('EC-003: renders badge when provided', () => {
    render(
      <ExpandableCard title="Title" badge={<span data-testid="badge">B</span>}>
        Content
      </ExpandableCard>
    )
    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('EC-004: starts collapsed by default (aria-expanded=false)', () => {
    render(<ExpandableCard title="Title">Content</ExpandableCard>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('EC-005: starts expanded when defaultExpanded=true', () => {
    render(<ExpandableCard title="Title" defaultExpanded>Content</ExpandableCard>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('EC-006: clicking header toggles expanded state', () => {
    render(<ExpandableCard title="Title">Content</ExpandableCard>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('EC-007: calls onToggle callback with new state', () => {
    const onToggle = vi.fn()
    render(<ExpandableCard title="Title" onToggle={onToggle}>Content</ExpandableCard>)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('EC-008: keyboard Enter/Space toggles expanded state', () => {
    render(<ExpandableCard title="Title">Content</ExpandableCard>)
    const btn = screen.getByRole('button')
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(btn, { key: ' ' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('EC-009: has aria-controls linking to content region', () => {
    render(<ExpandableCard title="Title" defaultExpanded>Content</ExpandableCard>)
    const btn = screen.getByRole('button')
    const controlsId = btn.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('id', controlsId)
  })

  it('EC-010: content region has reduced-motion safe animation classes', () => {
    render(<ExpandableCard title="Title" defaultExpanded>Content</ExpandableCard>)
    const region = screen.getByRole('region')
    expect(region.className).toContain('motion-safe:transition')
  })
})
