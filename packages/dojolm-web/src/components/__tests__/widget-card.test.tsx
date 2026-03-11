/**
 * File: widget-card.test.tsx
 * Purpose: Unit tests for WidgetCard and WidgetMetaProvider
 * Test IDs: WC-001 to WC-012
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, glow, className }: { children: React.ReactNode; glow?: string; className?: string }) => (
    <div data-testid="glow-card" data-glow={glow} className={className}>{children}</div>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { WidgetCard, WidgetMetaProvider } from '../dashboard/WidgetCard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WidgetCard', () => {
  it('WC-001: renders title text', () => {
    render(<WidgetCard title="Test Widget">Content</WidgetCard>)
    expect(screen.getByText('Test Widget')).toBeInTheDocument()
  })

  it('WC-002: renders children content', () => {
    render(<WidgetCard title="Test">Hello World</WidgetCard>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('WC-003: renders actions slot when provided', () => {
    render(
      <WidgetCard title="Test" actions={<button>Action</button>}>
        Content
      </WidgetCard>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('WC-004: does not render actions wrapper when actions not provided', () => {
    const { container } = render(<WidgetCard title="Test">Content</WidgetCard>)
    // No action wrapper should exist
    const header = screen.getByTestId('card-header')
    expect(header.querySelectorAll('div').length).toBeLessThanOrEqual(1)
  })

  it('WC-005: applies custom className to GlowCard', () => {
    render(<WidgetCard title="Test" className="custom-class">Content</WidgetCard>)
    const glowCard = screen.getByTestId('glow-card')
    expect(glowCard.className).toContain('custom-class')
  })

  it('WC-006: applies contentClassName to CardContent', () => {
    render(<WidgetCard title="Test" contentClassName="content-class">Content</WidgetCard>)
    const cardContent = screen.getByTestId('card-content')
    expect(cardContent.className).toContain('content-class')
  })

  it('WC-007: uses explicit priority over context priority', () => {
    render(
      <WidgetMetaProvider priority="compact" glow="none">
        <WidgetCard title="Test" priority="hero">Content</WidgetCard>
      </WidgetMetaProvider>
    )
    const glowCard = screen.getByTestId('glow-card')
    expect(glowCard.className).toContain('widget-hero-border')
  })

  it('WC-008: uses context priority when explicit not provided', () => {
    render(
      <WidgetMetaProvider priority="hero" glow="none">
        <WidgetCard title="Test">Content</WidgetCard>
      </WidgetMetaProvider>
    )
    const glowCard = screen.getByTestId('glow-card')
    expect(glowCard.className).toContain('widget-hero-border')
  })

  it('WC-009: uses explicit glow over context glow', () => {
    render(
      <WidgetMetaProvider priority="standard" glow="none">
        <WidgetCard title="Test" glow="primary">Content</WidgetCard>
      </WidgetMetaProvider>
    )
    const glowCard = screen.getByTestId('glow-card')
    expect(glowCard.getAttribute('data-glow')).toBe('primary')
  })

  it('WC-010: renders separator line for hero and standard priority', () => {
    const { container } = render(
      <WidgetCard title="Test" priority="hero">Content</WidgetCard>
    )
    // hero priority renders a separator div (mx-4 h-px bg-[...])
    const separator = container.querySelector('.mx-4.h-px')
    expect(separator).not.toBeNull()
  })

  it('WC-011: does not render separator for compact priority', () => {
    const { container } = render(
      <WidgetCard title="Test" priority="compact">Content</WidgetCard>
    )
    const separator = container.querySelector('.mx-4.h-px')
    expect(separator).toBeNull()
  })

  it('WC-012: applies tall styles from context when tall is true', () => {
    render(
      <WidgetMetaProvider priority="standard" glow="none" tall={true}>
        <WidgetCard title="Test">Content</WidgetCard>
      </WidgetMetaProvider>
    )
    const glowCard = screen.getByTestId('glow-card')
    expect(glowCard.className).toContain('h-full')
    const cardContent = screen.getByTestId('card-content')
    expect(cardContent.className).toContain('flex-1')
  })
})
