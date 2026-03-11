/**
 * File: encoding-chain-visualizer.test.tsx
 * Purpose: Unit tests for EncodingChainVisualizer component
 * Test IDs: ECV-001 to ECV-012
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right">-&gt;</span>,
  Lock: () => <span data-testid="lock-icon">Lock</span>,
}))

import { EncodingChainVisualizer } from '../scanner/EncodingChainVisualizer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(description: string) {
  return {
    category: 'encoding',
    severity: 'WARNING' as const,
    description,
    engine: 'encoding-engine',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EncodingChainVisualizer', () => {
  it('ECV-001: renders nothing when description has no chain pattern', () => {
    const { container } = render(
      <EncodingChainVisualizer finding={makeFinding('Simple encoding detected')} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('ECV-002: renders nothing for single layer chain', () => {
    const { container } = render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (1 layer: Base64)')} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('ECV-003: renders chain for 2-layer encoding', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL), keyword: "system"')} />
    )
    expect(screen.getByText('Base64')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
  })

  it('ECV-004: renders chain for 3-layer encoding', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (3 layers: Base64 -> URL -> Hex), keyword: "system"')} />
    )
    expect(screen.getByText('Base64')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
    expect(screen.getByText('Hex')).toBeInTheDocument()
  })

  it('ECV-005: shows depth label', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (3 layers: Base64 -> URL -> Hex), keyword: "system"')} />
    )
    expect(screen.getByText('3-Layer Encoding Chain')).toBeInTheDocument()
  })

  it('ECV-006: shows decoded keyword', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL), keyword: "ignore"')} />
    )
    expect(screen.getByText(/"ignore"/)).toBeInTheDocument()
  })

  it('ECV-007: renders lock icon', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL), keyword: "test"')} />
    )
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
  })

  it('ECV-008: renders arrow separators between layers', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (3 layers: Base64 -> URL -> Hex), keyword: "test"')} />
    )
    // 2 arrows between layers + 1 arrow before keyword = 3 total
    const arrows = screen.getAllByTestId('arrow-right')
    expect(arrows.length).toBeGreaterThanOrEqual(2)
  })

  it('ECV-009: has correct aria-label on chain container', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL), keyword: "system"')} />
    )
    expect(screen.getByRole('img', { name: /Encoding chain: Base64 to URL/ })).toBeInTheDocument()
  })

  it('ECV-010: aria-label includes decoded keyword', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> Hex), keyword: "admin"')} />
    )
    expect(screen.getByRole('img', { name: /decoded keyword: admin/ })).toBeInTheDocument()
  })

  it('ECV-011: renders without keyword when not in description', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL)')} />
    )
    expect(screen.getByText('Base64')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
  })

  it('ECV-012: shows 2-Layer label for depth 2', () => {
    render(
      <EncodingChainVisualizer finding={makeFinding('Multi-layer encoded payload (2 layers: Base64 -> URL), keyword: "x"')} />
    )
    expect(screen.getByText('2-Layer Encoding Chain')).toBeInTheDocument()
  })
})
