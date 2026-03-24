/**
 * File: page-toolbar.test.tsx
 * Purpose: Unit tests for PageToolbar component (search, filters, breadcrumbs)
 * Test IDs: PT-001 to PT-014
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { PageToolbar } from '../layout/PageToolbar'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PageToolbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('PT-001: renders the title', () => {
    render(<PageToolbar title="Test Title" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Title')
  })

  it('PT-002: renders the subtitle when provided', () => {
    render(<PageToolbar title="Title" subtitle="Some subtitle" />)
    expect(screen.getByText('Some subtitle')).toBeInTheDocument()
  })

  it('PT-003: does not render subtitle when not provided', () => {
    render(<PageToolbar title="Title" />)
    expect(screen.queryByText('Some subtitle')).not.toBeInTheDocument()
  })

  it('PT-004: renders breadcrumbs navigation', () => {
    const crumbs = [
      { label: 'Home', onClick: vi.fn() },
      { label: 'Settings' },
    ]
    render(<PageToolbar title="Title" breadcrumbs={crumbs} />)
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('PT-005: truncates breadcrumbs to 3 items when more than 2', () => {
    const crumbs = [
      { label: 'Root' },
      { label: 'Middle1' },
      { label: 'Middle2' },
      { label: 'Current' },
    ]
    render(<PageToolbar title="Title" breadcrumbs={crumbs} />)
    // Should show Root, ellipsis, Current
    expect(screen.getByText('Root')).toBeInTheDocument()
    expect(screen.getByText('\u2026')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
    expect(screen.queryByText('Middle1')).not.toBeInTheDocument()
  })

  it('PT-006: clicking a breadcrumb with onClick calls the handler', () => {
    const handler = vi.fn()
    const crumbs = [{ label: 'Home', onClick: handler }, { label: 'Current' }]
    render(<PageToolbar title="Title" breadcrumbs={crumbs} />)
    fireEvent.click(screen.getByText('Home'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('PT-007: does not render the search input unless search is enabled', () => {
    render(<PageToolbar title="Title" />)
    expect(screen.queryByRole('textbox', { name: /search/i })).not.toBeInTheDocument()
  })

  it('PT-008: renders custom search placeholder when search is enabled', () => {
    render(<PageToolbar title="Title" onSearch={vi.fn()} searchPlaceholder="Find users..." />)
    const input = screen.getByRole('textbox', { name: /find users/i })
    expect(input).toHaveAttribute('placeholder', 'Find users...')
  })

  it('PT-009: typing in search calls onSearch callback', () => {
    const onSearch = vi.fn()
    render(<PageToolbar title="Title" onSearch={onSearch} />)
    const input = screen.getByRole('textbox', { name: /search/i })
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onSearch).toHaveBeenCalledWith('hello')
  })

  it('PT-010: renders filter pills when filters are provided', () => {
    const filters = [
      { id: 'critical', label: 'Critical', active: true },
      { id: 'high', label: 'High', active: false },
    ]
    render(<PageToolbar title="Title" filters={filters} />)
    expect(screen.getByRole('button', { name: 'Critical' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()
  })

  it('PT-011: active filter has aria-pressed true', () => {
    const filters = [
      { id: 'critical', label: 'Critical', active: true },
      { id: 'high', label: 'High', active: false },
    ]
    render(<PageToolbar title="Title" filters={filters} />)
    expect(screen.getByRole('button', { name: 'Critical' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('PT-012: clicking a filter pill calls onFilterToggle with the id', () => {
    const onFilterToggle = vi.fn()
    const filters = [{ id: 'critical', label: 'Critical', active: false }]
    render(<PageToolbar title="Title" filters={filters} onFilterToggle={onFilterToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }))
    expect(onFilterToggle).toHaveBeenCalledWith('critical')
  })

  it('PT-013: does not render filter section when no filters', () => {
    render(<PageToolbar title="Title" />)
    expect(screen.queryByRole('group', { name: /filters/i })).not.toBeInTheDocument()
  })

  it('PT-014: Cmd+K focuses the search input', () => {
    render(<PageToolbar title="Title" onSearch={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: /search/i })
    // Simulate Cmd+K
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('PT-017: Cmd+K does not create a hidden search affordance when search is disabled', () => {
    render(<PageToolbar title="Title" />)
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(screen.queryByRole('textbox', { name: /search/i })).not.toBeInTheDocument()
  })

  it('PT-015: applies custom className', () => {
    const { container } = render(<PageToolbar title="Title" className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('PT-016: last breadcrumb has aria-current page', () => {
    const crumbs = [{ label: 'Home' }, { label: 'Current' }]
    render(<PageToolbar title="Title" breadcrumbs={crumbs} />)
    const current = screen.getByText('Current')
    expect(current).toHaveAttribute('aria-current', 'page')
  })
})
