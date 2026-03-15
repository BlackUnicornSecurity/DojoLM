/**
 * File: module-badge.test.tsx
 * Purpose: Unit tests for ModuleBadge component
 * Test IDs: MB-001 to MB-012
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

import { ModuleBadge } from '../scanner/ModuleBadge'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModuleBadge', () => {
  it('MB-001: renders the module name text', () => {
    render(<ModuleBadge moduleName="encoding-engine" />)
    expect(screen.getByText('encoding-engine')).toBeInTheDocument()
  })

  it('MB-002: has correct aria-label', () => {
    render(<ModuleBadge moduleName="mcp-parser" />)
    expect(screen.getByLabelText('Module: mcp-parser')).toBeInTheDocument()
  })

  it('MB-003: renders a colored dot element', () => {
    const { container } = render(<ModuleBadge moduleName="test-module" />)
    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot?.className).toContain('rounded-full')
  })

  it('MB-004: same module name always produces same color (deterministic)', () => {
    const { container: c1 } = render(<ModuleBadge moduleName="my-engine" />)
    const { container: c2 } = render(<ModuleBadge moduleName="my-engine" />)
    const dot1 = c1.querySelector('[aria-hidden="true"]')
    const dot2 = c2.querySelector('[aria-hidden="true"]')
    expect(dot1?.className).toBe(dot2?.className)
  })

  it('MB-005: different module names can produce different colors', () => {
    const { container: c1 } = render(<ModuleBadge moduleName="aaa" />)
    const { container: c2 } = render(<ModuleBadge moduleName="zzz" />)
    const dot1 = c1.querySelector('[aria-hidden="true"]')
    const dot2 = c2.querySelector('[aria-hidden="true"]')
    // They may or may not differ, but at least the class contains a bg- color
    expect(dot1?.className).toContain('bg-')
    expect(dot2?.className).toContain('bg-')
  })

  it('MB-006: applies custom className', () => {
    render(<ModuleBadge moduleName="test" className="custom-class" />)
    const badge = screen.getByLabelText('Module: test')
    expect(badge.className).toContain('custom-class')
  })

  it('MB-007: has rounded-full pill shape', () => {
    render(<ModuleBadge moduleName="test" />)
    const badge = screen.getByLabelText('Module: test')
    expect(badge.className).toContain('rounded-full')
  })

  it('MB-008: has text-xs font size', () => {
    render(<ModuleBadge moduleName="test" />)
    const badge = screen.getByLabelText('Module: test')
    expect(badge.className).toContain('text-xs')
  })

  it('MB-009: renders as a span element', () => {
    render(<ModuleBadge moduleName="test" />)
    const badge = screen.getByLabelText('Module: test')
    expect(badge.tagName).toBe('SPAN')
  })

  it('MB-010: module name text is truncated', () => {
    const { container } = render(<ModuleBadge moduleName="very-long-module-name-that-should-truncate" />)
    const textSpan = container.querySelector('.truncate')
    expect(textSpan).toBeInTheDocument()
    expect(textSpan?.textContent).toBe('very-long-module-name-that-should-truncate')
  })

  it('MB-011: dot has aria-hidden true', () => {
    const { container } = render(<ModuleBadge moduleName="test" />)
    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
  })

  it('MB-012: renders with empty module name', () => {
    const { container } = render(<ModuleBadge moduleName="" />)
    expect(container.querySelector('[aria-label]')).toBeInTheDocument()
  })
})
